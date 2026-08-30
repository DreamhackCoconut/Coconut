import { Client, ID, Query, TablesDB } from 'node-appwrite';
import { getDemoBatchSnapshot, getDemoDepartures, getProductById, getProductBySlug, getSellerById, DEMO_PRODUCTS, DEMO_SELLERS } from '@/lib/data/seed';
import type { BatchSnapshot, CartLine, Departure, Product, Seller } from '@/lib/domain/types';
import type { DemoOrderInput, MarketplaceRepository } from '@/lib/repositories/types';

type AppwriteRow = Record<string, unknown> & { $id?: string; $createdAt?: string };

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
    fragile: Boolean(row.fragile),
    stackable: Boolean(row.stackable),
    imageUrl: String(row.image_url ?? ''),
    active: row.active !== false,
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
    status: String(row.status ?? fallback.status) as Departure['status'],
    routePoints: asJson(row.route_points_json ?? row.route_points, fallback.routePoints),
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
  if (!endpoint || !projectId || !apiKey || !databaseId) return null;
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { client, tablesDB: new TablesDB(client), databaseId };
}

export class AppwriteMarketplaceRepository implements MarketplaceRepository {
  constructor(private readonly tablesDB: TablesDB, private readonly databaseId: string) {}

  private async list(tableId: string, queries: string[] = []): Promise<AppwriteRow[]> {
    const result = await this.tablesDB.listRows({ databaseId: this.databaseId, tableId, queries: [...queries, Query.limit(100)] });
    return rowsFrom(result);
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
        participatingSellerIds: asJsonArray(row.participating_seller_ids_json ?? row.participating_seller_ids),
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
    const batchId = 'batch-friday-west-coast';
    try {
      await this.create(TABLES.orders, orderId, {
        status: 'demo_confirmed',
        batch_id: batchId,
        destination_country: input.destinationCountry,
        subtotal_usd: input.subtotalUsd,
        pooled_shipping_usd: input.pooledShippingUsd,
        created_at: new Date().toISOString(),
      });
      for (const line of input.lines) {
        await this.create(TABLES.orderItems, ID.unique(), { order_id: orderId, product_id: line.productId, quantity: line.quantity });
      }
      await this.create(TABLES.batchOrders, ID.unique(), { batch_id: batchId, order_id: orderId });
      return { orderId, batchId };
    } catch {
      return { orderId: `demo-order-${Date.now()}`, batchId };
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
      for (const product of DEMO_PRODUCTS) {
        if (await this.get(TABLES.products, product.id)) await this.update(TABLES.products, product.id, { inventory: product.inventory, active: product.active });
      }
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
