-- ============================================================
-- AXIOM ENGINE - RS:OS CANONICAL CORE TABLES
-- Phase A: Data Canonicalization
-- ============================================================

BEGIN;

-- Ensure shared updated_at trigger helper exists (defensive for manual execution).
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Partner (mapped 1:1 with organizations)
CREATE TABLE IF NOT EXISTS partner (
    id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    legal_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_status ON partner(status);

-- 2) Offer
CREATE TABLE IF NOT EXISTS offer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    primary_promise TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_partner_id ON offer(partner_id);
CREATE INDEX IF NOT EXISTS idx_offer_status ON offer(status);

-- 3) ICP (RS:OS canonical)
CREATE TABLE IF NOT EXISTS icp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offer(id) ON DELETE SET NULL,
    external_icp_id UUID UNIQUE,
    name TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icp_partner_id ON icp(partner_id);
CREATE INDEX IF NOT EXISTS idx_icp_offer_id ON icp(offer_id);
CREATE INDEX IF NOT EXISTS idx_icp_external_icp_id ON icp(external_icp_id);

-- 4) Brief
CREATE TABLE IF NOT EXISTS brief (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
    icp_id UUID NOT NULL REFERENCES icp(id) ON DELETE CASCADE,
    title TEXT,
    hypothesis TEXT NOT NULL,
    locked_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_partner_id ON brief(partner_id);
CREATE INDEX IF NOT EXISTS idx_brief_offer_icp ON brief(offer_id, icp_id);

-- 5) Belief
CREATE TABLE IF NOT EXISTS belief (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    brief_id UUID NOT NULL REFERENCES brief(id) ON DELETE CASCADE,
    icp_id UUID NOT NULL REFERENCES icp(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
    angle TEXT,
    statement TEXT NOT NULL,
    lane TEXT NOT NULL DEFAULT 'challenger' CHECK (lane IN ('champion', 'challenger')),
    status TEXT NOT NULL DEFAULT 'HYP' CHECK (status IN ('HYP', 'TEST', 'SW', 'IW', 'RW', 'GW', 'PAUSED')),
    confidence_score NUMERIC(6,5) NOT NULL DEFAULT 0,
    allocation_weight NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_belief_partner_status ON belief(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_belief_brief_id ON belief(brief_id);
CREATE INDEX IF NOT EXISTS idx_belief_offer_icp ON belief(offer_id, icp_id);

-- 6) Belief competition pair
CREATE TABLE IF NOT EXISTS belief_competition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    brief_id UUID NOT NULL REFERENCES brief(id) ON DELETE CASCADE,
    champion_belief_id UUID NOT NULL REFERENCES belief(id) ON DELETE CASCADE,
    challenger_belief_id UUID NOT NULL REFERENCES belief(id) ON DELETE CASCADE,
    allocation_champion NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    allocation_challenger NUMERIC(6,5) NOT NULL DEFAULT 0.5,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (champion_belief_id <> challenger_belief_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_belief_competition_unique_pair
    ON belief_competition(champion_belief_id, challenger_belief_id);
CREATE INDEX IF NOT EXISTS idx_belief_competition_brief_active
    ON belief_competition(brief_id, active);

-- 7) Flow
CREATE TABLE IF NOT EXISTS flow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
    icp_id UUID NOT NULL REFERENCES icp(id) ON DELETE CASCADE,
    belief_id UUID NOT NULL REFERENCES belief(id) ON DELETE CASCADE,
    version_no INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_partner_status ON flow(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_flow_belief_id ON flow(belief_id);

-- 8) Flow steps
CREATE TABLE IF NOT EXISTS flow_step (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID NOT NULL REFERENCES flow(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    subject_a TEXT,
    subject_b TEXT,
    body_html TEXT,
    body_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(flow_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_flow_step_flow_id ON flow_step(flow_id);

-- 9) Asset
CREATE TABLE IF NOT EXISTS asset (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offer(id) ON DELETE SET NULL,
    icp_id UUID REFERENCES icp(id) ON DELETE SET NULL,
    brief_id UUID REFERENCES brief(id) ON DELETE SET NULL,
    belief_id UUID REFERENCES belief(id) ON DELETE SET NULL,
    flow_id UUID REFERENCES flow(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('email', 'landing_page', 'social_post', 'ad_copy', 'other')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_partner_type ON asset(partner_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_brief_belief ON asset(brief_id, belief_id);

-- 10) Signal event
CREATE TABLE IF NOT EXISTS signal_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offer(id) ON DELETE SET NULL,
    icp_id UUID REFERENCES icp(id) ON DELETE SET NULL,
    brief_id UUID REFERENCES brief(id) ON DELETE SET NULL,
    belief_id UUID REFERENCES belief(id) ON DELETE SET NULL,
    flow_id UUID REFERENCES flow(id) ON DELETE SET NULL,
    flow_step_id UUID REFERENCES flow_step(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('send', 'reply', 'click', 'booking', 'show', 'revenue', 'bounce', 'complaint', 'open')),
    event_value NUMERIC(14,2),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signal_event_partner_time ON signal_event(partner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_event_type_time ON signal_event(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_event_belief_time ON signal_event(belief_id, occurred_at DESC);

-- 11) Config table (thresholds + formulas)
CREATE TABLE IF NOT EXISTS config_table (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12) Promotion snapshots/logs
CREATE TABLE IF NOT EXISTS belief_gate_snapshot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    belief_id UUID NOT NULL REFERENCES belief(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS belief_promotion_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    belief_id UUID NOT NULL REFERENCES belief(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    reason TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_belief_gate_snapshot_belief ON belief_gate_snapshot(belief_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_belief_promotion_log_belief ON belief_promotion_log(belief_id, created_at DESC);

-- updated_at triggers
DROP TRIGGER IF EXISTS trigger_update_partner_timestamp ON partner;
CREATE TRIGGER trigger_update_partner_timestamp
BEFORE UPDATE ON partner
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_offer_timestamp ON offer;
CREATE TRIGGER trigger_update_offer_timestamp
BEFORE UPDATE ON offer
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_icp_timestamp ON icp;
CREATE TRIGGER trigger_update_icp_timestamp
BEFORE UPDATE ON icp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_brief_timestamp ON brief;
CREATE TRIGGER trigger_update_brief_timestamp
BEFORE UPDATE ON brief
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_belief_timestamp ON belief;
CREATE TRIGGER trigger_update_belief_timestamp
BEFORE UPDATE ON belief
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_belief_competition_timestamp ON belief_competition;
CREATE TRIGGER trigger_update_belief_competition_timestamp
BEFORE UPDATE ON belief_competition
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_flow_timestamp ON flow;
CREATE TRIGGER trigger_update_flow_timestamp
BEFORE UPDATE ON flow
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_flow_step_timestamp ON flow_step;
CREATE TRIGGER trigger_update_flow_step_timestamp
BEFORE UPDATE ON flow_step
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_asset_timestamp ON asset;
CREATE TRIGGER trigger_update_asset_timestamp
BEFORE UPDATE ON asset
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_config_table_timestamp ON config_table;
CREATE TRIGGER trigger_update_config_table_timestamp
BEFORE UPDATE ON config_table
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- seed baseline config keys if absent
INSERT INTO config_table (key, value, description)
VALUES
  ('confidence_formula_v1', '{"weights":{"booked_call_rate":0.4,"positive_reply_rate":0.3,"reply_quality":0.2,"negative_reply_rate":0.1}}'::jsonb, 'Baseline confidence formula weights'),
  ('allocation_min_exploration', '{"value":0.1}'::jsonb, 'Minimum exploration allocation'),
  ('promotion_min_sample_size', '{"value":50}'::jsonb, 'Minimum sample size before promotion checks'),
  ('send_pacing_daily_cap', '{"value":3000}'::jsonb, 'Per satellite daily cap')
ON CONFLICT (key) DO NOTHING;

COMMIT;
