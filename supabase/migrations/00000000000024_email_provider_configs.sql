-- 00000000000024_email_provider_configs.sql
-- Modular email provider configuration: per-org or global, any provider type

CREATE TABLE IF NOT EXISTS public.email_provider_configs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id          uuid REFERENCES public.partner(id),
    scope               text NOT NULL DEFAULT 'organization' CHECK (scope IN ('global', 'organization')),
    provider_type       text NOT NULL CHECK (provider_type IN (
        'mailwizz', 'mailgun', 'ses', 'sendgrid', 'postmark', 'sparkpost', 'smtp', 'custom'
    )),
    display_name        text NOT NULL,
    is_active           boolean NOT NULL DEFAULT false,
    is_default          boolean NOT NULL DEFAULT false,
    priority            int NOT NULL DEFAULT 0,

    -- Connection credentials (encrypted at rest via Supabase vault in production)
    api_base_url        text,
    api_key             text,
    api_secret          text,
    api_token           text,
    smtp_host           text,
    smtp_port           int,
    smtp_username       text,
    smtp_password       text,
    smtp_encryption     text CHECK (smtp_encryption IS NULL OR smtp_encryption IN ('tls', 'ssl', 'starttls', 'none')),

    -- Webhook configuration
    webhook_url         text,
    webhook_secret      text,
    webhook_events      jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Provider-specific settings
    provider_settings   jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Operational limits (overridable per provider instance)
    max_sends_per_day   int,
    max_sends_per_hour  int,
    max_batch_size      int DEFAULT 500,
    rate_limit_per_second int DEFAULT 10,

    -- Warmup configuration
    warmup_enabled      boolean NOT NULL DEFAULT true,
    warmup_start_volume int NOT NULL DEFAULT 50,
    warmup_increment_pct numeric(5,2) NOT NULL DEFAULT 20.00,
    warmup_target_days  int NOT NULL DEFAULT 21,

    -- Health tracking
    last_health_check   timestamptz,
    health_status       text NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
    consecutive_failures int NOT NULL DEFAULT 0,
    total_sent          bigint NOT NULL DEFAULT 0,
    total_bounced       bigint NOT NULL DEFAULT 0,
    total_complained    bigint NOT NULL DEFAULT 0,

    -- Metadata
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_by          uuid REFERENCES auth.users(id),

    CONSTRAINT unique_default_per_scope UNIQUE NULLS NOT DISTINCT (partner_id, scope, is_default) 
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_epc_partner ON public.email_provider_configs(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX idx_epc_scope ON public.email_provider_configs(scope, is_active);
CREATE INDEX idx_epc_provider_type ON public.email_provider_configs(provider_type);

CREATE TRIGGER email_provider_configs_updated_at
    BEFORE UPDATE ON public.email_provider_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Platform operational settings: all knobs that were previously hardcoded
-- These live in config_table with well-known keys. Seed any missing ones.
INSERT INTO config_table (key, value, description)
VALUES
    ('send_pacing_global_daily_cap', '{"value":3000,"unit":"emails/satellite/day"}'::jsonb,
     'Global maximum sends per satellite per day'),
    ('send_pacing_warmup_min_volume', '{"value":10,"unit":"emails"}'::jsonb,
     'Minimum volume floor during warmup ramp'),
    ('send_pacing_warmup_default_days', '{"value":21,"unit":"days"}'::jsonb,
     'Default number of warmup days for new satellites'),
    ('send_pacing_ramp_strategy', '{"value":"linear","options":["linear","exponential","step"]}'::jsonb,
     'Warmup ramp strategy type'),
    ('deliverability_bounce_rate_warning', '{"value":0.03,"unit":"ratio"}'::jsonb,
     'Bounce rate threshold that triggers a warning alert'),
    ('deliverability_bounce_rate_critical', '{"value":0.08,"unit":"ratio"}'::jsonb,
     'Bounce rate threshold that triggers a critical alert and auto-pause'),
    ('deliverability_complaint_rate_warning', '{"value":0.001,"unit":"ratio"}'::jsonb,
     'Complaint rate threshold for warning'),
    ('deliverability_complaint_rate_critical', '{"value":0.005,"unit":"ratio"}'::jsonb,
     'Complaint rate threshold for critical alert'),
    ('deliverability_open_rate_low', '{"value":0.10,"unit":"ratio"}'::jsonb,
     'Open rate below which low-engagement flag is raised'),
    ('deliverability_reputation_penalty_bounce', '{"value":5,"unit":"points_per_pct"}'::jsonb,
     'Reputation score penalty per percentage point of bounce rate'),
    ('deliverability_reputation_penalty_complaint', '{"value":15,"unit":"points_per_pct"}'::jsonb,
     'Reputation score penalty per percentage point of complaint rate'),
    ('deliverability_auto_pause_reputation', '{"value":40,"unit":"score"}'::jsonb,
     'Reputation score below which satellite auto-pauses'),
    ('domain_default_warmup_days', '{"value":21,"unit":"days"}'::jsonb,
     'Default domain warmup duration'),
    ('domain_max_satellites_per_domain', '{"value":10,"unit":"count"}'::jsonb,
     'Maximum satellites allowed per sending domain'),
    ('domain_max_domains_per_org', '{"value":20,"unit":"count"}'::jsonb,
     'Maximum sending domains per organization'),
    ('allocation_step_size', '{"value":0.10,"unit":"ratio"}'::jsonb,
     'Step size for belief allocation rebalancing'),
    ('promotion_min_confidence', '{"value":0.60,"unit":"score"}'::jsonb,
     'Minimum confidence score required for belief promotion gate'),
    ('promotion_negative_rate_max', '{"value":0.25,"unit":"ratio"}'::jsonb,
     'Maximum negative reply rate allowed for promotion gate pass'),
    ('promotion_booked_call_rate_min', '{"value":0.02,"unit":"ratio"}'::jsonb,
     'Minimum booked call rate for promotion gate pass'),
    ('refinery_mta_provider', '{"value":"mailwizz"}'::jsonb,
     'Default MTA Provider backend used by Refinery Nexus'),
    ('refinery_mta_base_url', '{"value":"https://mw.refinerynexus.com/api"}'::jsonb,
     'Base URL for the MTA Provider API backend (e.g. MailWizz API)')
ON CONFLICT (key) DO NOTHING;

COMMIT;
