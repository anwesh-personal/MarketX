-- ============================================================
-- AXIOM ENGINE - PRODUCTION DATABASE SCHEMA
-- Target: Supabase PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. KNOWLEDGE BASES
-- The single source of truth for all content generation rules
-- ============================================================

CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL,
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('pre-embeddings', 'embeddings-enabled')),
    data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT only_one_active CHECK (
        NOT is_active OR 
        (SELECT COUNT(*) FROM knowledge_bases WHERE is_active = true) <= 1
    )
);

-- Indexes
CREATE INDEX idx_kb_active ON knowledge_bases(is_active) WHERE is_active = true;
CREATE INDEX idx_kb_version ON knowledge_bases(version);
CREATE INDEX idx_kb_created_at ON knowledge_bases(created_at DESC);

-- JSONB indexes for fast queries
CREATE INDEX idx_kb_brand ON knowledge_bases USING gin ((data->'brand'));
CREATE INDEX idx_kb_icps ON knowledge_bases USING gin ((data->'icp_library'->'segments'));
CREATE INDEX idx_kb_offers ON knowledge_bases USING gin ((data->'offer_library'->'offers'));

-- Comments
COMMENT ON TABLE knowledge_bases IS 'Stores validated Knowledge Base JSON documents';
COMMENT ON COLUMN knowledge_bases.data IS 'Complete KB JSON validated against kb.schema.ts';
COMMENT ON COLUMN knowledge_bases.is_active IS 'Only one KB can be active at a time';

-- ============================================================
-- 2. RUNS
-- Execution log for Writer, Analytics, and Learning Loop runs
-- ============================================================

CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_type VARCHAR(20) NOT NULL CHECK (run_type IN ('ON_DEMAND', 'DAILY_SCHEDULED', 'MANUAL_OVERRIDE')),
    kb_version VARCHAR(50) NOT NULL,
    
    -- Input/Output snapshots
    input_snapshot JSONB NOT NULL,
    output_snapshot JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL')),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Execution context
    triggered_by VARCHAR(255),
    time_window_start TIMESTAMP WITH TIME ZONE,
    time_window_end TIMESTAMP WITH TIME ZONE,
    
    -- Metrics
    execution_time_ms INTEGER,
    
    -- Errors
    errors JSONB,
    
    -- Summary
    summary JSONB
);

-- Indexes
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_type ON runs(run_type);
CREATE INDEX idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX idx_runs_kb_version ON runs(kb_version);

-- Comments
COMMENT ON TABLE runs IS 'Execution log for all system runs (Writer + Analytics + Learning)';
COMMENT ON COLUMN runs.input_snapshot IS 'WriterInput JSON used for this run';
COMMENT ON COLUMN runs.output_snapshot IS 'Generated bundles (website, email, social)';

-- ============================================================
-- 3. GENERATED CONTENT
-- Individual pieces of generated content with KB component links
-- ============================================================

CREATE TABLE generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    
    -- Type and variant
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('PAGE', 'EMAIL', 'EMAIL_FLOW', 'EMAIL_REPLY', 'SOCIAL_POST')),
    variant_id VARCHAR(100) NOT NULL,
    
    -- Context
    icp_id VARCHAR(100) NOT NULL,
    offer_id VARCHAR(100) NOT NULL,
    buyer_stage VARCHAR(20) CHECK (buyer_stage IN ('AWARENESS', 'CONSIDERATION', 'EVALUATION', 'RISK_RESOLUTION', 'READY')),
    
    -- KB Component Links (for analytics attribution)
    blueprint_id VARCHAR(100),
    layout_id VARCHAR(100),
    angle_id VARCHAR(100),
    cta_id VARCHAR(100),
    strategy_id VARCHAR(100),
    
    -- Content
    content_data JSONB NOT NULL,
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    paused_at TIMESTAMP WITH TIME ZONE,
    pause_reason TEXT
);

-- Indexes
CREATE INDEX idx_content_run ON generated_content(run_id);
CREATE INDEX idx_content_type ON generated_content(content_type);
CREATE INDEX idx_content_variant ON generated_content(variant_id);
CREATE INDEX idx_content_context ON generated_content(icp_id, offer_id, buyer_stage);
CREATE INDEX idx_content_active ON generated_content(is_active) WHERE is_active = true;
CREATE INDEX idx_content_generated_at ON generated_content(generated_at DESC);

-- JSONB index for content search
CREATE INDEX idx_content_data ON generated_content USING gin (content_data);

-- Comments
COMMENT ON TABLE generated_content IS 'Individual content pieces with KB component attribution';
COMMENT ON COLUMN generated_content.kb_components IS 'Links to KB components used (for analytics)';

-- ============================================================
-- 4. ANALYTICS EVENTS
-- Raw events from website, email, and social platforms
-- ============================================================

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Timing
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Content linkage
    run_id UUID REFERENCES runs(id),
    content_id UUID REFERENCES generated_content(id),
    variant_id VARCHAR(100),
    
    -- Event type
    event_type VARCHAR(50) NOT NULL,
    asset_type VARCHAR(20) CHECK (asset_type IN ('WEBSITE', 'EMAIL', 'EMAIL_FLOW', 'EMAIL_REPLY', 'SOCIAL_POST')),
    
    -- Context
    icp_id VARCHAR(100),
    offer_id VARCHAR(100),
    buyer_stage VARCHAR(20),
    platform VARCHAR(50),
    
    -- Event data
    payload JSONB,
    
    -- Attribution
    source VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    
    -- Deduplication
    idempotency_key VARCHAR(255) UNIQUE,
    is_duplicate BOOLEAN DEFAULT false
);

-- Indexes for analytics queries
CREATE INDEX idx_events_occurred_at ON analytics_events(occurred_at DESC);
CREATE INDEX idx_events_content ON analytics_events(content_id);
CREATE INDEX idx_events_variant ON analytics_events(variant_id);
CREATE INDEX idx_events_type ON analytics_events(event_type);
CREATE INDEX idx_events_context ON analytics_events(icp_id, offer_id, event_type);
CREATE INDEX idx_events_run ON analytics_events(run_id);
CREATE INDEX idx_events_idempotency ON analytics_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Partial index for primary outcome
CREATE INDEX idx_events_booked_calls ON analytics_events(occurred_at, variant_id, icp_id, offer_id) 
    WHERE event_type = 'BOOKED_CALL';

-- Comments
COMMENT ON TABLE analytics_events IS 'Raw analytics events from all channels';
COMMENT ON COLUMN analytics_events.idempotency_key IS 'Prevents duplicate event processing';

-- ============================================================
-- 5. AGGREGATED METRICS
-- Pre-computed metrics for faster learning loop
-- ============================================================

CREATE TABLE aggregated_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time window
    time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Context
    icp_id VARCHAR(100) NOT NULL,
    offer_id VARCHAR(100) NOT NULL,
    buyer_stage VARCHAR(20),
    asset_type VARCHAR(20) NOT NULL,
    variant_id VARCHAR(100) NOT NULL,
    
    -- Counts
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_booked_calls INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_unsubscribes INTEGER DEFAULT 0,
    total_complaints INTEGER DEFAULT 0,
    
    -- Rates
    booked_call_rate DECIMAL(5,4), -- PRIMARY METRIC!
    reply_rate DECIMAL(5,4), -- Proxy for open rate
    click_rate DECIMAL(5,4),
    bounce_rate DECIMAL(5,4),
    unsubscribe_rate DECIMAL(5,4),
    complaint_rate DECIMAL(5,4),
    
    -- Meta
    sample_size INTEGER NOT NULL,
    is_statistically_significant BOOLEAN,
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT unique_aggregation UNIQUE (time_window_start, time_window_end, icp_id, offer_id, buyer_stage, asset_type, variant_id)
);

-- Indexes
CREATE INDEX idx_metrics_window ON aggregated_metrics(time_window_start, time_window_end);
CREATE INDEX idx_metrics_context ON aggregated_metrics(icp_id, offer_id, buyer_stage, asset_type);
CREATE INDEX idx_metrics_variant ON aggregated_metrics(variant_id);
CREATE INDEX idx_metrics_booked_call_rate ON aggregated_metrics(booked_call_rate DESC NULLS LAST);

-- Comments
COMMENT ON TABLE aggregated_metrics IS 'Pre-computed metrics for learning loop efficiency';
COMMENT ON COLUMN aggregated_metrics.booked_call_rate IS 'PRIMARY SUCCESS METRIC per client spec';

-- ============================================================
-- 6. LEARNING HISTORY
-- Audit log of KB mutations from learning loop
-- ============================================================

CREATE TABLE learning_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- When
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    run_id UUID REFERENCES runs(id),
    
    -- What changed
    mutation_type VARCHAR(50) NOT NULL CHECK (mutation_type IN ('PROMOTION', 'DEMOTION', 'PAUSE', 'RESUME')),
    
    -- Context
    context JSONB NOT NULL,
    
    -- Details
    variant_id VARCHAR(100),
    pattern_type VARCHAR(50),
    pattern_id VARCHAR(100),
    
    -- Why
    reason TEXT NOT NULL,
    evidence JSONB,
    
    -- KB version before/after
    kb_version_before VARCHAR(50),
    kb_version_after VARCHAR(50)
);

-- Indexes
CREATE INDEX idx_learning_executed_at ON learning_history(executed_at DESC);
CREATE INDEX idx_learning_run ON learning_history(run_id);
CREATE INDEX idx_learning_type ON learning_history(mutation_type);
CREATE INDEX idx_learning_variant ON learning_history(variant_id);

-- Comments
COMMENT ON TABLE learning_history IS 'Audit trail of all KB mutations from learning loop';

-- ============================================================
-- 7. OPS CONFIG
-- Operational configuration (schedules, throttles, guardrails)
-- ============================================================

CREATE TABLE ops_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Only one active config
    CONSTRAINT only_one_active_ops CHECK (
        NOT is_active OR 
        (SELECT COUNT(*) FROM ops_config WHERE is_active = true) <= 1
    )
);

-- Indexes
CREATE INDEX idx_ops_active ON ops_config(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE ops_config IS 'Operational configuration (schedule, throttles, guardrails)';

-- ============================================================
-- 8. SYSTEM LOGS
-- Structured application logs
-- ============================================================

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    module VARCHAR(100),
    message TEXT NOT NULL,
    context JSONB,
    error_stack TEXT
);

-- Indexes
CREATE INDEX idx_logs_logged_at ON system_logs(logged_at DESC);
CREATE INDEX idx_logs_level ON system_logs(level);
CREATE INDEX idx_logs_module ON system_logs(module);

-- Partitioning hint (for future optimization)
COMMENT ON TABLE system_logs IS 'Structured application logs (consider partitioning by date)';

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Insert default ops config
INSERT INTO ops_config (version, config, is_active) VALUES (
    '1.0.0',
    '{
        "schema_version": "1.0.0",
        "schedule": {
            "timezone": "America/New_York",
            "daily_run_time": "06:00",
            "enabled": true
        },
        "run_windows": {
            "default_input_window": "PREVIOUS_CALENDAR_DAY",
            "custom_ranges_allowed": false
        },
        "throttles": {
            "max_new_variants_per_day": 10,
            "max_promotions_per_context": 3,
            "max_demotions_per_context": 2,
            "max_pauses_per_day": 5
        },
        "guardrails": {
            "pause_on_threshold_breach": true,
            "thresholds": {
                "bounce_rate_max": 0.15,
                "unsubscribe_rate_max": 0.02,
                "complaint_rate_max": 0.001
            },
            "cooldown_policy": {
                "cooldown_days_after_pause": 7,
                "auto_resume_allowed": false
            }
        },
        "execution_modes": {
            "writer": { "enabled": true },
            "analytics": { "enabled": true },
            "learning_loop": { "enabled": true }
        },
        "exports": {
            "output_dir": "./generated",
            "formats": ["JSON", "MARKDOWN"],
            "emit_examples": true
        },
        "logging": {
            "level": "INFO",
            "retain_days": 90,
            "include_raw_source_payloads": false,
            "structured_format": true
        }
    }'::jsonb,
    true
);
