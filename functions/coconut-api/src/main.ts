import { AppwriteCacheStore, getPersistentProviderResult } from '@/lib/server/appwrite-cache';
import { getDemoDepartures, getDemoHistoricalEventCount, getDemoMarketSignals } from '@/lib/data/seed';
import type { CartLine, Destination } from '@/lib/domain/types';
import { quoteCart } from '@/lib/engines/batching';
import { calculateMarketOpportunities, getPriceGuidance } from '@/lib/engines/market-opportunity';
import { buildProductionPlan } from '@/lib/engines/production';
import { buildRecommendations } from '@/lib/engines/recommendation';
import { calculateSavings, estimateFinalMile } from '@/lib/engines/shipping';
import { calculateWeatherRisk, demoMarineObservations, DEMO_VESSEL_PROFILE } from '@/lib/engines/weather-risk';
import { getFinalMileRate } from '@/lib/providers/easypost';
import { getMarineForecast } from '@/lib/providers/open-meteo';
import { getMarketplaceRepository } from '@/lib/repositories';
import { createAppwriteServerClient } from '@/lib/repositories/appwrite';
import { eventRequestSchema, cartRequestSchema } from '@/lib/server/validation';
import { ZodError } from 'zod';
import { logServerEvent } from '@/lib/server/logger';
import { optimizeOperationsBatch, getOperationsDemoData } from '@/lib/operations';
import { invokeOrToolsOptimizer } from '@/functions/coconut-api/src/optimizer-client';

type AppwriteRequest = {
  method: string;
  path: string;
  body?: string;
  bodyJson?: unknown;
  query?: Record<string, string>;
};

type AppwriteResponse = {
  json: (body: unknown, statusCode?: number, headers?: Record<string, string>) => unknown;
};

type FunctionContext = { req: AppwriteRequest; res: AppwriteResponse; log: (message: string) => void; error: (message: string) => void };

type GatewayEnvelope = { __route?: string; __method?: string; payload?: Record<string, unknown> };

class ApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function parseBody(req: AppwriteRequest): Record<string, unknown> {
  if (req.bodyJson && typeof req.bodyJson === 'object' && !Array.isArray(req.bodyJson)) return req.bodyJson as Record<string, unknown>;
  if (!req.body) return {};
  try {
    const parsed = JSON.parse(req.body) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ApiError(400, 'Request body must be a JSON object.');
    return parsed as Record<string, unknown>;
  } catch (caught) {
    if (caught instanceof ApiError) throw caught;
    throw new ApiError(400, 'Request body must contain valid JSON.');
  }
}

function requestInfo(req: AppwriteRequest): { route: string; method: string; payload: Record<string, unknown> } {
  const body = parseBody(req) as GatewayEnvelope;
  if (body.__route) return { route: body.__route.replace(/\/+$/, '') || '/', method: body.__method ?? req.method, payload: body.payload ?? {} };
  return { route: req.path.replace(/\/+$/, '') || '/', method: req.method, payload: body };
}

let cacheStore: AppwriteCacheStore | undefined;
let cacheStoreDatabaseId: string | undefined;

function persistentCache(): AppwriteCacheStore | undefined {
  const appwrite = createAppwriteServerClient();
  if (!appwrite) {
    cacheStore = undefined;
    cacheStoreDatabaseId = undefined;
    return undefined;
  }
  if (!cacheStore || cacheStoreDatabaseId !== appwrite.databaseId) {
    cacheStore = new AppwriteCacheStore(appwrite.tablesDB, appwrite.databaseId);
    cacheStoreDatabaseId = appwrite.databaseId;
  }
  return cacheStore;
}

async function quoteWithProviders(lines: CartLine[], destination: Destination) {
  const repository = getMarketplaceRepository();
  const [products, batch, departures] = await Promise.all([repository.listProducts(), repository.getBatchSnapshot(), repository.getDepartures()]);
  assertCartCatalog(lines, products);
  const quote = quoteCart(lines, destination, products, batch, departures);
  const cachedFinalMile = await getPersistentProviderResult({
    store: persistentCache(),
    tableId: 'shipping_rate_cache',
    key: `easypost-rate:${destination.countryCode}:${destination.postalCode}:${quote.packing.boxes.map((box) => `${box.cartonCode}-${box.shippingWeightKg}`).join('|')}`,
    provider: 'EasyPost',
    ttlMs: 20 * 60 * 1000,
    staleTtlMs: 24 * 60 * 60 * 1000,
    fetcher: () => getFinalMileRate(quote.packing, destination),
    fallback: () => ({ data: estimateFinalMile(quote.packing, destination), metadata: { provider: 'EasyPost', mode: 'demo' as const, fetchedAt: new Date().toISOString() } }),
  });
  const finalMileDelta = cachedFinalMile.data.rateUsd - quote.finalMile.rateUsd;
  const pooledUsd = Math.max(0, quote.shipping.pooledUsd + finalMileDelta);
  const savings = calculateSavings(quote.shipping.estimatedSoloUsd + finalMileDelta, pooledUsd);
  return {
    ...quote,
    finalMile: cachedFinalMile.data,
    shipping: { ...quote.shipping, pooledUsd: Number(pooledUsd.toFixed(2)), savingsUsd: savings.savingsUsd, savingsPercent: savings.savingsPercent },
    breakdown: { ...quote.breakdown, finalMileUsd: cachedFinalMile.data.rateUsd },
    providerModes: { ...quote.providerModes, carrier: cachedFinalMile.metadata.mode },
  };
}

function assertCartCatalog(lines: CartLine[], products: Array<{ id: string; name: string; active: boolean; inventory: number }>): void {
  const productById = new Map(products.map((product) => [product.id, product]));
  for (const line of lines) {
    const product = productById.get(line.productId);
    if (!product || !product.active) throw new ApiError(422, `Product ${line.productId} is not available.`);
    if (line.quantity > product.inventory) throw new ApiError(422, `${product.name} does not have enough inventory.`);
  }
}

function parseCartPayload(payload: Record<string, unknown>) {
  return cartRequestSchema.parse({ items: payload.lines ?? payload.items, destination: payload.destination });
}

async function marketplace() {
  const repository = getMarketplaceRepository();
  const [products, sellers, departures, batch] = await Promise.all([repository.listProducts(), repository.listSellers(), repository.getDepartures(), repository.getBatchSnapshot()]);
  return { products, sellers, departures, batch };
}

async function sellerPayload(sellerId: string) {
  const repository = getMarketplaceRepository();
  const [seller, products] = await Promise.all([repository.getSeller(sellerId), repository.listProducts()]);
  if (!seller) return undefined;
  const sellerProducts = products.filter((product) => product.sellerId === seller.id);
  const plan = buildProductionPlan(seller, products);
  const opportunities = sellerProducts[0] ? calculateMarketOpportunities(sellerProducts[0], seller, getDemoMarketSignals()) : [];
  return {
    seller,
    products: sellerProducts,
    productionPlan: plan,
    markets: opportunities,
    summary: { activeProducts: sellerProducts.length, impressions: seller.recentImpressions, eventCount: getDemoHistoricalEventCount(), rating: seller.rating },
  };
}

async function dispatch(info: { route: string; method: string; payload: Record<string, unknown> }) {
  const { route, method, payload } = info;
  if (route === '/marketplace' && method === 'GET') return marketplace();
  if (route === '/products' && method === 'GET') return (await marketplace()).products;
  if (route === '/sellers' && method === 'GET') return (await marketplace()).sellers;
  if (route === '/cart/quote' && method === 'POST') {
    const parsed = parseCartPayload(payload);
    return quoteWithProviders(parsed.items, parsed.destination);
  }
  if (route === '/recommendations/cart' && method === 'POST') {
    const parsed = parseCartPayload(payload);
    const data = await marketplace();
    assertCartCatalog(parsed.items, data.products);
    return buildRecommendations({ lines: parsed.items, destination: parsed.destination, products: data.products, sellers: data.sellers, batch: data.batch });
  }
  if (route === '/events' && method === 'POST') {
    const event = eventRequestSchema.parse(payload);
    await getMarketplaceRepository().recordEvent(event);
    return { accepted: true };
  }
  if (route === '/orders' && method === 'POST') {
    const parsed = parseCartPayload(payload);
    const quote = await quoteWithProviders(parsed.items, parsed.destination);
    return getMarketplaceRepository().createDemoOrder({ lines: parsed.items, subtotalUsd: quote.subtotalUsd, pooledShippingUsd: quote.shipping.pooledUsd, destinationCountry: parsed.destination.countryCode, batchId: quote.recommendedBatch.id });
  }
  if (route === '/operations/batches' && method === 'GET') return [getOperationsDemoData()];
  if (route === '/operations/batches/batch-friday-west-coast' && method === 'GET') return getOperationsDemoData();
  if (route === '/operations/batches/batch-friday-west-coast/optimize-route' && method === 'POST') return optimizeOperationsBatch(invokeOrToolsOptimizer);
  if (route === '/operations/batches/batch-friday-west-coast/weather' && method === 'GET') {
    const departure = getDemoDepartures()[1];
    const marine = await getPersistentProviderResult({
      store: persistentCache(),
      tableId: 'external_cache',
      key: `open-meteo-marine:${departure.id}`,
      provider: 'Open-Meteo Marine',
      ttlMs: 60 * 60 * 1000,
      staleTtlMs: 12 * 60 * 60 * 1000,
      fetcher: () => getMarineForecast(departure.routePoints, departure.weatherRisk),
      fallback: () => ({ data: demoMarineObservations(departure.routePoints, departure.weatherRisk), metadata: { provider: 'Open-Meteo Marine', mode: 'demo' as const, fetchedAt: new Date().toISOString() } }),
    });
    return { weather: calculateWeatherRisk(marine.data, DEMO_VESSEL_PROFILE), provider: marine.metadata };
  }
  const sellerMatch = route.match(/^\/sellers\/([^/]+)(?:\/(dashboard|products|orders|production-plan|markets))?$/);
  if (sellerMatch && method === 'GET') {
    const sellerId = sellerMatch[1];
    const data = await sellerPayload(sellerId);
    if (!data) return undefined;
    const subroute = sellerMatch[2];
    if (!subroute || subroute === 'dashboard') return data;
    if (subroute === 'products') return data.products;
    if (subroute === 'production-plan') return data.productionPlan;
    if (subroute === 'markets') return data.markets;
    return { orders: [], historicalEventCount: data.summary.eventCount };
  }
  if (route === '/demo/reset' && method === 'POST') {
    if (process.env.DEMO_MODE === 'false') throw new ApiError(403, 'Demo reset is disabled outside demo mode.');
    if (process.env.DEMO_RESET_TOKEN && payload.resetToken !== process.env.DEMO_RESET_TOKEN) throw new ApiError(403, 'A valid demo reset token is required.');
    await getMarketplaceRepository().resetDemoState();
    return { reset: true, mode: 'demo' };
  }
  return undefined;
}

export default async function main({ req, res, log, error }: FunctionContext) {
  try {
    const info = requestInfo(req);
    logServerEvent('coconut_api_request', { route: info.route, method: info.method });
    log(`Coconut API ${info.method} ${info.route}`);
    const data = await dispatch(info);
    if (data === undefined) return res.json({ error: 'Not found' }, 404);
    return res.json({ data, providerModes: { backend: 'appwrite' } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unexpected request error';
    error(message);
    const statusCode = caught instanceof ApiError ? caught.statusCode : caught instanceof ZodError ? 422 : 500;
    const safeMessage = caught instanceof ZodError ? 'Request validation failed.' : statusCode >= 500 ? 'The Coconut API could not complete the request.' : message;
    return res.json({ error: { code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST', message: safeMessage } }, statusCode);
  }
}
