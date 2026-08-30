import { DEMO_CARTONS, DEMO_MARKETPLACE_LABEL, DEMO_PORTS, DEMO_PRODUCTS, DEMO_SELLERS, getDemoBatchSnapshot, getDemoDepartures, getDemoMarketSignals } from '@/lib/data/seed';
import { DEMO_VESSEL_PROFILE } from '@/lib/engines/weather-risk';
import { createAppwriteServerClient } from '@/lib/repositories/appwrite';

async function main() {
  const appwrite = createAppwriteServerClient();
  if (!appwrite) {
    console.log(`${DEMO_MARKETPLACE_LABEL}: Appwrite credentials are absent; the app will use its deterministic demo repository.`);
    return;
  }

  const { tablesDB, databaseId } = appwrite;

  async function upsert(tableId: string, rowId: string, data: Record<string, unknown>) {
    try {
      await tablesDB.getRow({ databaseId, tableId, rowId });
      await tablesDB.updateRow({ databaseId, tableId, rowId, data });
    } catch {
      await tablesDB.createRow({ databaseId, tableId, rowId, data });
    }
  }

  for (const seller of DEMO_SELLERS) {
    await upsert('sellers', seller.id, {
      name: seller.name,
      slug: seller.slug,
      bio: seller.bio,
      location_name: seller.locationName,
      latitude: seller.latitude,
      longitude: seller.longitude,
      pickup_window_start: seller.pickupWindowStart,
      pickup_window_end: seller.pickupWindowEnd,
      production_capacity_hours_per_day: seller.productionCapacityHoursPerDay,
      recent_impressions: seller.recentImpressions,
      rating: seller.rating,
      avatar_url: seller.avatarUrl,
    });
  }

  for (const product of DEMO_PRODUCTS) {
    await upsert('products', product.id, {
      seller_id: product.sellerId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      tags_json: JSON.stringify(product.tags),
      materials_json: JSON.stringify(product.materials),
      colors_json: JSON.stringify(product.colors),
      price_usd: product.priceUsd,
      unit_cost_usd: product.unitCostUsd,
      inventory: product.inventory,
      production_hours: product.productionHours,
      weight_kg: product.weightKg,
      length_cm: product.lengthCm,
      width_cm: product.widthCm,
      height_cm: product.heightCm,
      fragile: product.fragile,
      stackable: product.stackable,
      image_url: product.imageUrl,
      active: product.active,
    });
  }

  for (const port of DEMO_PORTS) {
    await upsert('ports', port.id, {
      name: port.name,
      country_code: port.countryCode,
      latitude: port.latitude,
      longitude: port.longitude,
      source: port.source,
      source_external_id: port.sourceExternalId,
    });
  }

  for (const carton of DEMO_CARTONS) {
    await upsert('carton_profiles', carton.code, {
      code: carton.code,
      inner_length_cm: carton.innerLengthCm,
      inner_width_cm: carton.innerWidthCm,
      inner_height_cm: carton.innerHeightCm,
      max_weight_kg: carton.maxWeightKg,
      packaging_weight_kg: carton.packagingWeightKg,
      packaging_cost_usd: carton.packagingCostUsd,
    });
  }

  const departures = getDemoDepartures();
  for (const departure of departures) {
    await upsert('departures', departure.id, {
      label: departure.label,
      origin_port_id: departure.originPortId,
      gateway_port_id: departure.gatewayPortId,
      departure_at: departure.departureAt,
      arrival_at: departure.arrivalAt,
      order_cutoff_at: departure.cutoffAt,
      max_weight_kg: departure.maxWeightKg,
      max_volume_m3: departure.maxVolumeM3,
      fixed_cost_usd: departure.fixedCostUsd,
      variable_cost_per_kg: departure.variableCostPerKg,
      variable_cost_per_m3: departure.variableCostPerM3,
      destination_zone: departure.destinationZone,
      status: departure.status,
      route_points_json: JSON.stringify(departure.routePoints),
      weather_risk: departure.weatherRisk,
      weather_label: departure.weatherLabel,
    });
  }

  const batch = getDemoBatchSnapshot();
  await upsert('batches', batch.id, {
    departure_id: batch.departureId,
    destination_zone: batch.destinationZone,
    current_weight_kg: batch.currentWeightKg,
    current_volume_m3: batch.currentVolumeM3,
    order_count: batch.orderCount,
    participating_seller_ids_json: JSON.stringify(batch.participatingSellerIds),
    weather_risk: batch.weatherRisk,
    weather_label: batch.weatherLabel,
    estimated_local_pickup_cost_usd: batch.estimatedLocalPickupCostUsd,
    predicted_total_logistics_cost_usd: batch.predictedTotalLogisticsCostUsd,
  });

  await upsert('vessel_profiles', 'vessel-island-trader-14', {
    name: DEMO_VESSEL_PROFILE.name,
    max_wave_height_m: DEMO_VESSEL_PROFILE.operationalMaxWaveM,
    max_wind_kph: DEMO_VESSEL_PROFILE.operationalMaxWindKph,
    wave_weight: 0.45,
    wind_weight: 0.25,
    swell_weight: 0.15,
  });

  for (const signal of getDemoMarketSignals()) {
    await upsert('market_signals', `${signal.countryCode}-all`, {
      country_code: signal.countryCode,
      product_category: 'all',
      trade_demand: signal.tradeDemand,
      digital_access: signal.digitalAccess,
      purchasing_power: signal.purchasingPower,
      existing_marketplace_demand: signal.existingMarketplaceDemand,
      observed_at: new Date().toISOString(),
    });
  }

  // Keep the two cache tables provisioned but empty; providers fill them on first live call.
  console.log(`Seeded ${DEMO_SELLERS.length} sellers, ${DEMO_PRODUCTS.length} products, ${departures.length} departures, and ${getDemoMarketSignals().length} market signals in Appwrite TablesDB.`);
}

main().catch((error) => {
  console.error('Appwrite seed failed:', error);
  process.exitCode = 1;
});
