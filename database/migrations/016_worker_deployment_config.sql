-- ============================================================
-- AXIOM - Migration 016: Worker Deployment Configuration
-- Created: 2026-01-27
-- Description: Unified configuration for Railway vs VPS worker deployment
-- ============================================================

-- Worker Deployment Configuration Table
-- Stores the active deployment target (Railway or VPS) and their credentials
CREATE TABLE IF NOT EXISTS worker_deployment_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Which deployment target is active
    -- 'railway' = Workers run on Railway
    -- 'vps' = Workers run on your VPS via PM2
    active_target VARCHAR(20) NOT NULL DEFAULT 'vps' 
        CHECK (active_target IN ('railway', 'vps')),
    
    -- Railway Configuration
    -- Get these from Railway Dashboard → Project → Settings
    railway_token TEXT,                    -- Railway API token (from Account Settings → Tokens)
    railway_project_id VARCHAR(100),       -- Project ID (from project URL or settings)
    railway_service_id VARCHAR(100),       -- Service ID for worker service
    railway_environment VARCHAR(50) DEFAULT 'production',  -- Environment name
    
    -- VPS Configuration
    -- Store VPS server ID (no foreign key since vps_servers may not exist)
    vps_server_id UUID,
    
    -- Scaling Configuration
    auto_scale_enabled BOOLEAN DEFAULT false,  -- Only applicable for Railway
    min_workers INTEGER DEFAULT 1 CHECK (min_workers >= 1),
    max_workers INTEGER DEFAULT 10 CHECK (max_workers >= min_workers),
    
    -- Metadata
    last_deployment_at TIMESTAMPTZ,
    last_deployment_status VARCHAR(50),  -- 'success', 'failed', 'pending'
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Singleton constraint: Only one configuration row allowed
-- This ensures there's always exactly one active configuration
CREATE UNIQUE INDEX IF NOT EXISTS worker_deployment_config_singleton 
    ON worker_deployment_config ((true));

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS worker_deployment_config_target_idx 
    ON worker_deployment_config(active_target);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_worker_deployment_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS worker_deployment_config_updated_at ON worker_deployment_config;
CREATE TRIGGER worker_deployment_config_updated_at
    BEFORE UPDATE ON worker_deployment_config
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_deployment_config_timestamp();

-- Insert default configuration (VPS)
INSERT INTO worker_deployment_config (
    active_target,
    vps_server_id,
    auto_scale_enabled,
    min_workers,
    max_workers
)
SELECT 
    'vps',
    NULL,  -- No VPS server by default
    false,
    1,
    10
WHERE NOT EXISTS (SELECT 1 FROM worker_deployment_config);

-- Row Level Security
ALTER TABLE worker_deployment_config ENABLE ROW LEVEL SECURITY;

-- Superadmin full access policy
DROP POLICY IF EXISTS "Superadmin full access to worker_deployment_config" ON worker_deployment_config;
CREATE POLICY "Superadmin full access to worker_deployment_config"
    ON worker_deployment_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM platform_admins 
            WHERE email = auth.jwt() ->> 'email'
            AND is_active = true
        )
    );

-- Service role bypass for backend operations
DROP POLICY IF EXISTS "Service role access to worker_deployment_config" ON worker_deployment_config;
CREATE POLICY "Service role access to worker_deployment_config"
    ON worker_deployment_config FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments for documentation
COMMENT ON TABLE worker_deployment_config IS 
    'Singleton table storing the active worker deployment target (Railway or VPS) and configuration';

COMMENT ON COLUMN worker_deployment_config.active_target IS 
    'Which deployment target is active: railway (cloud) or vps (self-hosted)';

COMMENT ON COLUMN worker_deployment_config.railway_token IS 
    'Railway API token for authentication. Get from Railway Dashboard → Account Settings → Tokens';

COMMENT ON COLUMN worker_deployment_config.railway_project_id IS 
    'Railway project ID. Found in project URL or Project Settings';

COMMENT ON COLUMN worker_deployment_config.railway_service_id IS 
    'Railway service ID for the worker service. Found in service settings';

COMMENT ON COLUMN worker_deployment_config.vps_server_id IS 
    'Reference to vps_servers table for VPS deployment credentials';

COMMENT ON COLUMN worker_deployment_config.auto_scale_enabled IS 
    'Enable auto-scaling (Railway only). VPS uses fixed PM2 instances';

-- Verification
DO $$
BEGIN
    -- Verify table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'worker_deployment_config') THEN
        RAISE NOTICE '✅ worker_deployment_config table created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create worker_deployment_config table';
    END IF;
    
    -- Verify default row exists
    IF EXISTS (SELECT 1 FROM worker_deployment_config) THEN
        RAISE NOTICE '✅ Default configuration inserted';
    ELSE
        RAISE NOTICE '⚠️ No default configuration - will be created on first access';
    END IF;
    
    -- Verify RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'worker_deployment_config' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ Row Level Security enabled';
    ELSE
        RAISE NOTICE '⚠️ Row Level Security may not be enabled';
    END IF;
END $$;
