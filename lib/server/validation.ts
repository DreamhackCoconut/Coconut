import { z } from 'zod';

export const destinationSchema = z.object({
  countryCode: z.enum(['US', 'AU', 'NZ', 'JP', 'CA']),
  region: z.string().trim().max(80).default('West Coast'),
  postalCode: z.string().trim().min(3).max(12).default('94107'),
});

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(20),
});

export const cartRequestSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(12),
  destination: destinationSchema,
});

export const eventRequestSchema = z.object({
  sessionId: z.string().min(1).max(120),
  eventType: z.enum(['product_impression', 'product_click', 'recommendation_impression', 'recommendation_click', 'add_to_cart', 'remove_from_cart', 'cart_quote', 'checkout_started', 'purchase']),
  productId: z.string().max(80).optional(),
  sellerId: z.string().max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
});
