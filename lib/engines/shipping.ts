import { DESTINATION_ZONES, LOGISTICS, clamp, getDestinationZone, roundMoney } from '@/lib/config/logistics';
import type { BatchSnapshot, Departure, Destination, FinalMileQuote, PackingResult, ShippingBreakdown } from '@/lib/domain/types';

export function getChargeableWeight(packing: PackingResult): number {
  const weight = Number.isFinite(packing.totalWeightKg) && packing.totalWeightKg >= 0 ? packing.totalWeightKg : 0;
  const volume = Number.isFinite(packing.totalVolumeM3) && packing.totalVolumeM3 >= 0 ? packing.totalVolumeM3 : 0;
  return Math.max(weight, volume * LOGISTICS.seaDensityFactorKgPerM3);
}

export function estimateFinalMile(packing: PackingResult, destination: Destination): FinalMileQuote {
  const zone = DESTINATION_ZONES[destination.countryCode] ?? { deliveryDays: [8, 14] as [number, number], surchargeUsd: 1.1 };
  const chargeableWeight = getChargeableWeight(packing);
  const weightBandKg = Math.max(2, Math.ceil(chargeableWeight / 2) * 2);
  const oversized = packing.boxes.some((box) => box.cartonCode === 'L') ? LOGISTICS.finalMileOversizedIncrementUsd : 0;
  const rateUsd = LOGISTICS.finalMileBaseUsd + weightBandKg * LOGISTICS.finalMilePerChargeableKgUsd + packing.boxes.length * LOGISTICS.finalMilePerCartonUsd + zone.surchargeUsd + oversized;
  return {
    rateUsd: roundMoney(rateUsd),
    deliveryDaysMin: zone.deliveryDays[0],
    deliveryDaysMax: zone.deliveryDays[1],
    carrier: 'Demo Ground Network',
    service: 'Estimated',
    dataMode: 'demo',
  };
}

export function estimateSoloShipping(packing: PackingResult, destination: Destination): { totalUsd: number; finalMile: FinalMileQuote; breakdown: ShippingBreakdown } {
  const finalMile = estimateFinalMile(packing, destination);
  const breakdown = {
    localPickupShareUsd: LOGISTICS.soloLocalPickupUsd,
    islandFreightShareUsd: LOGISTICS.soloIslandMinimumChargeUsd,
    finalMileUsd: finalMile.rateUsd,
    packagingUsd: packing.totalPackagingCostUsd,
  };
  return { totalUsd: roundMoney(Object.values(breakdown).reduce((sum, value) => sum + value, 0)), finalMile, breakdown };
}

export function estimatePooledShipping(input: {
  packing: PackingResult;
  departure: Departure;
  batch: BatchSnapshot;
  destination: Destination;
  pickupRouteCostUsd?: number;
}): { totalUsd: number; finalMile: FinalMileQuote; breakdown: ShippingBreakdown; batchUtilization: number } {
  const { packing, departure, batch, destination } = input;
  const chargeableWeight = getChargeableWeight(packing);
  const currentBatchWeight = Number.isFinite(batch.currentWeightKg) && batch.currentWeightKg >= 0 ? batch.currentWeightKg : 0;
  const totalBatchChargeableWeight = Math.max(0.001, currentBatchWeight + chargeableWeight);
  const fixedShare = (chargeableWeight / totalBatchChargeableWeight) * departure.fixedCostUsd;
  const variableWeightCost = packing.totalWeightKg * departure.variableCostPerKg;
  const variableVolumeCost = packing.totalVolumeM3 * departure.variableCostPerM3;
  const routeCost = input.pickupRouteCostUsd ?? batch.estimatedLocalPickupCostUsd;
  const localPickupShare = (chargeableWeight / totalBatchChargeableWeight) * routeCost;
  const finalMile = estimateFinalMile(packing, destination);
  const breakdown = {
    localPickupShareUsd: roundMoney(localPickupShare),
    islandFreightShareUsd: roundMoney(fixedShare + variableWeightCost + variableVolumeCost),
    finalMileUsd: finalMile.rateUsd,
    packagingUsd: packing.totalPackagingCostUsd,
  };
  const batchWeightUtilization = (currentBatchWeight + Math.max(0, packing.totalWeightKg)) / Math.max(0.001, departure.maxWeightKg);
  const currentBatchVolume = Number.isFinite(batch.currentVolumeM3) && batch.currentVolumeM3 >= 0 ? batch.currentVolumeM3 : 0;
  const batchVolumeUtilization = (currentBatchVolume + Math.max(0, packing.totalVolumeM3)) / Math.max(0.001, departure.maxVolumeM3);
  return {
    totalUsd: roundMoney(Object.values(breakdown).reduce((sum, value) => sum + value, 0)),
    finalMile,
    breakdown,
    batchUtilization: clamp(Math.max(batchWeightUtilization, batchVolumeUtilization), 0, 1),
  };
}

export function calculateSavings(estimatedSoloUsd: number, pooledUsd: number): { savingsUsd: number; savingsPercent: number } {
  const savingsUsd = roundMoney(Math.max(0, estimatedSoloUsd - pooledUsd));
  return { savingsUsd, savingsPercent: estimatedSoloUsd ? Math.round((savingsUsd / estimatedSoloUsd) * 100) : 0 };
}

export function describeShippingDelta(deltaUsd: number): number {
  return Math.abs(deltaUsd) <= LOGISTICS.negligibleShippingDeltaUsd ? 0 : roundMoney(Math.max(0, deltaUsd));
}

export function getZoneForDestination(destination: Destination): string {
  return getDestinationZone(destination.countryCode);
}
