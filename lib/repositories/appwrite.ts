import { Client, ID, Query, TablesDB } from 'node-appwrite';
import { getDemoBatchSnapshot, getDemoDepartures, getProductById, getProductBySlug, getSellerById, DEMO_PRODUCTS, DEMO_SELLERS } from '@/lib/data/seed';
import type { BatchSnapshot, CartLine, Departure, GeoPoint, Product, Seller } from '@/lib/domain/types';
import type { DemoOrderInput, MarketplaceRepository } from '@/lib/repositories/types';
import { packCart } from '@/lib/engines/packing';

type AppwriteRow = Record<string, unknown> & { $id?: string; $createdAt?: string };

type ServerClient = { client: Client; tablesDB: TablesDB; databaseId: string };

let cachedClientSignature: string | undefined;
let cachedServerClient: ServerClient | null | undefined;

const TABLES = {
  sellers: 'sellers',
  products: 'products',
  orders: 'orders',
  orderItems: 'order_items',
  departures: 'departures',
  batches: 'batches',
  batchOrders: 'batch_orders',
  events: 'marketplace_events',
} as const;

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true' || value === '1') return true;
    if (value.toLowerCase() === 'false' || value === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

function asJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function asJson<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asGeoPoints(value: unknown, fallback: GeoPoint[]): GeoPoint[] {
  const parsed = asJson<unknown>(value, undefined);
  if (!Array.isArray(parsed)) return fallback;
  const points = parsed.filter((point): point is GeoPoint => Boolean(point && typeof point === 'object' && Number.isFinite((point as GeoPoint).latitude) && (point as GeoPoint).latitude >= -90 && (point as GeoPoint).latitude <= 90 && Number.isFinite((point as GeoPoint).longitude) && (point as GeoPoint).longitude >= -180 && (point as GeoPoint).longitude <= 180));
  return points.length === parsed.length ? points : fallback;
}

function mapSeller(row: AppwriteRow): Seller {
  return {
    id: String(row.$id ?? row.id),
    name: String(row.name ?? 'Island artisan'),
    slug: String(row.slug ?? row.$id ?? 'artisan'),
    bio: String(row.bio ?? ''),
    locationName: String(row.location_name ?? 'Rarotonga'),
    latitude: asNumber(row.latitude),
    longitude: asNumber(row.longitude),
    pickupWindowStart: String(row.pickup_window_start ?? '08:00'),
    pickupWindowEnd: String(row.pickup_window_end ?? '16:00'),
    productionCapacityHoursPerDay: asNumber(row.production_capacity_hours_per_day, 5),
    recentImpressions: asNumber(row.recent_impressions),
    rating: asNumber(row.rating, 4.7),
    avatarUrl: String(row.avatar_url ?? ''),
  };
}

function mapProduct(row: AppwriteRow): Product {
  return {
    id: String(row.$id ?? row.id),
    sellerId: String(row.seller_id),
    name: String(row.name ?? 'Island-made piece'),
    slug: String(row.slug ?? row.$id ?? 'piece'),
    description: String(row.description ?? ''),
    category: String(row.category ?? 'Basketry') as Product['category'],
    tags: asJsonArray(row.tags_json ?? row.tags),
    materials: asJsonArray(row.materials_json ?? row.materials),
    colors: asJsonArray(row.colors_json ?? row.colors),
    priceUsd: asNumber(row.price_usd),
    unitCostUsd: asNumber(row.unit_cost_usd),
    inventory: asNumber(row.inventory),
    productionHours: asNumber(row.production_hours),
    weightKg: asNumber(row.weight_kg),
    lengthCm: asNumber(row.length_cm),
    widthCm: asNumber(row.width_cm),
    heightCm: asNumber(row.height_cm),
    fragile: asBoolean(row.fragile, false),
    stackable: asBoolean(row.stackable, false),
    imageUrl: String(row.image_url ?? ''),
    active: asBoolean(row.active, true),
  };
}

function mapDeparture(row: AppwriteRow, fallback: Departure): Departure {
  return {
    ...fallback,
    id: String(row.$id ?? row.id),
    label: String(row.label ?? fallback.label),
    originPortId: String(row.origin_port_id ?? fallback.originPortId),
    gatewayPortId: String(row.gateway_port_id ?? fallback.gatewayPortId),
    departureAt: String(row.departure_at ?? fallback.departureAt),
    arrivalAt: String(row.arrival_at ?? fallback.arrivalAt),
    cutoffAt: String(row.order_cutoff_at ?? fallback.cutoffAt),
    maxWeightKg: asNumber(row.max_weight_kg, fallback.maxWeightKg),
    maxVolumeM3: asNumber(row.max_volume_m3, fallback.maxVolumeM3),
    fixedCostUsd: asNumber(row.fixed_cost_usd, fallback.fixedCostUsd),
    variableCostPerKg: asNumber(row.variable_cost_per_kg, fallback.variableCostPerKg),
    variableCostPerM3: asNumber(row.variable_cost_per_m3, fallback.variableCostPerM3),
    destinationZone: String(row.destination_zone ?? fallback.destinationZone),
    status: row.status === 'open' || row.status === 'limited' || row.status === 'closed' ? row.status : fallback.status,
    routePoints: asGeoPoints(row.route_points_json ?? row.route_points, fallback.routePoints),
    weatherRisk: asNumber(row.weather_risk, fallback.weatherRisk),
    weatherLabel: String(row.weather_label ?? fallback.weatherLabel),
  };
}

function rowsFrom(result: unknown): AppwriteRow[] {
  const payload = result as { rows?: AppwriteRow[]; documents?: AppwriteRow[] };
  return payload.rows ?? payload.documents ?? [];
}

export function createAppwriteServerClient(): { client: Client; tablesDB: TablesDB; databaseId: string } | null {
  const endpoint = process.env.APPWRITE_ENDPOINT ?? process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID ?? process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const signature = [endpoint, projectId, apiKey, databaseId].join('\u0000');
  if (signature === cachedClientSignature) return cachedServerClient ?? null;
  cachedClientSignature = signature;
  if (!endpoint || !projectId || !apiKey || !databaseId) {
    cachedServerClient = null;
    return null;
  }
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  cachedServerClient = { client, tablesDB: new TablesDB(client), databaseId };
  return cachedServerClient;
}

export class AppwriteMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly tablesDB: TablesDB, private readonly databaseId: string) {}

  private async list(tableId: string, queries: string[] = []): Promise<AppwriteRow[]> {
    const rows: AppwriteRow[] = [];
    let offset = 0;
    while (true) {
      const result = await this.tablesDB.listRows({ databaseId: this.databaseId, tableId, queries: [...queries, Query.limit(100), Query.offset(offset)] });
      const page = rowsFrom(result);
      rows.push(...page);
      if (page.length < 100) return rows;
      offset += page.length;
    }
  }

  private async get(tableId: string, rowId: string): Promise<AppwriteRow | undefined> {
    try {
      return await this.tablesDB.getRow({ databaseId: this.databaseId, tableId, rowId }) as AppwriteRow;
    } catch {
      return undefined;
    }
  }

  private async create(tableId: string, rowId: string, data: Record<string, unknown>): Promise<void> {
    await this.tablesDB.createRow({ databaseId: this.databaseId, tableId, rowId, data });
  }

  private async update(tableId: string, rowId: string, data: Record<string, unknown>): Promise<void> {
    await this.tablesDB.updateRow({ databaseId: this.databaseId, tableId, rowId, data });
  }

  async listProducts(): Promise<Product[]> {
    try {
      const rows = await this.list(TABLES.products, [Query.equal('active', true), Query.orderAsc('name')]);
      return rows.length ? rows.map(mapProduct) : DEMO_PRODUCTS;
    } catch {
      return DEMO_PRODUCTS;
    }
  }

  async getProduct(productId: string): Promise<Product | undefined> {
    try {
      const row = await this.get(TABLES.products, productId);
      return row ? mapProduct(row) : getProductById(productId);
    } catch {
      return getProductById(productId);
    }
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    try {
      const rows = await this.list(TABLES.products, [Query.equal('slug', slug)]);
      return rows[0] ? mapProduct(rows[0]) : getProductBySlug(slug);
    } catch {
      return getProductBySlug(slug);
    }
  }

  async listSellers(): Promise<Seller[]> {
    try {
      const rows = await this.list(TABLES.sellers, [Query.orderAsc('name')]);
      return rows.length ? rows.map(mapSeller) : DEMO_SELLERS;
    } catch {
      return DEMO_SELLERS;
    }
  }

  async getSeller(sellerId: string): Promise<Seller | undefined> {
    try {
      const row = await this.get(TABLES.sellers, sellerId);
      return row ? mapSeller(row) : getSellerById(sellerId);
    } catch {
      return getSellerById(sellerId);
    }
  }

  async getDepartures(): Promise<Departure[]> {
    const demoDepartures = getDemoDepartures();
    try {
      const rows = await this.list(TABLES.departures, [Query.orderAsc('departure_at')]);
      const departures = rows.map((row, index) => mapDeparture(row, demoDepartures[index] ?? demoDepartures[0]));
      return departures.length ? departures : demoDepartures;
    } catch {
      return demoDepartures;
    }
  }

  async getBatchSnapshot(): Promise<BatchSnapshot> {
    try {
      const row = await this.get(TABLES.batches, 'batch-friday-west-coast');
      if (!row) return getDemoBatchSnapshot();
      const fallback = getDemoBatchSnapshot();
      return {
        ...fallback,
        id: String(row.$id ?? row.id ?? fallback.id),
        departureId: String(row.departure_id ?? fallback.departureId),
        destinationZone: String(row.destination_zone ?? fallback.destinationZone),
        currentWeightKg: asNumber(row.current_weight_kg, fallback.currentWeightKg),
        currentVolumeM3: asNumber(row.current_volume_m3, fallback.currentVolumeM3),
        orderCount: asNumber(row.order_count, fallback.orderCount),
        participatingSellerIds: asJsonArray(row.participating_seller_ids_json ?? row.participating_seller_ids).length ? asJsonArray(row.participating_seller_ids_json ?? row.participating_seller_ids) : fallback.participatingSellerIds,
        weatherRisk: asNumber(row.weather_risk, fallback.weatherRisk),
        weatherLabel: String(row.weather_label ?? fallback.weatherLabel),
        estimatedLocalPickupCostUsd: asNumber(row.estimated_local_pickup_cost_usd, fallback.estimatedLocalPickupCostUsd),
        predictedTotalLogisticsCostUsd: asNumber(row.predicted_total_logistics_cost_usd, fallback.predictedTotalLogisticsCostUsd),
      };
    } catch {
      return getDemoBatchSnapshot();
    }
  }

  async recordEvent(event: { sessionId: string; eventType: string; productId?: string; sellerId?: string; metadata?: Record<string, unknown> }): Promise<void> {
    try {
      await this.create(TABLES.events, ID.unique(), {
        session_id: event.sessionId,
        event_type: event.eventType,
        ...(event.productId ? { product_id: event.productId } : {}),
        ...(event.sellerId ? { seller_id: event.sellerId } : {}),
        metadata_json: JSON.stringify(event.metadata ?? {}),
        occurred_at: new Date().toISOString(),
      });
    } catch {
      // Telemetry must never interrupt a customer flow.
    }
  }

  async createDemoOrder(input: DemoOrderInput) {
    const orderId = ID.unique();
    const batchId = input.batchId ?? 'batch-friday-west-coast';
    const createdRows: Array<{ tableId: string; rowId: string }> = [];
    const lineProductIds = new Set<string>();
    const productSnapshots: Array<{ line: CartLine; row: AppwriteRow; product: Product }> = [];
    for (const line of input.lines) {
      if (lineProductIds.has(line.productId) || !Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Order lines must contain unique, positive quantities.');
      lineProductIds.add(line.productId);
      const row = await this.get(TABLES.products, line.productId);
      if (!row) throw new Error(`Product ${line.productId} is not available in the persistent catalog.`);
      const product = mapProduct(row);
      if (!product.active || product.inventory < line.quantity) throw new Error(`${product.name} does not have enough inventory.`);
      productSnapshots.push({ line, row, product });
    }
    const packing = packCart(input.lines, productSnapshots.map((snapshot) => snapshot.product));
    const batchRow = await this.get(TABLES.batches, batchId);
    if (!batchRow) throw new Error(`Batch ${batchId} is not available in the persistent catalog.`);
    const departureId = String(batchRow.departure_id ?? '');
    const departureRow = departureId ? await this.get(TABLES.departures, departureId) : undefined;
    if (!departureRow) throw new Error(`Departure ${departureId || 'unknown'} is not available in the persistent catalog.`);
    const departureFallback = getDemoDepartures().find((departure) => departure.id === departureId) ?? getDemoDepartures()[0];
    const departure = mapDeparture(departureRow, departureFallback);
    const currentWeightKg = asNumber(batchRow.current_weight_kg);
    const currentVolumeM3 = asNumber(batchRow.current_volume_m3);
    if (currentWeightKg + packing.totalWeightKg > departure.maxWeightKg || currentVolumeM3 + packing.totalVolumeM3 > departure.maxVolumeM3) throw new Error('This shared departure no longer has enough capacity.');
    const previousInventory = productSnapshots.map(({ product }) => product.inventory);
    const previousBatch = { currentWeightKg, currentVolumeM3, orderCount: asNumber(batchRow.order_count), participatingSellerIds: asJsonArray(batchRow.participating_seller_ids_json ?? batchRow.participating_seller_ids) };
    let stateMutationAttempted = false;
    try {
      await this.create(TABLES.orders, orderId, {
        status: 'demo_confirmed',
        batch_id: batchId,
        destination_country: input.destinationCountry,
        subtotal_usd: input.subtotalUsd,
        pooled_shipping_usd: input.pooledShippingUsd,
        created_at: new Date().toISOString(),
      });
      createdRows.push({ tableId: TABLES.orders, rowId: orderId });
      for (const line of input.lines) {
        const rowId = ID.unique();
        await this.create(TABLES.orderItems, rowId, { order_id: orderId, product_id: line.productId, quantity: line.quantity });
        createdRows.push({ tableId: TABLES.orderItems, rowId });
      }
      const batchOrderId = ID.unique();
      await this.create(TABLES.batchOrders, batchOrderId, { batch_id: batchId, order_id: orderId });
      createdRows.push({ tableId: TABLES.batchOrders, rowId: batchOrderId });
      stateMutationAttempted = true;
      for (const { line, product } of productSnapshots) {
        await this.update(TABLES.products, product.id, { inventory: product.inventory - line.quantity });
      }
      const sellerIds = [...new Set([...previousBatch.participatingSellerIds, ...productSnapshots.map(({ product }) => product.sellerId)])];
      await this.update(TABLES.batches, batchId, {
        current_weight_kg: currentWeightKg + packing.totalWeightKg,
        current_volume_m3: currentVolumeM3 + packing.totalVolumeM3,
        order_count: previousBatch.orderCount + 1,
        participating_seller_ids_json: JSON.stringify(sellerIds),
      });
      return { orderId, batchId };
    } catch (error) {
      if (stateMutationAttempted) {
        await Promise.all(productSnapshots.map(({ product }, index) => this.update(TABLES.products, product.id, { inventory: previousInventory[index] }).catch(() => undefined)));
        await this.update(TABLES.batches, batchId, {
          current_weight_kg: previousBatch.currentWeightKg,
          current_volume_m3: previousBatch.currentVolumeM3,
          order_count: previousBatch.orderCount,
          participating_seller_ids_json: JSON.stringify(previousBatch.participatingSellerIds),
        }).catch(() => undefined);
      }
      await Promise.all(createdRows.reverse().map(({ tableId, rowId }) => this.tablesDB.deleteRow({ databaseId: this.databaseId, tableId, rowId }).catch(() => undefined)));
      throw error;
    }
  }

  async resetDemoState(): Promise<void> {
    const deleteRows = async (tableId: string) => {
      const rows = await this.list(tableId);
      await Promise.all(rows.map((row) => row.$id ? this.tablesDB.deleteRow({ databaseId: this.databaseId, tableId, rowId: row.$id }) : Promise.resolve()));
    };
    try {
      await deleteRows(TABLES.events);
      await deleteRows(TABLES.orderItems);
      await deleteRows(TABLES.batchOrders);
      await deleteRows(TABLES.orders);
      await Promise.all(DEMO_PRODUCTS.map(async (product) => {
        if (await this.get(TABLES.products, product.id)) await this.update(TABLES.products, product.id, { inventory: product.inventory, active: product.active });
      }));
      const batch = getDemoBatchSnapshot();
      if (await this.get(TABLES.batches, batch.id)) {
        await this.update(TABLES.batches, batch.id, {
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
      }
    } catch {
      // A missing/partially provisioned Appwrite project still has a local demo fallback.
    }
  }
}
