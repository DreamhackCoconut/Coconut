import { DEMO_CARTONS } from '@/lib/data/seed';
import type { CartLine, CartonProfile, PackedBox, PackedItem, PackingResult, Product } from '@/lib/domain/types';

function paddedVolume(product: Product): number {
  const volume = product.lengthCm * product.widthCm * product.heightCm;
  return volume * (product.fragile ? 1.25 : 1.08);
}

function orientations(product: Product): Array<[number, number, number]> {
  const { lengthCm: l, widthCm: w, heightCm: h } = product;
  return [
    [l, w, h], [l, h, w], [w, l, h], [w, h, l], [h, l, w], [h, w, l],
  ];
}

function fitsCarton(product: Product, carton: CartonProfile): boolean {
  return orientations(product).some(([l, w, h]) => l <= carton.innerLengthCm && w <= carton.innerWidthCm && h <= carton.innerHeightCm);
}

function cannotSafelyShare(boxItems: PackedItem[], product: Product): boolean {
  if (product.fragile || boxItems.some((item) => item.fragile)) return true;
  return boxItems.some((item) => {
    const heavyNonStackable = item.weightKg > 2.2 && !item.stackable;
    return (product.fragile && heavyNonStackable) || (item.fragile && product.weightKg > 2.2 && !product.stackable);
  });
}

type WorkingBox = {
  carton: CartonProfile;
  items: PackedItem[];
  paddedVolumeCm3: number;
  actualWeightKg: number;
};

function sortScore(product: Product): number {
  const largestVolume = DEMO_CARTONS[DEMO_CARTONS.length - 1].innerLengthCm * DEMO_CARTONS[DEMO_CARTONS.length - 1].innerWidthCm * DEMO_CARTONS[DEMO_CARTONS.length - 1].innerHeightCm;
  const largestWeight = DEMO_CARTONS[DEMO_CARTONS.length - 1].maxWeightKg;
  return Math.max(paddedVolume(product) / largestVolume, product.weightKg / largestWeight);
}

export function packCart(lines: CartLine[], products: Product[], cartons: CartonProfile[] = DEMO_CARTONS): PackingResult {
  const productById = new Map(products.map((product) => [product.id, product]));
  const expanded: PackedItem[] = [];

  for (const line of lines) {
    const product = productById.get(line.productId);
    if (!product || line.quantity <= 0) continue;
    for (let quantityIndex = 0; quantityIndex < line.quantity; quantityIndex += 1) {
      expanded.push({
        itemId: `${product.id}-${quantityIndex + 1}`,
        productId: product.id,
        productName: product.name,
        quantityIndex,
        weightKg: product.weightKg,
        paddedVolumeCm3: paddedVolume(product),
        lengthCm: product.lengthCm,
        widthCm: product.widthCm,
        heightCm: product.heightCm,
        fragile: product.fragile,
        stackable: product.stackable,
      });
    }
  }

  const sorted = [...expanded].sort((a, b) => {
    const aProduct = productById.get(a.productId);
    const bProduct = productById.get(b.productId);
    return (bProduct ? sortScore(bProduct) : 0) - (aProduct ? sortScore(aProduct) : 0);
  });
  const boxes: WorkingBox[] = [];

  for (const item of sorted) {
    const product = productById.get(item.productId);
    if (!product) continue;

    let placed = false;
    for (const box of boxes) {
      const maxVolume = box.carton.innerLengthCm * box.carton.innerWidthCm * box.carton.innerHeightCm;
      const fits = fitsCarton(product, box.carton);
      if (
        fits &&
        !cannotSafelyShare(box.items, product) &&
        box.paddedVolumeCm3 + item.paddedVolumeCm3 <= maxVolume &&
        box.actualWeightKg + item.weightKg <= box.carton.maxWeightKg
      ) {
        box.items.push(item);
        box.paddedVolumeCm3 += item.paddedVolumeCm3;
        box.actualWeightKg += item.weightKg;
        placed = true;
        break;
      }
    }

    if (!placed) {
      const compatible = cartons.filter((carton) => fitsCarton(product, carton) && item.weightKg <= carton.maxWeightKg);
      const carton = compatible[0] ?? cartons[cartons.length - 1];
      boxes.push({ carton, items: [item], paddedVolumeCm3: item.paddedVolumeCm3, actualWeightKg: item.weightKg });
    }
  }

  const packedBoxes: PackedBox[] = boxes.map((box) => {
    const cartonVolume = box.carton.innerLengthCm * box.carton.innerWidthCm * box.carton.innerHeightCm;
    const shippingWeightKg = Math.max(box.actualWeightKg + box.carton.packagingWeightKg, (box.paddedVolumeCm3 / 1_000_000) * 250);
    return {
      cartonCode: box.carton.code,
      itemIds: box.items.map((item) => item.itemId),
      actualWeightKg: Number((box.actualWeightKg + box.carton.packagingWeightKg).toFixed(3)),
      shippingWeightKg: Number(shippingWeightKg.toFixed(3)),
      paddedVolumeCm3: Number(box.paddedVolumeCm3.toFixed(1)),
      utilization: Number(Math.max(box.paddedVolumeCm3 / cartonVolume, box.actualWeightKg / box.carton.maxWeightKg).toFixed(3)),
      dimensions: [box.carton.innerLengthCm, box.carton.innerWidthCm, box.carton.innerHeightCm],
    };
  });

  return {
    boxes: packedBoxes,
    totalWeightKg: Number(packedBoxes.reduce((sum, box) => sum + box.actualWeightKg, 0).toFixed(3)),
    totalVolumeM3: Number((packedBoxes.reduce((sum, box) => sum + box.paddedVolumeCm3, 0) / 1_000_000).toFixed(6)),
    totalPackagingCostUsd: Number(boxes.reduce((sum, box) => sum + box.carton.packagingCostUsd, 0).toFixed(2)),
  };
}

export function itemFitsCarton(product: Product, carton: CartonProfile): boolean {
  return fitsCarton(product, carton);
}

export function getProductPaddedVolume(product: Product): number {
  return paddedVolume(product);
}
