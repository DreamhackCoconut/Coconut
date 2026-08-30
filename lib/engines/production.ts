import type { Product, ProductionJob, Seller } from '@/lib/domain/types';

export function buildProductionPlan(seller: Seller, products: Product[], now = new Date()): ProductionJob[] {
  const sellerProducts = products.filter((product) => product.sellerId === seller.id).slice(0, 4);
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  return sellerProducts.map((product, index) => {
    const quantity = index === 0 ? 3 : index === 1 ? 2 : 1;
    const processingHours = Number((product.productionHours * quantity).toFixed(1));
    const scheduledStart = new Date(start.getTime() + index * 2.1 * 3_600_000);
    const scheduledFinish = new Date(scheduledStart.getTime() + processingHours * 3_600_000);
    const deadline = new Date(start.getTime() + (index === 0 ? 1.5 : index === 1 ? 4 : 7) * 3_600_000);
    const risk: ProductionJob['risk'] = scheduledFinish <= deadline ? (deadline.getTime() - scheduledFinish.getTime() < 3_600_000 ? 'tight' : 'on_track') : 'late';
    return { id: `job-${seller.id}-${index + 1}`, productId: product.id, productName: product.name, quantity, processingHours, scheduledStart: scheduledStart.toISOString(), scheduledFinish: scheduledFinish.toISOString(), deadline: deadline.toISOString(), risk };
  });
}
