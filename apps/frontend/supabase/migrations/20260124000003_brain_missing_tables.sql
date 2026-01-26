-- ============================================================
-- AXIOM BRAIN - MISSING TABLES MIGRATION
-- Created: 2026-01-24
-- Description: Adds missing tables for Brain system completion
-- ============================================================

BEGIN;

-- ============================================================
-- USER MEMORY TABLE
-- Stores user-specific memories, preferences, and facts
-- ============================================================

CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Memory classification
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN ('preference', 'fact', 'instruction', 'context', 'correction')),
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    
    -- Memory metadata
    source VARCHAR(50) DEFAULT 'conversation', -- 'conversation', 'explicit', 'inferred', 'imported'
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Access tracking
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate memories
    UNIQUE(user_id, org_id, memory_type, key)
);

-- Indexes for efficient memory retrieval
CREATE INDEX IF NOT EXISTS user_memory_user_org_idx ON user_memory(user_id, org_id, is_active);
CREATE INDEX IF NOT EXISTS user_memory_type_idx ON user_memory(memory_type, is_active);
CREATE INDEX IF NOT EXISTS user_memory_access_idx ON user_memory(access_count DESC);

-- ============================================================
-- CONSTITUTION RULES TABLE
-- Brand voice, compliance rules, and response constraints
-- ============================================================

CREATE TABLE IF NOT EXISTS constitution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    constitution_id UUID, -- Groups related rules
    
    -- Rule definition
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('brand_voice', 'compliance', 'forbidden', 'required', 'style', 'format')),
    rule_name VARCHAR(255) NOT NULL,
    rule_content TEXT NOT NULL,
    
    -- Rule priority and scope
    priority INTEGER DEFAULT 0, -- Higher = more important
    applies_to VARCHAR(50)[] DEFAULT ARRAY['all'], -- Agent types this applies to
    
    -- Enforcement
    enforcement_level VARCHAR(20) DEFAULT 'strict' CHECK (enforcement_level IN ('strict', 'soft', 'advisory')),
    failure_action VARCHAR(50) DEFAULT 'block', -- 'block', 'warn', 'log'
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS constitution_rules_org_idx ON constitution_rules(org_id, is_active);
CREATE INDEX IF NOT EXISTS constitution_rules_type_idx ON constitution_rules(rule_type, priority DESC);

-- ============================================================
-- BRAIN ANALYTICS TABLE
-- Tracks brain usage, performance, and insights
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID REFERENCES brain_templates(id),
    
    -- Time dimensions
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    hour_bucket TIMESTAMPTZ, -- For hourly rollups
    day_bucket DATE, -- For daily rollups
    
    -- Usage metrics
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms DECIMAL(10,2),
    p50_response_time_ms DECIMAL(10,2),
    p95_response_time_ms DECIMAL(10,2),
    p99_response_time_ms DECIMAL(10,2),
    
    -- Token usage
    total_input_tokens BIGINT DEFAULT 0,
    total_output_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    
    -- Agent breakdown
    agent_usage JSONB DEFAULT '{}', -- {"writer": 100, "analyst": 50}
    intent_distribution JSONB DEFAULT '{}', -- {"write_content": 40, "analyze_data": 30}
    
    -- Quality metrics
    avg_user_rating DECIMAL(3,2),
    feedback_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS brain_analytics_org_time_idx ON brain_analytics(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS brain_analytics_day_idx ON brain_analytics(day_bucket, org_id);
CREATE INDEX IF NOT EXISTS brain_analytics_hour_idx ON brain_analytics(hour_bucket, org_id);

-- ============================================================
-- BRAIN PERFORMANCE STATS TABLE
-- Real-time performance tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_performance_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID REFERENCES brain_templates(id),
    
    -- Time window
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    
    -- Request stats
    request_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    timeout_count INTEGER DEFAULT 0,
    
    -- Latency stats (in ms)
    min_latency DECIMAL(10,2),
    max_latency DECIMAL(10,2),
    avg_latency DECIMAL(10,2),
    
    -- Resource usage
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    rag_retrievals INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brain_perf_stats_org_window_idx ON brain_performance_stats(org_id, window_start DESC);

-- ============================================================
-- DREAM STATE TABLES
-- Background processing job management
-- ============================================================

CREATE TABLE IF NOT EXISTS dream_cycles (
    id TEXT PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'interrupted')),
    jobs_completed INTEGER DEFAULT 0,
    jobs_failed INTEGER DEFAULT 0,
    total_duration_ms BIGINT,
    summary JSONB,
    insights JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dream_cycles_org_idx ON dream_cycles(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS dream_cycles_status_idx ON dream_cycles(status);

CREATE TABLE IF NOT EXISTS dream_jobs (
    id TEXT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'skipped')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result JSONB,
    error TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS dream_jobs_status_idx ON dream_jobs(status, priority);
CREATE INDEX IF NOT EXISTS dream_jobs_org_idx ON dream_jobs(org_id, created_at DESC);

-- ============================================================
-- SELF-HEALING TABLES
-- Error tracking and recovery
-- ============================================================

CREATE TABLE IF NOT EXISTS error_patterns (
    id TEXT PRIMARY KEY,
    fingerprint TEXT UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    occurrences INTEGER DEFAULT 1,
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    avg_recovery_time_ms DECIMAL(10,2),
    successful_recoveries INTEGER DEFAULT 0,
    failed_recoveries INTEGER DEFAULT 0,
    best_recovery_action VARCHAR(50),
    is_resolved BOOLEAN DEFAULT false,
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_patterns_fingerprint_idx ON error_patterns(fingerprint);
CREATE INDEX IF NOT EXISTS error_patterns_category_idx ON error_patterns(category, last_seen DESC);

CREATE TABLE IF NOT EXISTS retry_queue (
    id TEXT PRIMARY KEY,
    error_id TEXT NOT NULL,
    context JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    retry_after TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS retry_queue_status_idx ON retry_queue(status, retry_after);

CREATE TABLE IF NOT EXISTS response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    response JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    UNIQUE(org_id, cache_key)
);

CREATE INDEX IF NOT EXISTS response_cache_key_idx ON response_cache(cache_key, org_id);
CREATE INDEX IF NOT EXISTS response_cache_expires_idx ON response_cache(expires_at);

-- ============================================================
-- QUERY CACHE TABLE
-- For pattern precomputation
-- ============================================================

CREATE TABLE IF NOT EXISTS query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    response JSONB NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    UNIQUE(org_id, pattern)
);

CREATE INDEX IF NOT EXISTS query_cache_pattern_idx ON query_cache(pattern, org_id);

-- ============================================================
-- FEEDBACK TABLE
-- User feedback for analysis
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    conversation_id UUID REFERENCES conversations(id),
    message_id UUID REFERENCES messages(id),
    
    -- Feedback data
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50) DEFAULT 'general', -- 'general', 'accuracy', 'helpfulness', 'tone'
    feedback_text TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_org_idx ON feedback(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_rating_idx ON feedback(rating);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- User Memory: Users can only access their own memories
CREATE POLICY user_memory_select ON user_memory FOR SELECT
    USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY user_memory_insert ON user_memory FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_memory_update ON user_memory FOR UPDATE
    USING (user_id = auth.uid());

-- Constitution Rules: Org members can view
CREATE POLICY constitution_rules_select ON constitution_rules FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
    ));

-- Analytics: Org members can view
CREATE POLICY brain_analytics_select ON brain_analytics FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
    ));

-- Feedback: Users can submit their own feedback
CREATE POLICY feedback_insert ON feedback FOR INSERT
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY feedback_select ON feedback FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================
-- VALIDATION
-- ============================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('user_memory', 'constitution_rules', 'brain_analytics', 'dream_cycles', 'dream_jobs', 'error_patterns', 'feedback');
    
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'BRAIN MISSING TABLES MIGRATION COMPLETE';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'New Tables Created: %', table_count;
    RAISE NOTICE 'Status: ✓ SUCCESS';
    RAISE NOTICE '==================================================';
END $$;

COMMIT;
