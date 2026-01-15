import { z } from "zod";

// 05-Learning-Loop: Analytics Event
export const AnalyticsEventSchema = z.object({
    event_type: z.enum(["BOOKED_CALL", "REPLY", "CLICK", "BOUNCE"]),
    variant_id: z.string(),
    payload: z.record(z.any()).optional(),
    occurred_at: z.string(), // ISO timestamp
});

// Learning Policies
export const WinnerPolicySchema = z.object({
    primary_outcome: z.literal("BOOKED_CALL"),
    threshold: z.number().min(1), // At least 1 booked call
});

export const LoserPolicySchema = z.object({
    metric: z.literal("bounce_rate"),
    threshold: z.number().max(0.15), // Max 15% bounce rate
});

// Promotion/Demotion Directives
export const PromoteDirectiveSchema = z.object({
    variant_id: z.string(),
    preference_type: z.string(),
    reason: z.string(),
});

export const PauseDirectiveSchema = z.object({
    variant_id: z.string(),
    pattern: z.string(),
    reason: z.string(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type PromoteDirective = z.infer<typeof PromoteDirectiveSchema>;
export type PauseDirective = z.infer<typeof PauseDirectiveSchema>;
