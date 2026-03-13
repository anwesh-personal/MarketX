/**
 * Default configuration values for system thresholds.
 *
 * These should eventually be loaded from `config_table` at runtime.
 * Centralised here so every route references the same constants
 * rather than scattering magic numbers across handlers.
 */

export const DEFAULT_SUPERADMIN_SETTINGS = {
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: '',
    max_runs_per_day: 100,
    max_kb_size_mb: 50,
    enable_signups: true,
    require_email_verification: true,
    session_timeout_hours: 24,
    enable_audit_log: true,
    enable_rate_limiting: true,
    rate_limit_per_minute: 60,
} as const

export const DEFAULT_BILLING_PLAN_PRICING: Record<string, number> = {
    free: 0,
    hobby: 0,
    starter: 19,
    pro: 49,
    enterprise: 199,
}

export const DEFAULT_BILLING_TIER_WEIGHT: Record<string, number> = {
    free: 0,
    hobby: 0,
    starter: 1,
    pro: 2,
    enterprise: 3,
}

// ── Knowledge governance (revalidate) ──────────────────────────
export const KNOWLEDGE_SUSPEND_EVIDENCE_MIN = 3;
export const KNOWLEDGE_DEMOTE_STABILITY_MAX = 0.3;
export const KNOWLEDGE_DEMOTE_CONFIDENCE_MAX = 0.4;
export const KNOWLEDGE_SLOW_CYCLE_CONFIDENCE_MIN = 0.8;
export const KNOWLEDGE_SLOW_CYCLE_STABILITY_MIN = 0.7;
export const KNOWLEDGE_FAST_CYCLE_CONFIDENCE_MAX = 0.5;

// ── Knowledge governance (promote) ─────────────────────────────
export const PROMOTION_MIN_CROSS_PARTNER = 2;
export const PROMOTION_MIN_SAMPLE_SIZE = 100;
export const PROMOTION_MIN_STABILITY = 0.6;
export const PROMOTION_REVALIDATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Signal gating ──────────────────────────────────────────────
export const GATING_MIN_CONFIDENCE = 0.35;
export const GATING_MIN_BOOKED_CALL_RATE = 0.01;
export const GATING_MAX_NEGATIVE_RATE = 0.08;
export const GATING_MIN_EXPLORATION = 0.1;

// ── Satellites & deliverability ────────────────────────────────
export const SATELLITE_INITIAL_REPUTATION = 0.5;
export const DELIVERABILITY_BASE_REPUTATION = 100;
export const DELIVERABILITY_ALERT_THRESHOLD = 70;
export const DELIVERABILITY_CRITICAL_THRESHOLD = 50;
export const DELIVERABILITY_MIN_VOLUME_FOR_LOW_OPENS = 50;

// ── Agents (pre-send) ─────────────────────────────────────────
export const AGENT_DEFAULT_CONFIDENCE = 0.5;
export const AGENT_DEFAULT_REPUTATION = 100;

// ── System ─────────────────────────────────────────────────────
export const SCALE_EXPANSION_ENGAGEMENT_THRESHOLD = 0.01;
