-- ============================================================
-- AXIOM - Migration 022: Railway Domain Storage
-- Created: 2026-01-29
-- Description: Add railway_domain column for dynamic worker API discovery
-- ============================================================

-- Add railway_domain column to store the auto-fetched service domain
ALTER TABLE worker_deployment_config 
ADD COLUMN IF NOT EXISTS railway_domain TEXT;

-- Comment for documentation
COMMENT ON COLUMN worker_deployment_config.railway_domain IS 
    'Auto-discovered Railway service domain (e.g., eciton-v1-production.up.railway.app). Fetched from Railway API when service is selected.';

-- Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_deployment_config' 
        AND column_name = 'railway_domain'
    ) THEN
        RAISE NOTICE '✅ railway_domain column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add railway_domain column';
    END IF;
END $$;
