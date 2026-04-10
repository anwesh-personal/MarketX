import { z } from "zod";

/**
 * COMPLETE KNOWLEDGE BASE SCHEMA
 * Maps to: 01-kb.docx
 * 
 * This is THE LAW. All KB JSON must validate against this schema.
 */

// ============================================================
// SHARED TYPES
// ============================================================

/**
 * AppliesTo - Context filter for targeting rules
 */
export const AppliesToSchema = z.object({
    icp_id: z.string().optional(),
    industry_group_norm: z.string().optional(),
    revenue_band_norm: z.enum(["SMB", "LMM", "MM", "ENT"]).optional(),
    seniority_norm: z.enum(["IC", "MANAGER", "DIRECTOR", "EXEC"]).optional(),
    buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]).optional(),
    offer_id: z.string().optional(),
});

// ============================================================
// 1. BRAND RULES
// ============================================================

export const BrandRulesSchema = z.object({
    /** The org's exact brand name — must match exactly in all generated content. Dynamic per org, never hardcoded. */
    brand_name_exact: z.string().min(1, 'Brand name is required'),
    voice_rules: z.array(z.string()).min(1),
    compliance: z.object({
        forbidden_claims: z.array(z.string()),
        required_disclosures: z.array(z.string()),
    }),
});

// ============================================================
// 2. ICP LIBRARY
// ============================================================

export const ICPSegmentSchema = z.object({
    icp_id: z.string(),
    segment_name: z.string(),
    industry_group_norm: z.string(),
    firm_size: z.object({
        min_employees: z.number().int().min(0).optional(),
        max_employees: z.number().int().min(0).optional(),
    }).optional(),
    revenue_band_norm: z.enum(["SMB", "LMM", "MM", "ENT"]),
    seniority_norm: z.enum(["IC", "MANAGER", "DIRECTOR", "EXEC"]),
    pain_points: z.array(z.string()).min(1),
    job_titles: z.array(z.string()).min(1),
    buying_triggers: z.array(z.string()).min(1),
    decision_criteria: z.array(z.string()).min(1),
});

export const ICPLibrarySchema = z.object({
    segments: z.array(ICPSegmentSchema).min(1),
});

// ============================================================
// 3. OFFER LIBRARY
// ============================================================

export const OfferSchema = z.object({
    offer_id: z.string(),
    offer_name: z.string(),
    category: z.string(),
    value_proposition: z.string(),
    differentiators: z.array(z.string()).min(1),
    pricing_model: z.string(),
    delivery_timeline: z.string(),
    proof_points: z.array(z.string()).min(1),
});

export const OfferLibrarySchema = z.object({
    offers: z.array(OfferSchema).min(1),
});

// ============================================================
// 4. ANGLES LIBRARY
// ============================================================

export const AngleSchema = z.object({
    angle_id: z.string(),
    angle_name: z.string(),
    axis: z.enum(["risk", "speed", "control", "loss", "upside", "identity"]),
    narrative: z.string(),
    applies_to: AppliesToSchema.optional(),
});

export const AnglesLibrarySchema = z.object({
    angles: z.array(AngleSchema).min(1),
});

// ============================================================
// 5. CTAS LIBRARY
// ============================================================

export const CTASchema = z.object({
    cta_id: z.string(),
    cta_type: z.enum(["REPLY", "CLICK", "BOOK_CALL", "DOWNLOAD", "OTHER"]),
    label: z.string(),
    destination_type: z.string(),
    destination_slug: z.string(),
    applies_to: AppliesToSchema.optional(),
});

export const CTAsLibrarySchema = z.object({
    ctas: z.array(CTASchema).min(1),
});

// ============================================================
// 6. WEBSITE LIBRARY
// ============================================================

export const PageBlueprintSchema = z.object({
    blueprint_id: z.string(),
    page_type: z.string(), // LANDING, HOW_IT_WORKS, PRICING_PHILOSOPHY, etc.
    buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]),
    required_sections: z.array(z.string()).min(1),
    recommended_angle_axes: z.array(z.enum(["risk", "speed", "control", "loss", "upside", "identity"])).optional(),
    default_cta_type: z.enum(["REPLY", "CLICK", "BOOK_CALL", "DOWNLOAD", "OTHER"]),
    applies_to: AppliesToSchema.optional(),
});

export const LayoutSchema = z.object({
    layout_id: z.string(),
    layout_name: z.string(),
    structure: z.array(z.string()).min(1), // e.g., ["hero", "features", "proof", "cta"]
    applies_to: AppliesToSchema.optional(),
});

export const WebsiteLibrarySchema = z.object({
    page_blueprints: z.array(PageBlueprintSchema).min(1),
    layouts: z.array(LayoutSchema).min(1),
});

// ============================================================
// 7. EMAIL LIBRARY
// ============================================================

export const EmailFlowBlueprintSchema = z.object({
    flow_blueprint_id: z.string(),
    flow_name: z.string(),
    goal: z.enum(["MEANINGFUL_REPLY", "CLICK", "BOOK_CALL"]),
    length_range: z.object({
        min: z.number().int().min(1),
        max: z.number().int().min(1),
    }),
    sequence_structure: z.array(z.string()).min(1), // e.g., ["intro", "value", "proof", "ask"]
    default_cta_type: z.enum(["REPLY", "CLICK", "BOOK_CALL", "DOWNLOAD", "OTHER"]),
    recommended_angle_axes: z.array(z.enum(["risk", "speed", "control", "loss", "upside", "identity"])).optional(),
    applies_to: AppliesToSchema.optional(),
});

export const SubjectFirstLineVariantSchema = z.object({
    variant_id: z.string().regex(/^[A-Za-z0-9]+(_[A-Za-z0-9]+)*$/),
    subject: z.string(),
    first_line: z.string(),
    notes: z.string().optional(),
    applies_to: AppliesToSchema.optional(),
});

export const ReplyScenarioSchema = z.object({
    scenario_id: z.string(),
    description: z.string(),
    allowed_strategy_ids: z.array(z.string()).min(1),
});

export const ReplyPlaybookSchema = z.object({
    playbook_id: z.string(),
    playbook_name: z.string(),
    scenarios: z.array(ReplyScenarioSchema).min(1),
    applies_to: AppliesToSchema.optional(),
});

export const ReplyStrategySchema = z.object({
    strategy_id: z.string(),
    strategy_name: z.string(),
    strategy_type: z.enum([
        "CLARIFYING_QUESTION_FIRST",
        "GUIDANCE_FIRST",
        "PAGE_FIRST",
        "CALENDAR_FIRST",
        "TWO_STEP_ESCALATION",
    ]),
    rules: z.array(z.string()).min(1),
    applies_to: AppliesToSchema.optional(),
});

export const EmailLibrarySchema = z.object({
    flow_blueprints: z.array(EmailFlowBlueprintSchema).min(1),
    subject_firstline_variants: z.array(SubjectFirstLineVariantSchema).min(1),
    reply_playbooks: z.array(ReplyPlaybookSchema).min(1),
    reply_strategies: z.array(ReplyStrategySchema).min(1),
});

// ============================================================
// 8. SOCIAL LIBRARY
// ============================================================

export const SocialPillarSchema = z.object({
    pillar_id: z.string(),
    pillar_name: z.string(),
    description: z.string(),
    applies_to: AppliesToSchema.optional(),
});

export const SocialPostBlueprintSchema = z.object({
    post_blueprint_id: z.string(),
    platform: z.enum(["LinkedIn", "X", "YouTube"]),
    post_type: z.enum(["insight", "narrative", "comparison", "proof", "objection"]),
    structure_rules: z.array(z.string()).min(1),
    applies_to: AppliesToSchema.optional(),
});

export const SocialLibrarySchema = z.object({
    pillars: z.array(SocialPillarSchema).min(1),
    post_blueprints: z.array(SocialPostBlueprintSchema).min(1),
});

// ============================================================
// 9. ROUTING
// ============================================================

export const RoutingDefaultSchema = z.object({
    context: AppliesToSchema,
    destination_type: z.string(),
    destination_slug: z.string(),
    cta_type: z.enum(["REPLY", "CLICK", "BOOK_CALL", "DOWNLOAD", "OTHER"]),
});

export const RoutingRuleSchema = z.object({
    rule_id: z.string(),
    if: z.object({
        entry_page_type: z.string().optional(),
        buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]).optional(),
        icp_id: z.string().optional(),
    }),
    then: z.object({
        next_destination_slug: z.string(),
        preferred_cta_id: z.string().optional(),
    }),
});

export const RoutingSchema = z.object({
    defaults: z.array(RoutingDefaultSchema),
    rules: z.array(RoutingRuleSchema),
});

// ============================================================
// 10. TESTING CONFIGURATION
// ============================================================

export const VariantPolicySchema = z.object({
    enabled: z.boolean(),
    max_variants: z.number().int().min(1),
    evaluation_window_days: z.number().int().min(1),
    min_sample_size: z.number().int().min(1),
});

export const TestingConfigSchema = z.object({
    pages: VariantPolicySchema,
    email_flows: VariantPolicySchema,
    email_replies: VariantPolicySchema,
    subject_firstline: VariantPolicySchema,
    social_posts: VariantPolicySchema.optional(),
});

// ============================================================
// 11. GUARDRAILS
// ============================================================

export const PausedPatternSchema = z.object({
    pattern_type: z.enum([
        "PAGE_BLUEPRINT",
        "LAYOUT",
        "FLOW_BLUEPRINT",
        "REPLY_STRATEGY",
        "SUBJECT_FIRSTLINE",
        "SOCIAL_BLUEPRINT",
    ]),
    pattern_id: z.string(),
    reason: z.string(),
    paused_at: z.string().datetime(),
});

export const GuardrailsSchema = z.object({
    paused_patterns: z.array(PausedPatternSchema),
});

// ============================================================
// 12. LEARNING
// ============================================================

export const KBLearningUpdateSchema = z.object({
    update_id: z.string(),
    timestamp: z.string().datetime(),
    source: z.enum(["DAILY_RUN", "MANUAL"]),
    summary: z.string(),
    evidence_refs: z.array(z.string()).optional(),
});

export const KBLearningPreferenceSchema = z.object({
    pref_id: z.string(),
    applies_to: AppliesToSchema,
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
    expires_at: z.string().datetime().optional(),
});

export const LearningSchema = z.object({
    history: z.array(KBLearningUpdateSchema),
    preferences: z.array(KBLearningPreferenceSchema),
});

// ============================================================
// COMPLETE KNOWLEDGE BASE
// ============================================================

export const KnowledgeBaseSchema = z.object({
    // Metadata
    schema_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    kb_version: z.string(),
    stage: z.enum(["pre-embeddings", "embeddings-enabled"]),

    // Core
    brand: BrandRulesSchema,
    icp_library: ICPLibrarySchema,
    offer_library: OfferLibrarySchema,

    // Content Libraries
    angles_library: AnglesLibrarySchema,
    ctas_library: CTAsLibrarySchema,
    website_library: WebsiteLibrarySchema,
    email_library: EmailLibrarySchema,
    social_library: SocialLibrarySchema,

    // Systems
    routing: RoutingSchema,
    testing: TestingConfigSchema,
    guardrails: GuardrailsSchema,
    learning: LearningSchema,
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;
export type AppliesTo = z.infer<typeof AppliesToSchema>;
export type BrandRules = z.infer<typeof BrandRulesSchema>;
export type ICPSegment = z.infer<typeof ICPSegmentSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type Angle = z.infer<typeof AngleSchema>;
export type CTA = z.infer<typeof CTASchema>;
export type PageBlueprint = z.infer<typeof PageBlueprintSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
export type EmailFlowBlueprint = z.infer<typeof EmailFlowBlueprintSchema>;
export type SubjectFirstLineVariant = z.infer<typeof SubjectFirstLineVariantSchema>;
export type ReplyPlaybook = z.infer<typeof ReplyPlaybookSchema>;
export type ReplyStrategy = z.infer<typeof ReplyStrategySchema>;
export type SocialPillar = z.infer<typeof SocialPillarSchema>;
export type SocialPostBlueprint = z.infer<typeof SocialPostBlueprintSchema>;
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;
export type VariantPolicy = z.infer<typeof VariantPolicySchema>;
export type PausedPattern = z.infer<typeof PausedPatternSchema>;
export type KBLearningPreference = z.infer<typeof KBLearningPreferenceSchema>;
export type KBLearningUpdate = z.infer<typeof KBLearningUpdateSchema>;
