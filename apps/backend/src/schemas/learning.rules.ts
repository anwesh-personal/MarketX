import { z } from "zod";

/**
 * LEARNING LOOP SCHEMA
 * Maps to: 05-learning-loop.docx
 * 
 * Defines how the system learns from analytics and updates the KB.
 */

// ============================================================
// CONTEXT FOR LEARNING
// ============================================================

export const LearningContextSchema = z.object({
    icp_id: z.string().optional(),
    offer_id: z.string().optional(),
    buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]).optional(),
    asset_type: z.enum(["WEBSITE", "EMAIL_FLOW", "EMAIL", "EMAIL_REPLY", "SOCIAL_POST"]).optional(),
    page_type: z.string().optional(),
    platform: z.enum(["LinkedIn", "X", "YouTube"]).optional(),
});

// ============================================================
// LEARNING POLICIES
// ============================================================

export const PromotionPolicySchema = z.object({
    method: z.enum(["TOP_N", "THRESHOLD"]),
    max_winners_per_context: z.number().int().min(1).default(3),
    primary_threshold: z.number().min(0).optional(), // e.g., 0.05 = 5% booked call rate
});

export const DemotionPolicySchema = z.object({
    method: z.enum(["BOTTOM_N", "THRESHOLD"]),
    max_losers_per_context: z.number().int().min(1).default(2),
    primary_threshold: z.number().min(0).optional(),
});

export const SafetyPolicySchema = z.object({
    guardrail_kill_enabled: z.boolean().default(true),
    kill_thresholds: z.object({
        bounce_rate_max: z.number().min(0).max(1).default(0.15), // 15% max bounce rate
        unsubscribe_rate_max: z.number().min(0).max(1).default(0.02), // 2% max unsub rate
        complaint_rate_max: z.number().min(0).max(1).default(0.001), // 0.1% max complaint rate
    }),
});

export const LearningPoliciesSchema = z.object({
    promotion_policy: PromotionPolicySchema,
    demotion_policy: DemotionPolicySchema,
    safety_policy: SafetyPolicySchema,
});

// ============================================================
// LEARNING RULES
// ============================================================

export const LearningRuleInputsSchema = z.object({
    metric_window_days: z.number().int().min(1).default(7),
    min_sample_size: z.number().int().min(1).default(100),
    signals: z.array(z.enum([
        "BOOKED_CALLS",
        "BOOKED_CALL_RATE",
        "REPLIES",
        "REPLY_RATE",
        "CLICKS",
        "CLICK_RATE",
        "BOUNCE_RATE",
        "UNSUBSCRIBE_RATE",
        "COMPLAINT_RATE",
    ])).min(1),
});

export const LearningRuleSelectionSchema = z.object({
    method: z.enum(["TOP_N", "BOTTOM_N", "THRESHOLD"]),
    n: z.number().int().min(1).optional(), // For TOP_N or BOTTOM_N
    primary_signal: z.enum([
        "BOOKED_CALLS",
        "BOOKED_CALL_RATE",
        "REPLIES",
        "REPLY_RATE",
        "CLICKS",
        "CLICK_RATE",
    ]),
    threshold_value: z.number().optional(), // For THRESHOLD method
});

export const LearningRuleOutputSchema = z.object({
    create_kb_preferences: z.array(z.object({
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
        applies_to: LearningContextSchema,
    })).optional(),

    pause_patterns: z.array(z.object({
        pattern_type: z.enum([
            "PAGE_BLUEPRINT",
            "LAYOUT",
            "FLOW_BLUEPRINT",
            "REPLY_STRATEGY",
            "SUBJECT_FIRSTLINE",
            "SOCIAL_BLUEPRINT",
        ]),
        reason_template: z.string(),
    })).optional(),
});

export const LearningRuleSchema = z.object({
    rule_id: z.string(),
    rule_name: z.string(),
    enabled: z.boolean().default(true),

    context: LearningContextSchema,
    inputs: LearningRuleInputsSchema,
    selection: LearningRuleSelectionSchema,
    outputs: LearningRuleOutputSchema,
});

// ============================================================
// LEARNING ACTIONS
// ============================================================

export const LearningActionConditionSchema = z.object({
    bounce_rate_gt: z.number().min(0).max(1).optional(),
    unsubscribe_rate_gt: z.number().min(0).max(1).optional(),
    complaint_rate_gt: z.number().min(0).max(1).optional(),
    booked_call_rate_lt: z.number().min(0).max(1).optional(),
    sample_size_lt: z.number().int().min(0).optional(),
});

export const LearningActionEffectSchema = z.object({
    type: z.enum(["PAUSE_PATTERN", "CREATE_PREFERENCE", "SEND_ALERT"]),
    pattern_type: z.enum([
        "PAGE_BLUEPRINT",
        "LAYOUT",
        "FLOW_BLUEPRINT",
        "REPLY_STRATEGY",
        "SUBJECT_FIRSTLINE",
        "SOCIAL_BLUEPRINT",
    ]).optional(),
    preference_type: z.enum([
        "PREFER_ANGLE",
        "PREFER_CTA",
        "PREFER_PAGE_TYPE",
        "PREFER_LAYOUT",
        "PREFER_FLOW_BLUEPRINT",
        "PREFER_REPLY_STRATEGY",
        "PREFER_SUBJECT_FIRSTLINE",
        "PREFER_SOCIAL_BLUEPRINT",
    ]).optional(),
    reason_template: z.string(),
    alert_channel: z.enum(["EMAIL", "SLACK", "WEBHOOK"]).optional(),
});

export const LearningActionSchema = z.object({
    action_id: z.string(),
    action_name: z.string(),
    trigger: z.enum(["GUARDRAIL_BREACH", "PERFORMANCE_THRESHOLD", "SAMPLE_SIZE_REACHED"]),
    condition: LearningActionConditionSchema,
    effects: z.array(LearningActionEffectSchema).min(1),
});

// ============================================================
// COMPLETE LEARNING CONFIGURATION
// ============================================================

export const LearningConfigSchema = z.object({
    schema_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),

    config: z.object({
        policies: LearningPoliciesSchema,
        rules: z.array(LearningRuleSchema).min(1),
        actions: z.array(LearningActionSchema).min(1),
    }),
});

// ============================================================
// LEARNING RUN RESULTS (Output of Learning Loop)
// ============================================================

export const PromotionResultSchema = z.object({
    variant_id: z.string(),
    preference_type: z.string(),
    context: LearningContextSchema,
    reason: z.string(),
    evidence: z.object({
        metric: z.string(),
        value: z.number(),
        sample_size: z.number().int(),
    }),
});

export const DemotionResultSchema = z.object({
    variant_id: z.string(),
    context: LearningContextSchema,
    reason: z.string(),
    evidence: z.object({
        metric: z.string(),
        value: z.number(),
        sample_size: z.number().int(),
    }),
});

export const GuardrailKillSchema = z.object({
    pattern_id: z.string(),
    pattern_type: z.string(),
    reason: z.string(),
    breached_threshold: z.object({
        metric: z.string(),
        actual_value: z.number(),
        threshold: z.number(),
    }),
});

export const LearningRunResultsSchema = z.object({
    run_id: z.string().uuid(),
    executed_at: z.string().datetime(),
    time_window: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }),

    promotions: z.array(PromotionResultSchema),
    demotions: z.array(DemotionResultSchema),
    guardrail_kills: z.array(GuardrailKillSchema),

    kb_mutations: z.object({
        preferences_added: z.number().int(),
        patterns_paused: z.number().int(),
    }),

    summary: z.string(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type LearningConfig = z.infer<typeof LearningConfigSchema>;
export type LearningContext = z.infer<typeof LearningContextSchema>;
export type LearningPolicies = z.infer<typeof LearningPoliciesSchema>;
export type PromotionPolicy = z.infer<typeof PromotionPolicySchema>;
export type DemotionPolicy = z.infer<typeof DemotionPolicySchema>;
export type SafetyPolicy = z.infer<typeof SafetyPolicySchema>;
export type LearningRule = z.infer<typeof LearningRuleSchema>;
export type LearningAction = z.infer<typeof LearningActionSchema>;
export type LearningRunResults = z.infer<typeof LearningRunResultsSchema>;
export type PromotionResult = z.infer<typeof PromotionResultSchema>;
export type DemotionResult = z.infer<typeof DemotionResultSchema>;
export type GuardrailKill = z.infer<typeof GuardrailKillSchema>;
