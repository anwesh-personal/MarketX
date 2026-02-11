-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 02
-- Knowledge Base, Runs, Content, Analytics, Learning
-- Source: System A (001), database/init.sql, database/complete-setup.sql
-- ============================================================

-- ============================================================
-- KNOWLEDGE BASES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255),
    version INTEGER DEFAULT 1,
    stage VARCHAR(20) CHECK (stage IN ('pre-embeddings', 'embeddings-enabled')),
    data JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_org_id ON knowledge_bases(org_id);
CREATE INDEX IF NOT EXISTS idx_kb_active ON knowledge_bases(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kb_version ON knowledge_bases(version);
CREATE INDEX IF NOT EXISTS idx_kb_created_at ON knowledge_bases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_brand ON knowledge_bases USING gin ((data->'brand'));
CREATE INDEX IF NOT EXISTS idx_kb_icps ON knowledge_bases USING gin ((data->'icp_library'->'segments'));
CREATE INDEX IF NOT EXISTS idx_kb_offers ON knowledge_bases USING gin ((data->'offer_library'->'offers'));

COMMENT ON TABLE knowledge_bases IS 'Stores validated Knowledge Base JSON documents';

-- ============================================================
-- RUNS
-- ============================================================
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(id),
    run_type VARCHAR(20) CHECK (run_type IN ('ON_DEMAND', 'DAILY_SCHEDULED', 'MANUAL_OVERRIDE')),
    kb_version VARCHAR(50),
    input_snapshot JSONB,
    output_snapshot JSONB,
    writer_input JSONB,
    writer_output JSONB,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL', 'pending', 'running', 'completed', 'failed')),
    triggered_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_window_start TIMESTAMPTZ,
    time_window_end TIMESTAMPTZ,
    execution_time_ms INTEGER,
    errors JSONB,
    error_message TEXT,
    summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_org_id ON runs(org_id);
CREATE INDEX IF NOT EXISTS idx_runs_kb_id ON runs(kb_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_type ON runs(run_type);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);

COMMENT ON TABLE runs IS 'Execution log for all system runs (Writer + Analytics + Learning)';

-- ============================================================
-- GENERATED CONTENT
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    content_type VARCHAR(20) CHECK (content_type IN ('PAGE', 'EMAIL', 'EMAIL_FLOW', 'EMAIL_REPLY', 'SOCIAL_POST')),
    variant_id VARCHAR(100),
    icp_id VARCHAR(100),
    offer_id VARCHAR(100),
    buyer_stage VARCHAR(20) CHECK (buyer_stage IN ('AWARENESS', 'CONSIDERATION', 'EVALUATION', 'RISK_RESOLUTION', 'READY')),
    blueprint_id VARCHAR(100),
    layout_id VARCHAR(100),
    angle_id VARCHAR(100),
    cta_id VARCHAR(100),
    strategy_id VARCHAR(100),
    content_data JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    paused_at TIMESTAMPTZ,
    pause_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_run ON generated_content(run_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON generated_content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_variant ON generated_content(variant_id);
CREATE INDEX IF NOT EXISTS idx_content_context ON generated_content(icp_id, offer_id, buyer_stage);
CREATE INDEX IF NOT EXISTS idx_content_active ON generated_content(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_generated_at ON generated_content(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_data ON generated_content USING gin (content_data);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID REFERENCES runs(id),
    content_id UUID REFERENCES generated_content(id),
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    asset_type VARCHAR(20) CHECK (asset_type IN ('WEBSITE', 'EMAIL', 'EMAIL_FLOW', 'EMAIL_REPLY', 'SOCIAL_POST')),
    variant_id VARCHAR(100),
    icp_id VARCHAR(100),
    offer_id VARCHAR(100),
    buyer_stage VARCHAR(20),
    platform VARCHAR(50),
    payload JSONB,
    event_data JSONB,
    source VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    idempotency_key VARCHAR(255) UNIQUE,
    is_duplicate BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org_id ON analytics_events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_content ON analytics_events(content_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_run ON analytics_events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at DESC);

-- ============================================================
-- AGGREGATED METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS aggregated_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_window_start TIMESTAMPTZ NOT NULL,
    time_window_end TIMESTAMPTZ NOT NULL,
    icp_id VARCHAR(100) NOT NULL,
    offer_id VARCHAR(100) NOT NULL,
    buyer_stage VARCHAR(20),
    asset_type VARCHAR(20) NOT NULL,
    variant_id VARCHAR(100) NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_booked_calls INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_unsubscribes INTEGER DEFAULT 0,
    total_complaints INTEGER DEFAULT 0,
    booked_call_rate DECIMAL(5,4),
    reply_rate DECIMAL(5,4),
    click_rate DECIMAL(5,4),
    bounce_rate DECIMAL(5,4),
    unsubscribe_rate DECIMAL(5,4),
    complaint_rate DECIMAL(5,4),
    sample_size INTEGER NOT NULL DEFAULT 0,
    is_statistically_significant BOOLEAN,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_aggregation UNIQUE (time_window_start, time_window_end, icp_id, offer_id, buyer_stage, asset_type, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_metrics_window ON aggregated_metrics(time_window_start, time_window_end);
CREATE INDEX IF NOT EXISTS idx_metrics_context ON aggregated_metrics(icp_id, offer_id, buyer_stage, asset_type);
CREATE INDEX IF NOT EXISTS idx_metrics_booked_call_rate ON aggregated_metrics(booked_call_rate DESC NULLS LAST);

COMMENT ON COLUMN aggregated_metrics.booked_call_rate IS 'PRIMARY SUCCESS METRIC per client spec';

-- ============================================================
-- LEARNING HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES runs(id),
    mutation_type VARCHAR(50) NOT NULL CHECK (mutation_type IN ('PROMOTION', 'DEMOTION', 'PAUSE', 'RESUME')),
    context JSONB NOT NULL DEFAULT '{}',
    variant_id VARCHAR(100),
    pattern_type VARCHAR(50),
    pattern_id VARCHAR(100),
    reason TEXT NOT NULL,
    evidence JSONB,
    kb_version_before VARCHAR(50),
    kb_version_after VARCHAR(50),
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_executed_at ON learning_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_run ON learning_history(run_id);
CREATE INDEX IF NOT EXISTS idx_learning_type ON learning_history(mutation_type);

-- ============================================================
-- LEARNING RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(id),
    rule_type VARCHAR(100) NOT NULL,
    condition JSONB NOT NULL,
    action JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_rules_org_id ON learning_rules(org_id);

-- ============================================================
-- OPS CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS ops_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ops_active ON ops_config(is_active) WHERE is_active = true;

-- ============================================================
-- SYSTEM LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    module VARCHAR(100),
    message TEXT NOT NULL,
    context JSONB,
    error_stack TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_logged_at ON system_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_module ON system_logs(module);
