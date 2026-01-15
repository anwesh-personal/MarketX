import { z } from "zod";

/**
 * WRITER INPUT SCHEMA
 * Maps to: 02-writer-input.docx
 * 
 * Defines what the Writer Engine receives to generate content.
 */

// ============================================================
// GENERATION REQUEST SCHEMAS
// ============================================================

export const WebsiteGenerationRequestSchema = z.object({
    page_types: z.array(z.string()).min(1), // e.g., ["LANDING", "HOW_IT_WORKS", "PRICING_PHILOSOPHY"]
    routing_required: z.boolean().default(true),
    variants_per_page: z.number().int().min(1).max(10).default(1),
});

export const EmailGenerationRequestSchema = z.object({
    flow_count: z.number().int().min(1).default(1),
    reply_scenarios: z.array(z.string()).min(1), // Scenario IDs from KB
    variants_per_flow: z.number().int().min(1).max(5).default(1),
    variants_per_reply: z.number().int().min(1).max(5).default(1),
});

export const SocialGenerationRequestSchema = z.object({
    platform: z.enum(["LinkedIn", "X", "YouTube"]),
    post_count: z.number().int().min(1).max(20).default(5),
    pillar_ids: z.array(z.string()).optional(), // Specific pillars to focus on
    variants_per_post: z.number().int().min(1).max(3).default(1),
});

// ============================================================
// MAIN WRITER INPUT
// ============================================================

export const WriterInputSchema = z.object({
    // Run metadata
    run_id: z.string().uuid().optional(), // Generated if not provided
    run_type: z.enum(["ON_DEMAND", "DAILY_SCHEDULED"]),
    kb_version: z.string(), // Which KB version to use
    timestamp: z.string().datetime(),

    // Context
    icp: z.object({
        icp_id: z.string(), // Writer resolves full ICP from KB
    }),

    offer: z.object({
        offer_id: z.string(), // Writer resolves full offer from KB
    }),

    buyer_stage: z.enum([
        "AWARENESS",
        "CONSIDERATION",
        "EVALUATION",
        "RISK_RESOLUTION",
        "READY",
    ]),

    // What to generate
    generation_requests: z.object({
        website: WebsiteGenerationRequestSchema.optional(),
        email: EmailGenerationRequestSchema.optional(),
        social: SocialGenerationRequestSchema.optional(),
    }).refine(
        (data) => data.website || data.email || data.social,
        { message: "At least one generation request (website, email, or social) is required" }
    ),

    // For learning loop runs
    previous_calendar_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD

    // Optional overrides (advanced usage)
    force_angle_ids: z.array(z.string()).optional(), // Force specific angles
    force_cta_ids: z.array(z.string()).optional(), // Force specific CTAs
    exclude_pattern_ids: z.array(z.string()).optional(), // Exclude specific patterns
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type WriterInput = z.infer<typeof WriterInputSchema>;
export type WebsiteGenerationRequest = z.infer<typeof WebsiteGenerationRequestSchema>;
export type EmailGenerationRequest = z.infer<typeof EmailGenerationRequestSchema>;
export type SocialGenerationRequest = z.infer<typeof SocialGenerationRequestSchema>;
