-- ============================================================
-- AXIOM - Migration 023: Railway Workspace ID
-- Created: 2026-01-29
-- Description: Add railway_workspace_id for proper Railway API discovery
-- ============================================================

-- Add railway_workspace_id column
ALTER TABLE worker_deployment_config 
ADD COLUMN IF NOT EXISTS railway_workspace_id TEXT;

-- Comment for documentation
COMMENT ON COLUMN worker_deployment_config.railway_workspace_id IS 
    'Railway workspace ID required for API discovery. Get this from Railway dashboard (Cmd/K → Copy Active Workspace ID).';

-- Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_deployment_config' 
        AND column_name = 'railway_workspace_id'
    ) THEN
        RAISE NOTICE '✅ railway_workspace_id column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add railway_workspace_id column';
    END IF;
END $$;
