import { LOGISTICS, clamp, roundMoney } from '@/lib/config/logistics';
import { getDemoBatchSnapshot, getDemoDepartures, getSellerById } from '@/lib/data/seed';
import type { BatchSnapshot, CartLine, Destination, Product, Recommendation, RecommendationComponents, Seller } from '@/lib/domain/types';
import { quoteCart } from '@/lib/engines/batching';

const RELATED_CATEGORIES: Record<string, string[]> = {
  Jewelry: ['Textiles', 'Prints'],
  Basketry: ['Woodwork', 'Textiles', 'Jewelry'],
  Woodwork: ['Basketry', 'Ceramics'],
  Textiles: ['Jewelry', 'Prints', 'Basketry'],
  Ceramics: ['Woodwork', 'Basketry'],
  Prints: ['Textiles', 'Jewelry'],
};

function jaccard(left: string[] = [], right: string[] = []): number {
  const a = new Set(left.map((value) => value.toLowerCase()));
  const b = new Set(right.map((value) => value.toLowerCase()));
  const union = new Set([...a, ...b]).size;
  if (!union) return 0;
  return [...a].filter((value) => b.has(value)).length / union;
}

function productSimilarity(candidate: Product, cartProducts: Product[]): number {
  if (!cartProducts.length) return 0;
  const values = cartProducts.map((item) => {
    const category = candidate.category === item.category ? 1 : RELATED_CATEGORIES[item.category]?.includes(candidate.category) ? 0.5 : 0;
    return 0.4 * category + 0.3 * jaccard(candidate.tags, item.tags) + 0.2 * jaccard(candidate.materials, item.materials) + 0.1 * jaccard(candidate.colors, item.colors);
  });
  return clamp(0.7 * Math.max(...values) + 0.3 * values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sellerFairness(candidate: Seller, sellers: Seller[]): number {
  if (!sellers.length) return 0;
  const raw = 1 / Math.sqrt(candidate.recentImpressions + 1);
  const all = sellers.map((seller) => 1 / Math.sqrt(seller.recentImpressions + 1));
  return clamp(raw / Math.max(...all, 0.001));
}

function readiness(candidate: Product, _batch: BatchSnapshot, departureCutoff: string, now: Date): number {
  if (candidate.inventory > 0) return 1;
  const availableHours = Math.max(0, (new Date(departureCutoff).getTime() - now.getTime()) / 3_600_000);
  if (!availableHours) return 0;
  if (candidate.productionHours <= availableHours * 0.6) return 1;
  if (candidate.productionHours >= availableHours) return 0;
  return clamp((availableHours - candidate.productionHours) / (availableHours * 0.4));
}

function explain(candidate: Product, components: RecommendationComponents, shippingDeltaUsd: number, departure: string, cartProducts: Product[]): string[] {
  const reasons: string[] = [];
  if (shippingDeltaUsd <= LOGISTICS.negligibleShippingDeltaUsd) reasons.push('Adds no estimated shipping cost');
  if (components.shippingEfficiency >= 0.82 && shippingDeltaUsd > 0) reasons.push('Fits inside your current parcel');
  if (components.productionReadiness >= 0.9) reasons.push(`Ready for ${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(departure))}'s departure`);
  if (components.productRelevance >= 0.36) reasons.push(`Matches ${cartProducts[0]?.materials[0] ?? 'coastal'} materials already in your cart`);
  if (components.batchBenefit >= 0.62) reasons.push('Helps fill your current shared shipment');
  reasons.push('Made by another local artisan');
  return reasons.slice(0, 4);
}

export function buildRecommendations(input: {
  lines: CartLine[];
  destination: Destination;
  products: Product[];
  sellers: Seller[];
  batch?: BatchSnapshot;
  now?: Date;
}): Recommendation[] {
  const batch = input.batch ?? getDemoBatchSnapshot();
  const now = input.now ?? new Date();
  const departures = getDemoDepartures(now);
  const currentQuote = quoteCart(input.lines, input.destination, input.products, batch, departures, now);
  const cartIds = new Set(input.lines.map((line) => line.productId));
  const cartProducts = input.lines.map((line) => input.products.find((product) => product.id === line.productId)).filter((product): product is Product => Boolean(product));
  const currentPacking = currentQuote.packing;
  const candidates = input.products.filter((product) => product.active && product.inventory > 0 && !cartIds.has(product.id));

  return candidates.map((candidate) => {
    const candidateLines = [...input.lines, { productId: candidate.id, quantity: 1 }];
    let candidateQuote;
    try {
      candidateQuote = quoteCart(candidateLines, input.destination, input.products, batch, departures, now);
    } catch {
      return undefined;
    }
    const rawDelta = candidateQuote.shipping.pooledUsd - currentQuote.shipping.pooledUsd;
    const shippingDeltaUsd = Math.abs(rawDelta) <= LOGISTICS.negligibleShippingDeltaUsd ? 0 : roundMoney(Math.max(0, rawDelta));
    const productRelevance = productSimilarity(candidate, cartProducts);
    const shippingEfficiency = clamp(1 - shippingDeltaUsd / LOGISTICS.shippingDeltaCapUsd);
    const volumeBefore = Math.max(0.001, currentPacking.totalVolumeM3);
    const volumeAfter = candidateQuote.packing.totalVolumeM3;
    const utilizationImprovement = clamp((volumeAfter - volumeBefore) / Math.max(0.01, 0.12 - volumeBefore));
    const sameDepartureCompatibility = candidateQuote.recommendedBatch.departureId === currentQuote.recommendedBatch.departureId ? 1 : 0;
    const batchBenefit = clamp(0.7 * sameDepartureCompatibility + 0.3 * utilizationImprovement);
    const margin = candidate.priceUsd > 0 ? (candidate.priceUsd - candidate.unitCostUsd) / candidate.priceUsd : 0;
    const marginQuality = clamp(margin / 0.5);
    const productionReadiness = readiness(candidate, batch, currentQuote.recommendedBatch.cutoffAt, now);
    const seller = input.sellers.find((item) => item.id === candidate.sellerId) ?? getSellerById(candidate.sellerId);
    if (!seller) return undefined;
    const fairness = sellerFairness(seller, input.sellers);
    const components = { productRelevance, shippingEfficiency, batchBenefit, marginQuality, productionReadiness, sellerFairness: fairness };
    const score = 0.3 * productRelevance + 0.25 * shippingEfficiency + 0.15 * batchBenefit + 0.1 * marginQuality + 0.1 * productionReadiness + 0.1 * fairness;
    return {
      product: { ...candidate, seller },
      score: Number(clamp(score).toFixed(4)),
      shippingDeltaUsd,
      components,
      reasons: explain(candidate, components, shippingDeltaUsd, currentQuote.recommendedBatch.departureAt, cartProducts),
    };
  }).filter((recommendation): recommendation is Recommendation => Boolean(recommendation)).sort((a, b) => b.score - a.score).slice(0, 6);
}
