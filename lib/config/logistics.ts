export const LOGISTICS = {
  seaDensityFactorKgPerM3: 250,
  roadFactor: 1.25,
  demoAverageRoadSpeedKph: 32,
  pickupVehicleBaseCostUsd: 17,
  pickupPerKmCostUsd: 0.72,
  soloLocalPickupUsd: 7.2,
  soloIslandMinimumChargeUsd: 9.4,
  finalMileBaseUsd: 3.4,
  finalMilePerChargeableKgUsd: 1.2,
  finalMilePerCartonUsd: 1.25,
  finalMileOversizedIncrementUsd: 4.2,
  shippingDeltaCapUsd: 15,
  negligibleShippingDeltaUsd: 0.5,
  productionPickupBufferHours: 3,
  targetMargin: 0.5,
  sellerPriceRangeSpread: 0.06,
  maxCartLines: 12,
  maxCartQuantity: 20,
  maxOptimizationStops: 25,
  maxOptimizationVehicles: 5,
  currentDemoBatchChargeableWeightKg: 64,
  currentDemoBatchVolumeM3: 0.31,
  currentDemoBatchOrderCount: 18,
} as const;

export const DESTINATION_ZONES: Record<string, { zone: string; deliveryDays: [number, number]; surchargeUsd: number }> = {
  US: { zone: 'US-WEST', deliveryDays: [6, 10], surchargeUsd: 0.65 },
  AU: { zone: 'AU-EAST', deliveryDays: [5, 8], surchargeUsd: 0.3 },
  NZ: { zone: 'NZ', deliveryDays: [4, 7], surchargeUsd: 0.1 },
  JP: { zone: 'JP', deliveryDays: [7, 11], surchargeUsd: 0.8 },
  CA: { zone: 'CA-WEST', deliveryDays: [8, 12], surchargeUsd: 0.9 },
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function getDestinationZone(countryCode: string): string {
  return DESTINATION_ZONES[countryCode]?.zone ?? 'GLOBAL';
}
