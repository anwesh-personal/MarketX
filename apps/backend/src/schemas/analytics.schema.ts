import { z } from "zod";

/**
 * ANALYTICS SCHEMA
 * Maps to: 04-analytics.docx
 * 
 * Defines events tracked from all content types.
 */

// ============================================================
// ANALYTICS EVENT
// ============================================================

export const AnalyticsEventSchema = z.object({
    // Event Identity
    event_id: z.string().uuid(),
    occurred_at: z.string().datetime(),

    // Linkage to Generated Content
    run_id: z.string().uuid(), // Which run generated this content
    asset_type: z.enum(["WEBSITE", "EMAIL", "EMAIL_FLOW", "EMAIL_REPLY", "SOCIAL_POST"]),
    asset_id: z.string(), // page_id, email_id, post_id, etc.
    variant_id: z.string(), // Which variant (for A/B testing)

    // Event Type
    event_type: z.enum([
        // Website events
        "PAGE_VIEW",
        "CLICK",
        "BOUNCE",

        // Email events
        "SENT",
        "DELIVERED",
        "OPENED", // Note: Client wants to IGNORE open rate, use REPLY as proxy
        "REPLY",
        "CLICK",
        "UNSUBSCRIBE",
        "COMPLAINT",
        "BOUNCE",

        // Conversion events
        "BOOKED_CALL", // PRIMARY OUTCOME!
        "DOWNLOAD",
        "FORM_SUBMIT",

        // Social events
        "IMPRESSION",
        "ENGAGEMENT",
        "SHARE",
        "COMMENT",
        "CLICK",
    ]),

    // Context (for segment analysis)
    context: z.object({
        icp_id: z.string(),
        offer_id: z.string(),
        buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]).optional(),
        platform: z.enum(["LinkedIn", "X", "YouTube"]).optional(), // For social
    }),

    // KB Component References (what was used to generate this content)
    kb_components: z.object({
        blueprint_id: z.string().optional(),
        layout_id: z.string().optional(),
        angle_id: z.string().optional(),
        cta_id: z.string().optional(),
        strategy_id: z.string().optional(),
    }).optional(),

    // Event-Specific Data
    payload: z.record(z.any()).optional(), // Flexible for different event types

    // Attribution
    source: z.string().optional(), // e.g., "sendgrid_webhook", "website_tracker", "linkedin_api"
    user_agent: z.string().optional(),
    ip_address: z.string().optional(),
});

// ============================================================
// AGGREGATED METRICS (Computed from Events)
// ============================================================

export const AggregatedMetricsSchema = z.object({
    context: z.object({
        icp_id: z.string(),
        offer_id: z.string(),
        buyer_stage: z.enum(["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"]).optional(),
        asset_type: z.enum(["WEBSITE", "EMAIL", "EMAIL_FLOW", "EMAIL_REPLY", "SOCIAL_POST"]),
    }),

    variant_id: z.string(),

    time_window: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }),

    counts: z.object({
        // Engagement
        total_sent: z.number().int().min(0).optional(),
        total_delivered: z.number().int().min(0).optional(),
        total_opens: z.number().int().min(0).optional(),
        total_clicks: z.number().int().min(0).optional(),
        total_replies: z.number().int().min(0).optional(),

        // Conversions
        total_booked_calls: z.number().int().min(0), // PRIMARY METRIC!
        total_downloads: z.number().int().min(0).optional(),
        total_form_submits: z.number().int().min(0).optional(),

        // Negative signals
        total_bounces: z.number().int().min(0).optional(),
        total_unsubscribes: z.number().int().min(0).optional(),
        total_complaints: z.number().int().min(0).optional(),
    }),

    rates: z.object({
        // PRIMARY: Booked Call Rate (success!)
        booked_call_rate: z.number().min(0).max(1),

        // Secondary: Reply Rate (proxy for open rate, per client spec)
        reply_rate: z.number().min(0).max(1).optional(),

        // Other engagement
        click_rate: z.number().min(0).max(1).optional(),

        // Guardrails
        bounce_rate: z.number().min(0).max(1).optional(),
        unsubscribe_rate: z.number().min(0).max(1).optional(),
        complaint_rate: z.number().min(0).max(1).optional(),
    }),

    sample_size: z.number().int().min(0),
    is_statistically_significant: z.boolean().optional(),
});

// ============================================================
// WEBHOOK PAYLOADS (Inbound from External Sources)
// ============================================================

/**
 * Generic webhook event inbound from SendGrid, Mailgun, etc.
 */
export const EmailWebhookEventSchema = z.object({
    event_type: z.string(), // Provider-specific: "delivered", "open", "click", etc.
    email: z.string().email(),
    timestamp: z.number(), // Unix timestamp

    // Custom headers we inject (to link back to our system)
    custom_args: z.object({
        run_id: z.string().uuid(),
        asset_id: z.string(),
        variant_id: z.string(),
        icp_id: z.string(),
        offer_id: z.string(),
    }).optional(),

    // Provider-specific data
    provider_data: z.record(z.any()).optional(),
});

/**
 * Website tracking event (from client's website pixel)
 */
export const WebsiteTrackingEventSchema = z.object({
    event_type: z.enum(["page_view", "click", "form_submit", "booked_call"]),
    page_slug: z.string(),
    cta_id: z.string().optional(),

    // Custom data we embed in the page
    tracking_data: z.object({
        run_id: z.string().uuid(),
        page_id: z.string(),
        variant_id: z.string(),
        icp_id: z.string(),
        offer_id: z.string(),
    }),

    // Browser context
    user_agent: z.string().optional(),
    ip_address: z.string().optional(),
    referrer: z.string().optional(),

    timestamp: z.number(), // Unix timestamp
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type AggregatedMetrics = z.infer<typeof AggregatedMetricsSchema>;
export type EmailWebhookEvent = z.infer<typeof EmailWebhookEventSchema>;
export type WebsiteTrackingEvent = z.infer<typeof WebsiteTrackingEventSchema>;
