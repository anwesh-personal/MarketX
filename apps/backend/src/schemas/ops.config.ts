import { z } from "zod";

/**
 * OPS CONFIGURATION SCHEMA
 * Maps to: 07-ops.docx
 * 
 * Defines operational settings: scheduling, throttles, guardrails, execution modes.
 */

// ============================================================
// SCHEDULE
// ============================================================

export const ScheduleConfigSchema = z.object({
    timezone: z.literal("America/New_York"), // MUST be Eastern Time per client spec!
    daily_run_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), // HH:MM format, e.g., "06:00"
    enabled: z.boolean().default(true),
});

// ============================================================
// RUN WINDOWS
// ============================================================

export const RunWindowsConfigSchema = z.object({
    default_input_window: z.literal("PREVIOUS_CALENDAR_DAY"), // V1 restriction per client
    custom_ranges_allowed: z.boolean().default(false), // V1: false, Phase 2: true
});

// ============================================================
// THROTTLES (Rate Limiting)
// ============================================================

export const ThrottlesConfigSchema = z.object({
    max_new_variants_per_day: z.number().int().min(0).default(10),
    max_promotions_per_context: z.number().int().min(0).default(3),
    max_demotions_per_context: z.number().int().min(0).default(2),
    max_pauses_per_day: z.number().int().min(0).default(5),
});

// ============================================================
// GUARDRAILS (Safety Thresholds)
// ============================================================

export const GuardrailThresholdsSchema = z.object({
    bounce_rate_max: z.number().min(0).max(1).default(0.15), // 15%
    unsubscribe_rate_max: z.number().min(0).max(1).default(0.02), // 2%
    complaint_rate_max: z.number().min(0).max(1).default(0.001), // 0.1%
});

export const CooldownPolicySchema = z.object({
    cooldown_days_after_pause: z.number().int().min(0).default(7),
    auto_resume_allowed: z.boolean().default(false), // V1: manual resume only
});

export const GuardrailsConfigSchema = z.object({
    pause_on_threshold_breach: z.boolean().default(true),
    thresholds: GuardrailThresholdsSchema,
    cooldown_policy: CooldownPolicySchema,
});

// ============================================================
// EXECUTION MODES (Enable/Disable Modules)
// ============================================================

export const ModeConfigSchema = z.object({
    enabled: z.boolean(),
    notes: z.string().optional(),
});

export const ExecutionModesConfigSchema = z.object({
    writer: ModeConfigSchema,
    analytics: ModeConfigSchema,
    learning_loop: ModeConfigSchema,
});

// ============================================================
// EXPORTS (Output Formats)
// ============================================================

export const ExportsConfigSchema = z.object({
    output_dir: z.string().default("./generated"),
    formats: z.array(z.enum(["JSON", "MARKDOWN", "HTML"])).min(1).default(["JSON", "MARKDOWN"]),
    emit_examples: z.boolean().default(true), // Output example valid payloads
});

// ============================================================
// LOGGING
// ============================================================

export const LoggingConfigSchema = z.object({
    level: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).default("INFO"),
    retain_days: z.number().int().min(1).default(90),
    include_raw_source_payloads: z.boolean().default(false),
    structured_format: z.boolean().default(true), // JSON logs
});

// ============================================================
// COMPLETE OPS CONFIGURATION
// ============================================================

export const OpsConfigSchema = z.object({
    schema_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),

    schedule: ScheduleConfigSchema,
    run_windows: RunWindowsConfigSchema,
    throttles: ThrottlesConfigSchema,
    guardrails: GuardrailsConfigSchema,
    execution_modes: ExecutionModesConfigSchema,
    exports: ExportsConfigSchema,
    logging: LoggingConfigSchema,
});

// ============================================================
// MANUAL RUN OVERRIDE
// ============================================================

export const ManualRunOverrideSchema = z.object({
    force_run_id: z.string().uuid().optional(),
    override_time_window: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }).optional(),
    skip_throttles: z.boolean().default(false), // Emergency override
    execution_modes_override: ExecutionModesConfigSchema.optional(),
});

// ============================================================
// RUN METADATA (Created for Each Run)
// ============================================================

export const RunMetadataSchema = z.object({
    run_id: z.string().uuid(),
    run_type: z.enum(["DAILY_SCHEDULED", "ON_DEMAND", "MANUAL_OVERRIDE"]),
    triggered_by: z.string().optional(), // User ID for manual runs
    triggered_at: z.string().datetime(),

    time_window: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
    }),

    kb_version: z.string(),
    ops_config_version: z.string(),

    execution_modes: ExecutionModesConfigSchema,

    status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "PARTIAL"]),

    started_at: z.string().datetime().optional(),
    completed_at: z.string().datetime().optional(),

    errors: z.array(z.object({
        module: z.string(),
        error_type: z.string(),
        message: z.string(),
        stack: z.string().optional(),
    })).optional(),

    summary: z.object({
        writer_outputs: z.number().int().default(0),
        analytics_events_processed: z.number().int().default(0),
        kb_mutations: z.number().int().default(0),
    }).optional(),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type OpsConfig = z.infer<typeof OpsConfigSchema>;
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export type RunWindowsConfig = z.infer<typeof RunWindowsConfigSchema>;
export type ThrottlesConfig = z.infer<typeof ThrottlesConfigSchema>;
export type GuardrailsConfig = z.infer<typeof GuardrailsConfigSchema>;
export type GuardrailThresholds = z.infer<typeof GuardrailThresholdsSchema>;
export type CooldownPolicy = z.infer<typeof CooldownPolicySchema>;
export type ExecutionModesConfig = z.infer<typeof ExecutionModesConfigSchema>;
export type ModeConfig = z.infer<typeof ModeConfigSchema>;
export type ExportsConfig = z.infer<typeof ExportsConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type ManualRunOverride = z.infer<typeof ManualRunOverrideSchema>;
export type RunMetadata = z.infer<typeof RunMetadataSchema>;
