import { z } from "zod";

/**
 * WRITER OUTPUT SCHEMAS
 * Maps to: 03-writer-output.docx
 * 
 * Defines the 4 bundle types the Writer Engine generates:
 * 1. Website Bundle
 * 2. Email Flow Bundle
 * 3. Email Reply Bundle
 * 4. Social Post Bundle
 */

// ============================================================
// SHARED OUTPUT SCHEMAS
// ============================================================

export const CTAOutputSchema = z.object({
    cta_id: z.string(),
    cta_type: z.enum(["REPLY", "CLICK", "BOOK_CALL", "DOWNLOAD", "OTHER"]),
    label: z.string(),
    destination_type: z.string(),
    destination_slug: z.string(),
});

export const RoutingSuggestionSchema = z.object({
    next_page_slug: z.string(),
    condition: z.string().optional(), // e.g., "if user shows interest in pricing"
    confidence: z.number().min(0).max(1).optional(),
});

// ============================================================
// 1. WEBSITE BUNDLE
// ============================================================

export const ContentSectionSchema = z.object({
    section_id: z.string(), // e.g., "hero", "features", "proof"
    content_markdown: z.string(),
    cta: CTAOutputSchema.optional(),
});

export const PageOutputSchema = z.object({
    page_id: z.string().uuid(),
    variant_id: z.string(), // e.g., "v1_baseline", "v2_risk_angle"
    slug: z.string(), // e.g., "/pricing-philosophy"
    page_type: z.string(), // LANDING, HOW_IT_WORKS, etc.
    buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]),

    // KB Component References (for analytics linking)
    blueprint_id: z.string(),
    layout_id: z.string(),
    angle_id: z.string(),

    // Content
    content_sections: z.array(ContentSectionSchema).min(1),

    // CTAs
    primary_cta: CTAOutputSchema,
    supporting_ctas: z.array(CTAOutputSchema).optional(),

    // Routing
    routing_suggestions: z.array(RoutingSuggestionSchema).optional(),

    // Metadata
    generated_at: z.string().datetime(),
});

export const RoutingMapSchema = z.object({
    from_slug: z.string(),
    to_slug: z.string(),
    via_cta_id: z.string(),
    context: z.string().optional(),
});

export const WebsiteBundleSchema = z.object({
    type: z.literal("website_bundle"),
    bundle_id: z.string().uuid(),
    run_id: z.string().uuid(),
    generated_at: z.string().datetime(),

    // Context
    icp_id: z.string(),
    offer_id: z.string(),
    buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]),

    // Output
    pages: z.array(PageOutputSchema).min(1),
    routing_map: z.array(RoutingMapSchema).optional(),
});

// ============================================================
// 2. EMAIL FLOW BUNDLE
// ============================================================

export const EmailInSequenceSchema = z.object({
    email_id: z.string().uuid(),
    position: z.number().int().min(1), // 1st, 2nd, 3rd email in sequence

    // KB Component References
    subject_variant_id: z.string().optional(),
    angle_id: z.string(),

    // Content
    subject: z.string(),
    first_line: z.string(),
    body_markdown: z.string(),

    // CTA
    cta: CTAOutputSchema,

    // Timing
    delay_from_previous_hours: z.number().int().min(0).optional(), // Hours to wait after previous email

    // Metadata
    generated_at: z.string().datetime(),
});

export const EmailFlowOutputSchema = z.object({
    flow_id: z.string().uuid(),
    variant_id: z.string(),

    // KB Component References
    flow_blueprint_id: z.string(),
    angle_id: z.string(),

    // Flow Details
    goal: z.enum(["MEANINGFUL_REPLY", "CLICK", "BOOK_CALL"]),
    sequence: z.array(EmailInSequenceSchema).min(1),
    total_days: z.number().int().min(1), // Total duration of the sequence

    // Metadata
    generated_at: z.string().datetime(),
});

export const EmailFlowBundleSchema = z.object({
    type: z.literal("email_flow_bundle"),
    bundle_id: z.string().uuid(),
    run_id: z.string().uuid(),
    generated_at: z.string().datetime(),

    // Context
    icp_id: z.string(),
    offer_id: z.string(),
    buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]),

    // Output
    flows: z.array(EmailFlowOutputSchema).min(1),
});

// ============================================================
// 3. EMAIL REPLY BUNDLE
// ============================================================

export const EmailReplyOutputSchema = z.object({
    reply_id: z.string().uuid(),
    variant_id: z.string(),

    // KB Component References
    scenario_id: z.string(), // Which scenario this reply addresses
    playbook_id: z.string(),
    strategy_id: z.string(),
    angle_id: z.string().optional(),

    // Content
    reply_markdown: z.string(),

    // CTA
    cta: CTAOutputSchema.optional(),

    // Metadata
    tone: z.enum(["helpful", "direct", "educational", "empathetic"]).optional(),
    estimated_length_words: z.number().int().optional(),
    generated_at: z.string().datetime(),
});

export const EmailReplyBundleSchema = z.object({
    type: z.literal("email_reply_bundle"),
    bundle_id: z.string().uuid(),
    run_id: z.string().uuid(),
    generated_at: z.string().datetime(),

    // Context
    icp_id: z.string(),
    offer_id: z.string(),

    // Output
    replies: z.array(EmailReplyOutputSchema).min(1),
});

// ============================================================
// 4. SOCIAL POST BUNDLE
// ============================================================

export const SocialPostOutputSchema = z.object({
    post_id: z.string().uuid(),
    variant_id: z.string(),

    // KB Component References
    platform: z.enum(["LinkedIn", "X", "YouTube"]),
    post_type: z.enum(["insight", "narrative", "comparison", "proof", "objection"]),
    pillar_id: z.string(),
    post_blueprint_id: z.string(),
    angle_id: z.string().optional(),

    // Content
    content_markdown: z.string(),
    hashtags: z.array(z.string()).optional(),

    // CTA
    cta: CTAOutputSchema.optional(),

    // Metadata
    estimated_length_chars: z.number().int().optional(),
    media_suggestion: z.string().optional(), // e.g., "chart showing ROI data"
    generated_at: z.string().datetime(),
});

export const SocialPostBundleSchema = z.object({
    type: z.literal("social_post_bundle"),
    bundle_id: z.string().uuid(),
    run_id: z.string().uuid(),
    generated_at: z.string().datetime(),

    // Context
    icp_id: z.string(),
    offer_id: z.string(),
    platform: z.enum(["LinkedIn", "X", "YouTube"]),

    // Output
    posts: z.array(SocialPostOutputSchema).min(1),
});

// ============================================================
// UNION TYPE (For storing any bundle)
// ============================================================

export const AnyBundleSchema = z.discriminatedUnion("type", [
    WebsiteBundleSchema,
    EmailFlowBundleSchema,
    EmailReplyBundleSchema,
    SocialPostBundleSchema,
]);

// ============================================================
// TYPE EXPORTS
// ============================================================

export type WebsiteBundle = z.infer<typeof WebsiteBundleSchema>;
export type PageOutput = z.infer<typeof PageOutputSchema>;
export type ContentSection = z.infer<typeof ContentSectionSchema>;

export type EmailFlowBundle = z.infer<typeof EmailFlowBundleSchema>;
export type EmailFlowOutput = z.infer<typeof EmailFlowOutputSchema>;
export type EmailInSequence = z.infer<typeof EmailInSequenceSchema>;

export type EmailReplyBundle = z.infer<typeof EmailReplyBundleSchema>;
export type EmailReplyOutput = z.infer<typeof EmailReplyOutputSchema>;

export type SocialPostBundle = z.infer<typeof SocialPostBundleSchema>;
export type SocialPostOutput = z.infer<typeof SocialPostOutputSchema>;

export type AnyBundle = z.infer<typeof AnyBundleSchema>;

export type CTAOutput = z.infer<typeof CTAOutputSchema>;
export type RoutingSuggestion = z.infer<typeof RoutingSuggestionSchema>;
