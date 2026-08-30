import type { BatchSnapshot, CartLine, Departure, Product, Seller } from '@/lib/domain/types';

export type DemoOrderInput = {
  lines: CartLine[];
  subtotalUsd: number;
  pooledShippingUsd: number;
  destinationCountry: string;
  batchId?: string;
};

export interface MarketplaceRepository {
  listProducts(): Promise<Product[]>;
  getProduct(productId: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  listSellers(): Promise<Seller[]>;
  getSeller(sellerId: string): Promise<Seller | undefined>;
  getDepartures(): Promise<Departure[]>;
  getBatchSnapshot(): Promise<BatchSnapshot>;
  recordEvent(event: { sessionId: string; eventType: string; productId?: string; sellerId?: string; metadata?: Record<string, unknown> }): Promise<void>;
  createDemoOrder(input: DemoOrderInput): Promise<{ orderId: string; batchId: string }>;
  resetDemoState(): Promise<void>;
}
