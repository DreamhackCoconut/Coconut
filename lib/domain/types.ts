export type ProviderMode = 'live' | 'cache' | 'stale' | 'demo';

export type ProviderResult<T> = {
  data: T;
  metadata: {
    provider: string;
    mode: ProviderMode;
    fetchedAt?: string;
  };
};

export type ProductCategory = 'Jewelry' | 'Basketry' | 'Woodwork' | 'Textiles' | 'Ceramics' | 'Prints';

export type Seller = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  locationName: string;
  latitude: number;
  longitude: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  productionCapacityHoursPerDay: number;
  recentImpressions: number;
  rating: number;
  avatarUrl: string;
};

export type Product = {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description: string;
  category: ProductCategory;
  tags: string[];
  materials: string[];
  colors: string[];
  priceUsd: number;
  unitCostUsd: number;
  inventory: number;
  productionHours: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fragile: boolean;
  stackable: boolean;
  imageUrl: string;
  active: boolean;
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CartonProfile = {
  code: string;
  innerLengthCm: number;
  innerWidthCm: number;
  innerHeightCm: number;
  maxWeightKg: number;
  packagingWeightKg: number;
  packagingCostUsd: number;
};

export type PackedItem = {
  itemId: string;
  productId: string;
  productName: string;
  quantityIndex: number;
  weightKg: number;
  paddedVolumeCm3: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fragile: boolean;
  stackable: boolean;
};

export type PackedBox = {
  cartonCode: string;
  itemIds: string[];
  actualWeightKg: number;
  shippingWeightKg: number;
  paddedVolumeCm3: number;
  utilization: number;
  dimensions: [number, number, number];
};

export type PackingResult = {
  boxes: PackedBox[];
  totalWeightKg: number;
  totalVolumeM3: number;
  totalPackagingCostUsd: number;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type Departure = {
  id: string;
  label: string;
  originPortId: string;
  gatewayPortId: string;
  departureAt: string;
  arrivalAt: string;
  cutoffAt: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  fixedCostUsd: number;
  variableCostPerKg: number;
  variableCostPerM3: number;
  destinationZone: string;
  status: 'open' | 'limited' | 'closed';
  routePoints: GeoPoint[];
  weatherRisk: number;
  weatherLabel: string;
};

export type BatchSnapshot = {
  id: string;
  departureId: string;
  destinationZone: string;
  currentWeightKg: number;
  currentVolumeM3: number;
  orderCount: number;
  participatingSellerIds: string[];
  weatherRisk: number;
  weatherLabel: string;
  estimatedLocalPickupCostUsd: number;
  predictedTotalLogisticsCostUsd: number;
};

export type Destination = {
  countryCode: string;
  region: string;
  postalCode: string;
};

export type FinalMileQuote = {
  rateUsd: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  carrier: string;
  service: string;
  dataMode: ProviderMode;
};

export type ShippingBreakdown = {
  localPickupShareUsd: number;
  islandFreightShareUsd: number;
  finalMileUsd: number;
  packagingUsd: number;
};

export type Quote = {
  subtotalUsd: number;
  packing: PackingResult;
  recommendedBatch: {
    id: string;
    departureId: string;
    departureAt: string;
    cutoffAt: string;
    arrivalAt: string;
    utilization: number;
    weatherRisk: number;
    weatherLabel: string;
  };
  shipping: {
    estimatedSoloUsd: number;
    pooledUsd: number;
    savingsUsd: number;
    savingsPercent: number;
  };
  finalMile: FinalMileQuote;
  estimatedDelivery: {
    minDate: string;
    maxDate: string;
  };
  breakdown: ShippingBreakdown;
  providerModes: Record<string, ProviderMode>;
};

export type RecommendationComponents = {
  productRelevance: number;
  shippingEfficiency: number;
  batchBenefit: number;
  marginQuality: number;
  productionReadiness: number;
  sellerFairness: number;
};

export type Recommendation = {
  product: Product & { seller: Seller };
  score: number;
  shippingDeltaUsd: number;
  components: RecommendationComponents;
  reasons: string[];
};

export type WeatherObservation = {
  waveHeightM: number;
  wavePeriodS: number;
  swellHeightM: number;
  swellPeriodS: number;
  windKph: number;
  gustKph: number;
  precipitationMm: number;
};

export type WeatherRisk = {
  risk: number;
  label: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH';
  explanation: string;
  observations: WeatherObservation[];
};

export type RouteStop = {
  sellerId: string;
  sellerName: string;
  latitude: number;
  longitude: number;
  weightKg: number;
  volumeM3: number;
  earliestMinute: number;
  latestMinute: number;
};

export type Route = {
  vehicleId: string;
  stopIndices: number[];
  sellerIds: string[];
  distanceMeters: number;
  durationSeconds: number;
  loadWeightKg: number;
  loadVolumeM3: number;
};

export type RouteGeoJson = {
  type: 'Feature';
  properties: Record<string, string | number>;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
};

export type RouteOptimizationResult = {
  routes: Route[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  objectiveValue: number;
  optimizerMode: 'ortools' | 'typescript-fallback';
  routeGeoJson: RouteGeoJson;
};

export type MarketOpportunity = {
  countryCode: string;
  countryName: string;
  score: number;
  components: {
    tradeDemand: number;
    shippingCompetitiveness: number;
    existingMarketplaceDemand: number;
    digitalAccess: number;
    purchasingPower: number;
    batchAvailability: number;
  };
  reasons: string[];
};

export type ProductionJob = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  processingHours: number;
  scheduledStart: string;
  scheduledFinish: string;
  deadline: string;
  risk: 'on_track' | 'tight' | 'late';
};
