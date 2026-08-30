import { z } from 'zod';

export const destinationSchema = z.object({
  countryCode: z.enum(['US', 'AU', 'NZ', 'JP', 'CA']),
  region: z.string().trim().max(80).default('West Coast'),
  postalCode: z.string().trim().min(3).max(12).default('94107'),
});

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(80),
  quantity: z.number().finite().int().min(1).max(20),
});

export const cartRequestSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(12),
  destination: destinationSchema,
}).superRefine((value, context) => {
  const seen = new Set<string>();
  for (const [index, item] of value.items.entries()) {
    if (seen.has(item.productId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'productId'], message: 'Each product may appear only once in the cart.' });
    seen.add(item.productId);
  }
});

export const eventRequestSchema = z.object({
  sessionId: z.string().min(1).max(120),
  eventType: z.enum(['product_impression', 'product_click', 'recommendation_impression', 'recommendation_click', 'add_to_cart', 'remove_from_cart', 'cart_quote', 'checkout_started', 'purchase']),
  productId: z.string().max(80).optional(),
  sellerId: z.string().max(80).optional(),
  metadata: z.record(z.unknown()).optional().superRefine((value, context) => {
    try {
      if (JSON.stringify(value).length > 8_000) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Event metadata is too large.' });
    } catch {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Event metadata must be JSON serializable.' });
    }
  }),
});
