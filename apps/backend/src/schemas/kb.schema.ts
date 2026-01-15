import { z } from "zod";

// 01-KB: Brand Rules
export const BrandRulesSchema = z.object({
    brand_name_exact: z.literal("InMarket"), // Strict Constraint
    voice_rules: z.array(z.string()).min(1),
    compliance: z.object({
        forbidden_claims: z.array(z.string()),
        required_disclosures: z.array(z.string()),
    }),
});

// 01-KB: ICP Segment
export const ICPSegmentSchema = z.object({
    icp_id: z.string(),
    industry_group_norm: z.string(),
    pain_points: z.array(z.string()),
    job_titles: z.array(z.string()),
});

// 01-KB: Offer
export const OfferSchema = z.object({
    offer_id: z.string(),
    offer_name: z.string(),
    value_proposition: z.string(),
    pricing_model: z.string(),
});

// 01-KB: Page Blueprint
export const PageBlueprintSchema = z.object({
    blueprint_id: z.string(),
    page_type: z.enum(["LANDING", "HOW_IT_WORKS", "PRICING_PHILOSOPHY"]),
    required_sections: z.array(z.string()),
    is_default: z.boolean().optional(),
});

// 01-KB: Learning Preferences
export const KBLearningPreferenceSchema = z.object({
    pref_id: z.string(),
    preference_type: z.enum([
        "PREFER_ANGLE",
        "PREFER_CTA",
        "PREFER_PAGE_TYPE",
        "PREFER_LAYOUT",
        "PREFER_FLOW_BLUEPRINT",
        "PREFER_REPLY_STRATEGY",
        "PREFER_SUBJECT_FIRSTLINE",
        "PREFER_SOCIAL_BLUEPRINT",
    ]),
    preferred_ids: z.array(z.string()).min(1),
    reason: z.string(),
});

// 01-KB: Full Knowledge Base
export const KnowledgeBaseSchema = z.object({
    brand: BrandRulesSchema,
    icp_library: z.object({
        segments: z.array(ICPSegmentSchema),
    }),
    offer_library: z.object({
        offers: z.array(OfferSchema),
    }),
    libraries: z.object({
        website: z.object({
            page_blueprints: z.array(PageBlueprintSchema),
        }),
    }),
    learning: z.object({
        preferences: z.array(KBLearningPreferenceSchema),
    }),
    guardrails: z.object({
        paused_patterns: z.array(z.string()),
    }).optional(),
});

export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;
export type ICPSegment = z.infer<typeof ICPSegmentSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type PageBlueprint = z.infer<typeof PageBlueprintSchema>;
