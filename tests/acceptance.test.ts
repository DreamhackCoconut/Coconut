import { describe, expect, it } from 'vitest';
import { getDemoBatchSnapshot, getDemoDepartures, DEMO_PRODUCTS, DEMO_SELLERS, getDemoMarketSignals } from '@/lib/data/seed';
import { getEligibleDepartures, quoteCart } from '@/lib/engines/batching';
import { calculateMarketOpportunities } from '@/lib/engines/market-opportunity';
import { packCart } from '@/lib/engines/packing';
import { buildRecommendations } from '@/lib/engines/recommendation';
import { naivePickupRoute, optimizePickupRoute } from '@/lib/engines/routing';
import { estimatePooledShipping } from '@/lib/engines/shipping';
import { calculateWeatherRisk } from '@/lib/engines/weather-risk';
import { buildRoutingMatrixCacheKey } from '@/lib/providers/openrouteservice';
import { DEMO_HUB, DEMO_PICKUP_STOPS, DEMO_PICKUP_VEHICLES } from '@/lib/operations';

const destination = { countryCode: 'US' as const, region: 'West Coast', postalCode: '94107' };

describe('Coconut hackathon acceptance path', () => {
  it('keeps the basket proof point at $32 and lowers pooled shipping', () => {
    const basket = DEMO_PRODUCTS.find((product) => product.slug === 'handwoven-coastal-basket');
    expect(basket?.priceUsd).toBe(32);
    const quote = quoteCart([{ productId: basket?.id ?? 'product-001', quantity: 1 }], destination, DEMO_PRODUCTS, getDemoBatchSnapshot(), getDemoDepartures());
    expect(quote.subtotalUsd).toBe(32);
    expect(quote.shipping.estimatedSoloUsd).toBeGreaterThan(quote.shipping.pooledUsd);
    expect(quote.shipping.savingsUsd).toBeGreaterThan(0);
  });

  it('lets lightweight shell earrings share the basket without a shipping delta', () => {
    const basket = DEMO_PRODUCTS.find((product) => product.slug === 'handwoven-coastal-basket');
    const earrings = DEMO_PRODUCTS.find((product) => product.slug === 'shell-earrings');
    const recommendations = buildRecommendations({ lines: [{ productId: basket?.id ?? 'product-001', quantity: 1 }], destination, products: DEMO_PRODUCTS, sellers: DEMO_SELLERS, batch: getDemoBatchSnapshot() });
    const shell = recommendations.find((recommendation) => recommendation.product.id === earrings?.id);
    expect(shell).toBeDefined();
    expect(shell?.shippingDeltaUsd).toBe(0);
    expect(shell?.reasons.join(' ')).toContain('shipping');
  });

  it('splits a large ceramic into a larger carton instead of hiding the constraint', () => {
    const basket = DEMO_PRODUCTS.find((product) => product.slug === 'handwoven-coastal-basket');
    const ceramic = DEMO_PRODUCTS.find((product) => product.slug === 'blue-lagoon-ceramic-vase');
    const packing = packCart([{ productId: basket?.id ?? 'product-001', quantity: 1 }, { productId: ceramic?.id ?? 'product-005', quantity: 1 }], DEMO_PRODUCTS);
    expect(packing.boxes.length).toBe(2);
    expect(packing.boxes.some((box) => box.cartonCode === 'L')).toBe(true);
  });

  it('returns a complete capacity-safe TypeScript route for the operations fallback', () => {
    const result = optimizePickupRoute(DEMO_HUB, DEMO_PICKUP_STOPS, DEMO_PICKUP_VEHICLES);
    expect(result.optimizerMode).toBe('typescript-fallback');
    expect(new Set(result.routes.flatMap((route) => route.sellerIds)).size).toBe(DEMO_PICKUP_STOPS.length);
    expect(result.routes.every((route) => route.loadWeightKg <= 32 && route.loadVolumeM3 <= 0.55)).toBe(true);
  });

  it('scores market opportunities with explainable components', () => {
    const product = DEMO_PRODUCTS[0];
    const opportunities = calculateMarketOpportunities(product, DEMO_SELLERS[0], getDemoMarketSignals());
    expect(opportunities[0].score).toBeGreaterThan(70);
    expect(opportunities[0].reasons.length).toBeGreaterThan(1);
    expect(opportunities[0].components.shippingCompetitiveness).toBeGreaterThan(0);
  });

  it('allocates fixed freight against the actual batch load', () => {
    const basket = DEMO_PRODUCTS.find((product) => product.slug === 'handwoven-coastal-basket');
    const packing = packCart([{ productId: basket?.id ?? 'product-001', quantity: 1 }], DEMO_PRODUCTS);
    const departure = getDemoDepartures(new Date('2026-08-30T12:00:00.000Z'))[1];
    const lightBatch = { ...getDemoBatchSnapshot(), currentWeightKg: 1, currentVolumeM3: 0.01, estimatedLocalPickupCostUsd: 0 };
    const fullBatch = { ...lightBatch, currentWeightKg: 30, currentVolumeM3: 0.2 };
    const lightQuote = estimatePooledShipping({ packing, departure, batch: lightBatch, destination });
    const fullQuote = estimatePooledShipping({ packing, departure, batch: fullBatch, destination });
    expect(fullQuote.breakdown.islandFreightShareUsd).toBeLessThan(lightQuote.breakdown.islandFreightShareUsd);
  });

  it('does not fall back to a closed or incompatible departure', () => {
    const now = new Date('2026-08-30T12:00:00.000Z');
    const departures = getDemoDepartures(now).map((departure) => ({ ...departure, status: 'closed' as const }));
    const lines = [{ productId: DEMO_PRODUCTS[0].id, quantity: 1 }];
    expect(getEligibleDepartures(lines, DEMO_PRODUCTS, destination, getDemoBatchSnapshot(now), departures, now)).toHaveLength(0);
    expect(() => quoteCart(lines, destination, DEMO_PRODUCTS, getDemoBatchSnapshot(now), departures, now)).toThrow('No eligible departure');
  });

  it('rejects malformed or physically impossible packing input', () => {
    expect(() => packCart([{ productId: 'missing-product', quantity: 1 }], DEMO_PRODUCTS)).toThrow('was not found');
    expect(() => packCart([{ productId: DEMO_PRODUCTS[0].id, quantity: 0 }], DEMO_PRODUCTS)).toThrow('positive integer');
    const oversized = { ...DEMO_PRODUCTS[0], id: 'oversized', lengthCm: 1000 };
    expect(() => packCart([{ productId: oversized.id, quantity: 1 }], [oversized])).toThrow('does not fit');
  });

  it('fails loudly when the TypeScript route cannot visit every stop', () => {
    const stop = { ...DEMO_PICKUP_STOPS[0], weightKg: 40 };
    expect(() => naivePickupRoute(DEMO_HUB, [stop], DEMO_PICKUP_VEHICLES)).toThrow('exceed');
  });

  it('sanitizes malformed weather data and preserves matrix order in cache keys', () => {
    const risk = calculateWeatherRisk([{ waveHeightM: Number.NaN, wavePeriodS: Number.POSITIVE_INFINITY, swellHeightM: -1, swellPeriodS: 0, windKph: Number.NaN, gustKph: -4, precipitationMm: 2 }]);
    expect(Number.isFinite(risk.risk)).toBe(true);
    expect(risk.observations[0].waveHeightM).toBe(0);
    const first = [{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }];
    const second = [...first].reverse();
    expect(buildRoutingMatrixCacheKey(first, 'driving-car')).not.toBe(buildRoutingMatrixCacheKey(second, 'driving-car'));
  });
});
