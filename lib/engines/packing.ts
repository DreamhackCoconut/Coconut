import { DEMO_CARTONS } from '@/lib/data/seed';
import { clamp } from '@/lib/config/logistics';
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
  // Fragile pieces get their own carton. The old second branch was unreachable
  // because the early return already rejected every fragile combination.
  return product.fragile || boxItems.some((item) => item.fragile);
}

type WorkingBox = {
  carton: CartonProfile;
  items: PackedItem[];
  paddedVolumeCm3: number;
  actualWeightKg: number;
};

function sortScore(product: Product, cartons: CartonProfile[]): number {
  const largestCarton = cartons[cartons.length - 1];
  const largestVolume = largestCarton.innerLengthCm * largestCarton.innerWidthCm * largestCarton.innerHeightCm;
  const largestWeight = largestCarton.maxWeightKg;
  return Math.max(paddedVolume(product) / largestVolume, product.weightKg / largestWeight);
}

export function packCart(lines: CartLine[], products: Product[], cartons: CartonProfile[] = DEMO_CARTONS): PackingResult {
  if (!cartons.length) throw new Error('At least one carton profile is required.');
  for (const carton of cartons) {
    if ([carton.innerLengthCm, carton.innerWidthCm, carton.innerHeightCm, carton.maxWeightKg].some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error(`Carton ${carton.code} has invalid dimensions or weight capacity.`);
    }
    if ([carton.packagingWeightKg, carton.packagingCostUsd].some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error(`Carton ${carton.code} has invalid packaging values.`);
    }
  }
  const productById = new Map(products.map((product) => [product.id, product]));
  const expanded: PackedItem[] = [];

  for (const line of lines) {
    const product = productById.get(line.productId);
    if (!product) throw new Error(`Product ${line.productId} was not found in the catalog.`);
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error(`Quantity for ${line.productId} must be a positive integer.`);
    const productValues = [product.weightKg, product.lengthCm, product.widthCm, product.heightCm, product.priceUsd, product.unitCostUsd, product.productionHours];
    if (productValues.some((value) => !Number.isFinite(value)) || [product.lengthCm, product.widthCm, product.heightCm].some((value) => value <= 0) || product.weightKg < 0) {
      throw new Error(`Product ${product.id} has invalid physical dimensions or weight.`);
    }
    if (!cartons.some((carton) => fitsCarton(product, carton) && product.weightKg + carton.packagingWeightKg <= carton.maxWeightKg)) {
      throw new Error(`${product.name} does not fit any available carton.`);
    }
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
    return (bProduct ? sortScore(bProduct, cartons) : 0) - (aProduct ? sortScore(aProduct, cartons) : 0);
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
        box.actualWeightKg + item.weightKg + box.carton.packagingWeightKg <= box.carton.maxWeightKg
      ) {
        box.items.push(item);
        box.paddedVolumeCm3 += item.paddedVolumeCm3;
        box.actualWeightKg += item.weightKg;
        placed = true;
        break;
      }
    }

    if (!placed) {
      const compatible = cartons.filter((carton) => fitsCarton(product, carton) && item.weightKg + carton.packagingWeightKg <= carton.maxWeightKg);
      const carton = compatible[0];
      if (!carton) throw new Error(`${product.name} does not fit any available carton.`);
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
      utilization: Number(clamp(Math.max(box.paddedVolumeCm3 / cartonVolume, (box.actualWeightKg + box.carton.packagingWeightKg) / box.carton.maxWeightKg)).toFixed(3)),
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
