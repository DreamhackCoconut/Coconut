import { describe, expect, it } from 'vitest';
import { getDemoBatchSnapshot, getDemoDepartures, DEMO_PRODUCTS, DEMO_SELLERS, getDemoMarketSignals } from '@/lib/data/seed';
import { quoteCart } from '@/lib/engines/batching';
import { calculateMarketOpportunities } from '@/lib/engines/market-opportunity';
import { packCart } from '@/lib/engines/packing';
import { buildRecommendations } from '@/lib/engines/recommendation';
import { optimizePickupRoute } from '@/lib/engines/routing';
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
});
