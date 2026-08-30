import { LOGISTICS, clamp, getDestinationZone, roundMoney } from '@/lib/config/logistics';
import { getDemoBatchSnapshot, getDemoDepartures } from '@/lib/data/seed';
import type { BatchSnapshot, CartLine, Departure, Destination, Product, Quote } from '@/lib/domain/types';
import { packCart } from '@/lib/engines/packing';
import { calculateSavings, estimatePooledShipping, estimateSoloShipping } from '@/lib/engines/shipping';

function hoursBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
}

export function isCartReadyForDeparture(lines: CartLine[], products: Product[], departure: Departure, now = new Date()): boolean {
  const requiredHours = Math.max(...lines.map((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    if (!product || !Number.isInteger(line.quantity) || line.quantity <= 0) return Number.POSITIVE_INFINITY;
    return product.inventory >= line.quantity ? 0 : Math.max(0, product.productionHours) * line.quantity;
  }), 0);
  return requiredHours <= Math.max(0, hoursBetween(now.toISOString(), departure.cutoffAt) - LOGISTICS.productionPickupBufferHours);
}

export function isDepartureCompatible(destination: Destination, departure: Departure): boolean {
  const destinationZone = getDestinationZone(destination.countryCode);
  // The seeded US-WEST sailings are gateway departures with final-mile coverage
  // for every supported destination. Other routes remain zone-specific.
  return departure.destinationZone === destinationZone || destinationZone === 'GLOBAL' || departure.destinationZone === 'US-WEST';
}

function scoreDepartures(options: Array<{ departure: Departure; pooledUsd: number; transitHours: number; weatherRisk: number; utilization: number }>) {
  const costs = options.map((option) => option.pooledUsd);
  const transit = options.map((option) => option.transitHours);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minTransit = Math.min(...transit);
  const maxTransit = Math.max(...transit);
  return options.map((option) => {
    const costScore = maxCost === minCost ? 1 : 1 - (option.pooledUsd - minCost) / (maxCost - minCost);
    const speedScore = maxTransit === minTransit ? 1 : 1 - (option.transitHours - minTransit) / (maxTransit - minTransit);
    const weatherReliability = 1 - option.weatherRisk;
    const utilizationBenefit = clamp(option.utilization * 1.2, 0, 1);
    const score = 0.45 * costScore + 0.25 * speedScore + 0.2 * weatherReliability + 0.1 * utilizationBenefit;
    return { ...option, score };
  });
}

export function getEligibleDepartures(lines: CartLine[], products: Product[], destination: Destination, batch: BatchSnapshot, departures: Departure[], now = new Date(), packing = packCart(lines, products)) {
  const options = departures.filter((departure) => {
    const cutoffTime = new Date(departure.cutoffAt).getTime();
    const departureTime = new Date(departure.departureAt).getTime();
    const isFuture = Number.isFinite(cutoffTime) && cutoffTime > now.getTime();
    const departureIsFuture = Number.isFinite(departureTime) && departureTime > now.getTime();
    const numericFieldsValid = [departure.maxWeightKg, departure.maxVolumeM3, departure.fixedCostUsd, departure.variableCostPerKg, departure.variableCostPerM3, departure.weatherRisk].every(Number.isFinite) && departure.maxWeightKg > 0 && departure.maxVolumeM3 > 0 && departure.fixedCostUsd >= 0 && departure.variableCostPerKg >= 0 && departure.variableCostPerM3 >= 0 && departure.weatherRisk >= 0 && departure.weatherRisk <= 1;
    const capacityOk = batch.currentWeightKg + packing.totalWeightKg <= departure.maxWeightKg && batch.currentVolumeM3 + packing.totalVolumeM3 <= departure.maxVolumeM3;
    const destinationOk = isDepartureCompatible(destination, departure);
    return departure.status !== 'closed' && numericFieldsValid && isFuture && departureIsFuture && capacityOk && destinationOk && isCartReadyForDeparture(lines, products, departure, now);
  });
  return options;
}

export function quoteCart(lines: CartLine[], destination: Destination, products: Product[], batch: BatchSnapshot = getDemoBatchSnapshot(), departures: Departure[] = getDemoDepartures(), now = new Date()): Quote {
  if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0)) throw new Error('Cart quantities must be positive integers.');
  const safeLines = lines;
  const productMap = new Map(products.map((product) => [product.id, product]));
  const packing = packCart(safeLines, products);
  const subtotalUsd = roundMoney(safeLines.reduce((sum, line) => sum + (productMap.get(line.productId)?.priceUsd ?? 0) * line.quantity, 0));
  const eligible = getEligibleDepartures(safeLines, products, destination, batch, departures, now, packing);
  if (!eligible.length) throw new Error('No eligible departure is available for this cart.');
  const scored = scoreDepartures(eligible.map((departure) => {
    const pooled = estimatePooledShipping({ packing, departure, batch, destination });
    return { departure, pooledUsd: pooled.totalUsd, transitHours: hoursBetween(departure.departureAt, departure.arrivalAt), weatherRisk: departure.weatherRisk, utilization: pooled.batchUtilization };
  }));
  const recommended = [...scored].sort((a, b) => b.score - a.score)[0];
  const pooled = estimatePooledShipping({ packing, departure: recommended.departure, batch, destination });
  const solo = estimateSoloShipping(packing, destination);
  const savings = calculateSavings(solo.totalUsd, pooled.totalUsd);
  const minDate = new Date(new Date(recommended.departure.arrivalAt).getTime() + solo.finalMile.deliveryDaysMin * 86_400_000).toISOString();
  const maxDate = new Date(new Date(recommended.departure.arrivalAt).getTime() + solo.finalMile.deliveryDaysMax * 86_400_000).toISOString();
  return {
    subtotalUsd,
    packing,
    recommendedBatch: {
      id: batch.id,
      departureId: recommended.departure.id,
      departureAt: recommended.departure.departureAt,
      cutoffAt: recommended.departure.cutoffAt,
      arrivalAt: recommended.departure.arrivalAt,
      utilization: pooled.batchUtilization,
      weatherRisk: recommended.departure.weatherRisk,
      weatherLabel: recommended.departure.weatherLabel,
    },
    shipping: {
      estimatedSoloUsd: solo.totalUsd,
      pooledUsd: pooled.totalUsd,
      savingsUsd: savings.savingsUsd,
      savingsPercent: savings.savingsPercent,
    },
    finalMile: pooled.finalMile,
    estimatedDelivery: { minDate, maxDate },
    breakdown: pooled.breakdown,
    providerModes: { road: 'demo', marine: 'demo', carrier: 'demo' },
  };
}

export function getDepartureScorePreview(lines: CartLine[], destination: Destination, products: Product[], batch = getDemoBatchSnapshot()) {
  const packing = packCart(lines, products);
  return getEligibleDepartures(lines, products, destination, batch, getDemoDepartures(), new Date(), packing).map((departure) => {
    const pooled = estimatePooledShipping({ packing, departure, batch, destination });
    return { departure, pooledUsd: pooled.totalUsd, weatherReliability: 1 - departure.weatherRisk, utilization: pooled.batchUtilization };
  });
}
