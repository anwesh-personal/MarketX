-- ============================================================
-- MIGRATION 059: WORKER INFRASTRUCTURE (SELF-CONTAINED)
-- ============================================================
-- Creates worker system tables if they don't exist.
-- Migration 006 may not have been applied to production.
-- All CREATE TABLE IF NOT EXISTS — safe on any DB state.
-- ============================================================

BEGIN;

-- VPS Servers
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

-- Worker Deployment Config (singleton)
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

CREATE UNIQUE INDEX IF NOT EXISTS worker_deployment_config_singleton
    ON worker_deployment_config ((true));

-- Worker Templates
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

-- Workers
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

-- Jobs
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

-- Triggers (safe: drop if exists first)
DROP TRIGGER IF EXISTS trigger_update_vps_servers_timestamp ON vps_servers;
CREATE TRIGGER trigger_update_vps_servers_timestamp
BEFORE UPDATE ON vps_servers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_worker_deployment_config_timestamp ON worker_deployment_config;
CREATE TRIGGER trigger_update_worker_deployment_config_timestamp
BEFORE UPDATE ON worker_deployment_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default deployment config if missing
INSERT INTO worker_deployment_config (active_target, auto_scale_enabled, min_workers, max_workers)
SELECT 'vps', false, 1, 10
WHERE NOT EXISTS (SELECT 1 FROM worker_deployment_config);

COMMIT;
