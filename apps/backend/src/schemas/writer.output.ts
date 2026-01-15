import { z } from "zod";

// 03-Writer-Output: The Page Object
export const PageOutputSchema = z.object({
    page_id: z.string().uuid(),
    variant_id: z.string(),
    slug: z.string(),
    page_type: z.enum(["LANDING", "HOW_IT_WORKS", "PRICING_PHILOSOPHY"]),
    buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "READY"]),
    content_markdown: z.string(), // The actual copy
    primary_cta: z.object({
        cta_type: z.enum(["BOOK_CALL", "REPLY"]),
        label: z.string(),
        destination_slug: z.string(),
    }),
});

// The Full Bundle
export const WebsiteBundleSchema = z.object({
    type: z.literal("website_bundle"),
    bundle_id: z.string().uuid(),
    generated_at: z.string(), // ISO timestamp
    pages: z.array(PageOutputSchema),
});

export type WebsiteBundle = z.infer<typeof WebsiteBundleSchema>;
export type PageOutput = z.infer<typeof PageOutputSchema>;
