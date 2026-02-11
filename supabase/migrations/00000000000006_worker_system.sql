-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 06
-- Worker System (Deployment, Templates, Jobs, VPS, Railway)
-- Source: System A (003), System B (005, 007, 009, 013, 016, 021, 022, 023)
-- ============================================================

-- ============================================================
-- JOBS (unified from System A and System B)
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'running', 'completed', 'failed')),
    priority INTEGER DEFAULT 0,
    claimed_by UUID,
    claimed_at TIMESTAMPTZ,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);

-- ============================================================
-- WORKER TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    worker_type VARCHAR(50) DEFAULT 'queue' CHECK (worker_type IN ('queue', 'scheduled', 'realtime', 'custom')),
    code_template TEXT,
    environment_vars TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VPS SERVERS (from 009)
-- ============================================================
CREATE TABLE IF NOT EXISTS vps_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 22,
    username VARCHAR(255) NOT NULL,
    password TEXT,
    ssh_key TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unreachable')),
    last_connected_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vps_servers_status ON vps_servers(status);

-- ============================================================
-- WORKERS (merged from System A + System B)
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES worker_templates(id),
    vps_server_id UUID REFERENCES vps_servers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    worker_type VARCHAR(100) NOT NULL,
    hostname VARCHAR(255),
    pid INTEGER,
    status VARCHAR(50) DEFAULT 'stopped' CHECK (status IN ('active', 'idle', 'dead', 'stopped', 'starting', 'running', 'error')),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_type ON workers(worker_type);
CREATE INDEX IF NOT EXISTS idx_workers_heartbeat ON workers(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_workers_org ON workers(org_id);

-- ============================================================
-- WORKER DEPLOYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    version VARCHAR(50),
    deployment_type VARCHAR(50) DEFAULT 'manual',
    status VARCHAR(50) DEFAULT 'pending',
    deployed_by UUID REFERENCES users(id),
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}',
    logs TEXT
);

CREATE INDEX IF NOT EXISTS idx_worker_deployments_worker ON worker_deployments(worker_id);

-- ============================================================
-- WORKER HEALTH & EXECUTION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    cpu_percent DECIMAL(5,2),
    memory_mb INTEGER,
    uptime_seconds BIGINT,
    active_jobs INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_health_worker ON worker_health_logs(worker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS worker_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id),
    execution_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'running',
    input JSONB,
    output JSONB,
    error TEXT,
    duration_ms INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_worker_exec_worker ON worker_execution_logs(worker_id, started_at DESC);

-- ============================================================
-- WORKER DEPLOYMENT CONFIG (singleton, from 016)
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_deployment_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_target VARCHAR(20) NOT NULL DEFAULT 'vps'
        CHECK (active_target IN ('railway', 'vps')),
    railway_token TEXT,
    railway_project_id VARCHAR(100),
    railway_service_id VARCHAR(100),
    railway_environment VARCHAR(50) DEFAULT 'production',
    railway_domain TEXT,
    railway_workspace_id TEXT,
    vps_server_id UUID,
    auto_scale_enabled BOOLEAN DEFAULT false,
    min_workers INTEGER DEFAULT 1,
    max_workers INTEGER DEFAULT 10,
    last_deployment_at TIMESTAMPTZ,
    last_deployment_status VARCHAR(50),
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Singleton constraint
CREATE UNIQUE INDEX IF NOT EXISTS worker_deployment_config_singleton
    ON worker_deployment_config ((true));

-- ============================================================
-- WORKER JOB LOGS (from 013)
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(100) NOT NULL,
    queue_name VARCHAR(50) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempt INTEGER DEFAULT 1,
    payload JSONB,
    result JSONB,
    error TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_worker_job_logs_queue ON worker_job_logs(queue_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_job_logs_status ON worker_job_logs(status, created_at DESC);

-- ============================================================
-- DREAM STATE (from 011/013)
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

CREATE INDEX IF NOT EXISTS idx_dream_cycles_org ON dream_cycles(org_id, started_at DESC);

CREATE TABLE IF NOT EXISTS dream_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'processing', 'completed', 'failed', 'cancelled', 'skipped')),
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

CREATE INDEX IF NOT EXISTS idx_dream_jobs_status ON dream_jobs(status, priority);
CREATE INDEX IF NOT EXISTS idx_dream_jobs_org ON dream_jobs(org_id, created_at DESC);

-- ============================================================
-- RETRY QUEUE (from 013)
-- ============================================================
CREATE TABLE IF NOT EXISTS retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id VARCHAR(100) NOT NULL,
    queue_name VARCHAR(50) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'exhausted')),
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_queue_status ON retry_queue(status, next_retry_at);

-- ============================================================
-- ERROR PATTERNS & SELF-HEALING (from 011)
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

CREATE INDEX IF NOT EXISTS idx_error_patterns_fingerprint ON error_patterns(fingerprint);

-- ============================================================
-- ENGINE ACCESS KEYS (from 021)
-- ============================================================
CREATE TABLE IF NOT EXISTS engine_access_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    label VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_engine_access_keys_engine ON engine_access_keys(engine_id);
CREATE INDEX IF NOT EXISTS idx_engine_access_keys_prefix ON engine_access_keys(key_prefix);

-- ============================================================
-- PLATFORM USAGE STATS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    runs_count INTEGER DEFAULT 0,
    kb_updates_count INTEGER DEFAULT 0,
    analytics_events_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_usage_org ON platform_usage_stats(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_usage_date ON platform_usage_stats(date DESC);

-- Triggers
CREATE TRIGGER trigger_update_workers_timestamp
BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_update_vps_servers_timestamp
BEFORE UPDATE ON vps_servers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_update_worker_deployment_config_timestamp
BEFORE UPDATE ON worker_deployment_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default config row
INSERT INTO worker_deployment_config (active_target, auto_scale_enabled, min_workers, max_workers)
SELECT 'vps', false, 1, 10
WHERE NOT EXISTS (SELECT 1 FROM worker_deployment_config);
