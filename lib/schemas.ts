import { z } from "zod";

// BrightData Product Schema
export const BrightDataProductSchema = z.object({
  title: z.string(),
  seller_name: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  initial_price: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  availability: z.string().optional().nullable(),
  reviews_count: z.number().optional().nullable(),
  categories: z.array(z.string()).optional().default([]),
  asin: z.string().optional().nullable(),
  buybox_seller: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  image: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  final_price: z.number().optional().nullable(),
  variations: z.array(z.any()).optional().default([]),
  features: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  top_review: z.string().optional().nullable(),
  customer_says: z
    .object({
      text: z.string().optional().nullable(),
      keywords: z
        .object({
          positive: z.array(z.string()).optional().nullable(),
          negative: z.array(z.string()).optional().nullable(),
          mixed: z.array(z.string()).optional().nullable(),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
});

export const BrightDataResponseSchema = z.array(BrightDataProductSchema);

export type BrightDataProduct = z.infer<typeof BrightDataProductSchema>;
export type BrightDataResponse = z.infer<typeof BrightDataResponseSchema>;
