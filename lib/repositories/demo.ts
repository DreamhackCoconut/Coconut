import { getDemoBatchSnapshot, getDemoDepartures, getProductById, getProductBySlug, getSellerById, DEMO_PRODUCTS, DEMO_SELLERS } from '@/lib/data/seed';
import type { MarketplaceRepository, DemoOrderInput } from '@/lib/repositories/types';

export class DemoMarketplaceRepository implements MarketplaceRepository {
  async listProducts() {
    return DEMO_PRODUCTS;
  }

  async getProduct(productId: string) {
    return getProductById(productId);
  }

  async getProductBySlug(slug: string) {
    return getProductBySlug(slug);
  }

  async listSellers() {
    return DEMO_SELLERS;
  }

  async getSeller(sellerId: string) {
    return getSellerById(sellerId);
  }

  async getDepartures() {
    return getDemoDepartures();
  }

  async getBatchSnapshot() {
    return getDemoBatchSnapshot();
  }

  async recordEvent() {
    return undefined;
  }

  async createDemoOrder(_input: DemoOrderInput) {
    return { orderId: `demo-order-${Date.now()}`, batchId: 'batch-friday-west-coast' };
  }

  async resetDemoState() {
    return undefined;
  }
}
