import { z } from "zod";

// BrightData Product Schema - very flexible to handle various response formats
export const BrightDataProductSchema = z.object({
  title: z.string().optional().nullable(),
  name: z.string().optional().nullable(), // Alternative field for title
  seller_name: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  description: z.any().optional().nullable(), // Can be string or other types
  product_description: z.any().optional().nullable(), // Can be string, array, or other
  initial_price: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  availability: z.string().optional().nullable(),
  reviews_count: z.number().optional().nullable(),
  categories: z.array(z.string()).optional().default([]),
  asin: z.string().optional().nullable(),
  buybox_seller: z.string().optional().nullable(),
  buybox_prices: z.any().optional().nullable(),
  rating: z.number().optional().nullable(),
  image: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  final_price: z.number().optional().nullable(),
  variations: z.array(z.any()).optional().default([]),
  features: z.any().optional().default([]), // Can be array of strings or other format
  images: z.array(z.string()).optional().default([]),
  top_review: z.string().optional().nullable(),
  customer_says: z.any().optional().nullable(), // Can be object, string, or other
}).passthrough(); // Allow additional fields we don't know about

export const BrightDataResponseSchema = z.array(BrightDataProductSchema);

export type BrightDataProduct = z.infer<typeof BrightDataProductSchema>;
export type BrightDataResponse = z.infer<typeof BrightDataResponseSchema>;
