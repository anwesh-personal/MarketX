-- 00000000000027_measurement_rollups.sql
-- Materialized rollups for 12-section measurement + member portal + feature gating

-- Daily rollup per belief (Section 1-4 metrics pre-computed)
CREATE TABLE IF NOT EXISTS public.belief_daily_rollup (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      uuid NOT NULL REFERENCES public.partner(id),
    belief_id       uuid NOT NULL REFERENCES public.belief(id),
    rollup_date     date NOT NULL,

    -- Section 1: Deliverability
    sends           int NOT NULL DEFAULT 0,
    deliveries      int NOT NULL DEFAULT 0,
    bounces         int NOT NULL DEFAULT 0,
    complaints      int NOT NULL DEFAULT 0,
    bounce_rate     numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN sends > 0 THEN bounces::numeric / sends ELSE 0 END
    ) STORED,
    complaint_rate  numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN sends > 0 THEN complaints::numeric / sends ELSE 0 END
    ) STORED,

    -- Section 2: Engagement
    opens           int NOT NULL DEFAULT 0,
    clicks          int NOT NULL DEFAULT 0,
    replies         int NOT NULL DEFAULT 0,
    open_rate       numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN deliveries > 0 THEN opens::numeric / deliveries ELSE 0 END
    ) STORED,
    click_rate      numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN opens > 0 THEN clicks::numeric / opens ELSE 0 END
    ) STORED,
    reply_rate      numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN sends > 0 THEN replies::numeric / sends ELSE 0 END
    ) STORED,

    -- Section 3: Reply quality
    replies_interested   int NOT NULL DEFAULT 0,
    replies_clarification int NOT NULL DEFAULT 0,
    replies_objection    int NOT NULL DEFAULT 0,
    replies_timing       int NOT NULL DEFAULT 0,
    replies_referral     int NOT NULL DEFAULT 0,
    replies_negative     int NOT NULL DEFAULT 0,
    replies_noise        int NOT NULL DEFAULT 0,
    positive_reply_rate  numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN replies > 0 THEN (replies_interested + replies_referral)::numeric / replies ELSE 0 END
    ) STORED,

    -- Section 4: Conversion
    bookings        int NOT NULL DEFAULT 0,
    shows           int NOT NULL DEFAULT 0,
    revenue_cents   bigint NOT NULL DEFAULT 0,
    booking_rate    numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN sends > 0 THEN bookings::numeric / sends ELSE 0 END
    ) STORED,
    show_rate       numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN bookings > 0 THEN shows::numeric / bookings ELSE 0 END
    ) STORED,
    revenue_per_1k_sends numeric(10,2) GENERATED ALWAYS AS (
        CASE WHEN sends > 0 THEN (revenue_cents::numeric / 100) / (sends::numeric / 1000) ELSE 0 END
    ) STORED,

    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (belief_id, rollup_date)
);

CREATE INDEX idx_bdr_partner_date ON public.belief_daily_rollup(partner_id, rollup_date DESC);
CREATE INDEX idx_bdr_belief_date ON public.belief_daily_rollup(belief_id, rollup_date DESC);

-- Partner daily summary (aggregated across all beliefs)
CREATE TABLE IF NOT EXISTS public.partner_daily_rollup (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      uuid NOT NULL REFERENCES public.partner(id),
    rollup_date     date NOT NULL,

    total_sends     int NOT NULL DEFAULT 0,
    total_deliveries int NOT NULL DEFAULT 0,
    total_bounces   int NOT NULL DEFAULT 0,
    total_complaints int NOT NULL DEFAULT 0,
    total_opens     int NOT NULL DEFAULT 0,
    total_clicks    int NOT NULL DEFAULT 0,
    total_replies   int NOT NULL DEFAULT 0,
    total_bookings  int NOT NULL DEFAULT 0,
    total_shows     int NOT NULL DEFAULT 0,
    total_revenue_cents bigint NOT NULL DEFAULT 0,

    active_beliefs  int NOT NULL DEFAULT 0,
    active_satellites int NOT NULL DEFAULT 0,

    -- Computed rates
    bounce_rate     numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_sends > 0 THEN total_bounces::numeric / total_sends ELSE 0 END
    ) STORED,
    reply_rate      numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_sends > 0 THEN total_replies::numeric / total_sends ELSE 0 END
    ) STORED,
    booking_rate    numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_sends > 0 THEN total_bookings::numeric / total_sends ELSE 0 END
    ) STORED,
    show_rate       numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_bookings > 0 THEN total_shows::numeric / total_bookings ELSE 0 END
    ) STORED,
    revenue_per_1k  numeric(10,2) GENERATED ALWAYS AS (
        CASE WHEN total_sends > 0 THEN (total_revenue_cents::numeric / 100) / (total_sends::numeric / 1000) ELSE 0 END
    ) STORED,

    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (partner_id, rollup_date)
);

CREATE INDEX idx_pdr_partner_date ON public.partner_daily_rollup(partner_id, rollup_date DESC);

-- Member portal: feature tiers
CREATE TABLE IF NOT EXISTS public.member_portal_config (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      uuid NOT NULL REFERENCES public.partner(id),
    tier            text NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'medium', 'enterprise')),

    -- Feature flags
    can_view_metrics        boolean NOT NULL DEFAULT true,
    can_chat_brain          boolean NOT NULL DEFAULT false,
    can_train_brain         boolean NOT NULL DEFAULT false,
    can_write_emails        boolean NOT NULL DEFAULT false,
    can_feed_brain          boolean NOT NULL DEFAULT false,
    can_access_flow_builder boolean NOT NULL DEFAULT false,
    can_view_kb             boolean NOT NULL DEFAULT false,
    can_export_data         boolean NOT NULL DEFAULT false,
    can_manage_satellites   boolean NOT NULL DEFAULT false,
    can_view_agent_decisions boolean NOT NULL DEFAULT false,

    -- Limits
    max_brain_chats_per_day int NOT NULL DEFAULT 10,
    max_kb_uploads          int NOT NULL DEFAULT 0,
    max_custom_flows        int NOT NULL DEFAULT 0,

    custom_settings         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    UNIQUE (partner_id)
);

CREATE TRIGGER member_portal_config_updated_at
    BEFORE UPDATE ON public.member_portal_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed tier defaults into config_table
INSERT INTO config_table (key, value, description)
VALUES
    ('member_tier_basic', '{"can_view_metrics":true,"can_chat_brain":false,"can_train_brain":false,"can_write_emails":false,"can_feed_brain":false,"can_access_flow_builder":false,"can_view_kb":false,"can_export_data":false,"can_manage_satellites":false,"can_view_agent_decisions":false,"max_brain_chats_per_day":0,"max_kb_uploads":0,"max_custom_flows":0}'::jsonb, 'Basic tier feature flags'),
    ('member_tier_medium', '{"can_view_metrics":true,"can_chat_brain":true,"can_train_brain":true,"can_write_emails":false,"can_feed_brain":false,"can_access_flow_builder":false,"can_view_kb":true,"can_export_data":false,"can_manage_satellites":false,"can_view_agent_decisions":false,"max_brain_chats_per_day":50,"max_kb_uploads":10,"max_custom_flows":0}'::jsonb, 'Medium tier feature flags'),
    ('member_tier_enterprise', '{"can_view_metrics":true,"can_chat_brain":true,"can_train_brain":true,"can_write_emails":true,"can_feed_brain":true,"can_access_flow_builder":true,"can_view_kb":true,"can_export_data":true,"can_manage_satellites":true,"can_view_agent_decisions":true,"max_brain_chats_per_day":999,"max_kb_uploads":100,"max_custom_flows":50}'::jsonb, 'Enterprise tier feature flags')
ON CONFLICT (key) DO NOTHING;

COMMIT;
