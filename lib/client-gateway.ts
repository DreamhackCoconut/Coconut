import { Client, Functions } from 'appwrite';
import { getDemoBatchSnapshot, getDemoDepartures, getDemoHistoricalEventCount, getDemoMarketSignals } from '@/lib/data/seed';
import type { BatchSnapshot, CartLine, Departure, Destination, MarketOpportunity, Product, ProductionJob, Quote, Recommendation, Seller } from '@/lib/domain/types';
import { quoteCart } from '@/lib/engines/batching';
import { calculateMarketOpportunities } from '@/lib/engines/market-opportunity';
import { buildProductionPlan } from '@/lib/engines/production';
import { buildRecommendations } from '@/lib/engines/recommendation';
import { DemoMarketplaceRepository } from '@/lib/repositories/demo';
import { getStoredSellerListings } from '@/lib/account';

export type MarketplaceData = {
  products: Product[];
  sellers: Seller[];
  departures: Departure[];
  batch: BatchSnapshot;
};

type GatewayResponse<T> = { data?: T; error?: string };

const localRepository = new DemoMarketplaceRepository();

function remoteFunctionUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_APPWRITE_API_FUNCTION_URL;
  const trimmed = value?.trim();
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

function remoteFunctions(): Functions | undefined {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_API_FUNCTION_ID;
  if (!endpoint || !projectId || !functionId || endpoint.includes('<') || projectId.includes('<') || functionId.includes('<')) return undefined;
  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  return new Functions(client);
}

function hasRemoteGateway(): boolean {
  return Boolean(remoteFunctionUrl() || remoteFunctions());
}

export function getClientBackendMode(): 'appwrite-configured' | 'demo-fallback' {
  return hasRemoteGateway() ? 'appwrite-configured' : 'demo-fallback';
}

async function invokeRemote<T>(route: string, method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const requestBody = JSON.stringify({ __route: route, __method: method, payload });
  const url = remoteFunctionUrl();
  if (url) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody });
    if (!response.ok) throw new Error(`Coconut API returned ${response.status}`);
    const body = await response.json() as GatewayResponse<T> | T;
    return (body as GatewayResponse<T>).data ?? body as T;
  }
  const functions = remoteFunctions();
  if (!functions) throw new Error('Appwrite API function is not configured');
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_API_FUNCTION_ID as string;
  const execution = await functions.createExecution({ functionId, body: requestBody, async: false });
  const responseBody = (execution as { responseBody?: string }).responseBody;
  if (!responseBody) throw new Error('Appwrite API function did not return a response');
  const body = JSON.parse(responseBody) as GatewayResponse<T> | T;
  return (body as GatewayResponse<T>).data ?? body as T;
}

async function withDemoFallback<T>(remote: () => Promise<T>, demo: () => Promise<T>): Promise<T> {
  if (!hasRemoteGateway()) return demo();
  try {
    return await remote();
  } catch {
    return demo();
  }
}

function mergeSavedListings(data: MarketplaceData): MarketplaceData {
  const saved = getStoredSellerListings();
  if (!saved.length) return data;
  const sellers = [...data.sellers];
  const products = [...data.products];
  for (const listing of saved) {
    if (!sellers.some((seller) => seller.id === listing.seller.id)) sellers.push(listing.seller);
    if (!products.some((product) => product.id === listing.product.id)) products.push(listing.product);
  }
  return { ...data, sellers, products };
}

async function localMarketplaceProducts() {
  const products = await localRepository.listProducts();
  const saved = getStoredSellerListings().map((listing) => listing.product);
  return [...products, ...saved.filter((product) => !products.some((candidate) => candidate.id === product.id))];
}

async function localMarketplaceSellers() {
  const sellers = await localRepository.listSellers();
  const saved = getStoredSellerListings().map((listing) => listing.seller);
  return [...sellers, ...saved.filter((seller) => !sellers.some((candidate) => candidate.id === seller.id))];
}

export async function getMarketplaceData(): Promise<MarketplaceData> {
  const data = await withDemoFallback(
    () => invokeRemote<MarketplaceData>('/marketplace', 'GET'),
    async () => ({ products: await localRepository.listProducts(), sellers: await localRepository.listSellers(), departures: getDemoDepartures(), batch: getDemoBatchSnapshot() }),
  );
  return mergeSavedListings(data);
}

export async function getCartQuote(lines: CartLine[], destination: Destination): Promise<Quote> {
  return withDemoFallback(
    () => invokeRemote<Quote>('/cart/quote', 'POST', { lines, destination }),
    async () => quoteCart(lines, destination, await localMarketplaceProducts(), getDemoBatchSnapshot(), getDemoDepartures()),
  );
}

export async function getCartRecommendations(lines: CartLine[], destination: Destination): Promise<Recommendation[]> {
  return withDemoFallback(
    () => invokeRemote<Recommendation[]>('/recommendations/cart', 'POST', { lines, destination }),
    async () => {
      const [products, sellers] = await Promise.all([localMarketplaceProducts(), localMarketplaceSellers()]);
      return buildRecommendations({ lines, destination, products, sellers, batch: getDemoBatchSnapshot() });
    },
  );
}

export async function recordMarketplaceEvent(event: { sessionId: string; eventType: string; productId?: string; sellerId?: string; metadata?: Record<string, unknown> }): Promise<void> {
  if (!hasRemoteGateway()) return;
  try {
    await invokeRemote('/events', 'POST', event);
  } catch {
    // Analytics is intentionally best effort in demo mode.
  }
}

export async function createDemoOrder(input: DemoOrderInput): Promise<{ orderId: string; batchId: string }> {
  return withDemoFallback(
    () => invokeRemote<{ orderId: string; batchId: string }>('/orders', 'POST', input),
    async () => localRepository.createDemoOrder(input),
  );
}

export async function getOperations(): Promise<Record<string, unknown>> {
  return withDemoFallback(
    () => invokeRemote<Record<string, unknown>>('/operations/batches/batch-friday-west-coast', 'GET'),
    async () => {
      const { getOperationsDemoData } = await import('@/lib/operations');
      return getOperationsDemoData();
    },
  );
}

export async function optimizeOperations(): Promise<Record<string, unknown>> {
  return withDemoFallback(
    () => invokeRemote<Record<string, unknown>>('/operations/batches/batch-friday-west-coast/optimize-route', 'POST'),
    async () => {
      const { optimizeOperationsBatch } = await import('@/lib/operations');
      return optimizeOperationsBatch();
    },
  );
}

export async function resetDemo(): Promise<void> {
  if (!hasRemoteGateway()) return;
  try {
    await invokeRemote('/demo/reset', 'POST');
  } catch {
    // Local fallback is already deterministic and stateless.
  }
}

export type SellerDashboard = {
  seller: Seller;
  products: Product[];
  productionPlan: ProductionJob[];
  markets: MarketOpportunity[];
  summary: { activeProducts: number; impressions: number; eventCount: number; rating: number };
};

export async function getSellerDashboard(sellerId: string): Promise<SellerDashboard | undefined> {
  return withDemoFallback(
    () => invokeRemote<SellerDashboard>(`/sellers/${sellerId}/dashboard`, 'GET'),
    async () => {
      const [products, sellers] = await Promise.all([localMarketplaceProducts(), localMarketplaceSellers()]);
      const seller = sellers.find((candidate) => candidate.id === sellerId) ?? sellers[0];
      if (!seller) return undefined;
      const sellerProducts = products.filter((product) => product.sellerId === seller.id);
      return {
        seller,
        products: sellerProducts,
        productionPlan: buildProductionPlan(seller, products),
        markets: sellerProducts[0] ? calculateMarketOpportunities(sellerProducts[0], seller, getDemoMarketSignals()) : [],
        summary: { activeProducts: sellerProducts.length, impressions: seller.recentImpressions, eventCount: getDemoHistoricalEventCount(), rating: seller.rating },
      };
    },
  );
}

export type DemoOrderInput = {
  lines: CartLine[];
  subtotalUsd: number;
  pooledShippingUsd: number;
  destinationCountry: string;
};
