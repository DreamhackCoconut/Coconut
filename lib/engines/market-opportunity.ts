import { DESTINATION_ZONES, clamp, roundMoney } from '@/lib/config/logistics';
import type { MarketOpportunity, Product, Seller } from '@/lib/domain/types';

type MarketSignal = {
  countryCode: string;
  countryName: string;
  tradeDemand: number;
  digitalAccess: number;
  purchasingPower: number;
  existingMarketplaceDemand: number;
  batchAvailability: number;
};

const MARKET_NAMES: Record<string, string> = { US: 'United States', AU: 'Australia', JP: 'Japan', CA: 'Canada', NZ: 'New Zealand' };

export function calculateMarketOpportunities(product: Product, _seller: Seller, signals: MarketSignal[]): MarketOpportunity[] {
  return signals.map((signal) => {
    const zone = DESTINATION_ZONES[signal.countryCode] ?? { surchargeUsd: 1.1 };
    const shippingCompetitiveness = clamp(1 - zone.surchargeUsd / 1.5);
    const components = {
      tradeDemand: clamp(signal.tradeDemand),
      shippingCompetitiveness,
      existingMarketplaceDemand: clamp(signal.existingMarketplaceDemand),
      digitalAccess: clamp(signal.digitalAccess),
      purchasingPower: clamp(signal.purchasingPower),
      batchAvailability: clamp(signal.batchAvailability),
    };
    const score = 0.4 * components.tradeDemand + 0.2 * components.shippingCompetitiveness + 0.15 * components.existingMarketplaceDemand + 0.1 * components.digitalAccess + 0.1 * components.purchasingPower + 0.05 * components.batchAvailability;
    return {
      countryCode: signal.countryCode,
      countryName: signal.countryName ?? MARKET_NAMES[signal.countryCode] ?? signal.countryCode,
      score: Math.round(score * 100),
      components,
      reasons: [
        `Strong ${product.category.toLowerCase()} trade-category signal`,
        `${shippingCompetitiveness >= 0.8 ? 'Competitive' : 'Improving'} shared shipping to market`,
        `${Math.round(components.existingMarketplaceDemand * 100)} / 100 existing marketplace demand`,
        `${Math.round(components.batchAvailability * 100)} / 100 active batch availability`,
      ],
    };
  }).sort((a, b) => b.score - a.score);
}

export function getPriceGuidance(product: Product, opportunity: MarketOpportunity): { low: number; high: number; midpoint: number; reasons: string[] } {
  const costFloor = product.priceUsd > 0 ? product.unitCostUsd / (1 - 0.5) : product.priceUsd;
  const demandMultiplier = 0.9 + (opportunity.score / 100) * 0.3;
  const scarcityMultiplier = product.inventory <= 6 ? 1.12 : product.inventory <= 12 ? 1.06 : 1;
  const midpoint = costFloor * demandMultiplier * scarcityMultiplier;
  const spread = 0.06;
  return {
    low: roundMoney(midpoint * (1 - spread)),
    high: roundMoney(midpoint * (1 + spread)),
    midpoint: roundMoney(midpoint),
    reasons: [opportunity.score >= 80 ? 'Healthy demand' : 'Growing category demand', product.inventory <= 12 ? 'Low remaining inventory' : 'Room to scale production', product.priceUsd - product.unitCostUsd < product.priceUsd * 0.5 ? 'Current margin below target' : 'Current margin supports the target'],
  };
}
