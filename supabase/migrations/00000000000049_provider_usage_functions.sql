-- ============================================================================
-- MIGRATION 49: AI PROVIDER SCHEMA UPGRADES + USAGE TRACKING FUNCTIONS
-- ============================================================================
-- 1. Adds missing columns to ai_providers for the unified provider chain:
--    priority, selected_model, auto_disabled_at, last_failed_at
-- 2. Creates RPC functions for non-blocking usage/failure tracking
-- ============================================================================

BEGIN;

-- ── Add missing columns to ai_providers ──────────────────────
ALTER TABLE ai_providers
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS selected_model TEXT,
    ADD COLUMN IF NOT EXISTS auto_disabled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ;

-- Index for the provider chain resolution query
CREATE INDEX IF NOT EXISTS idx_ai_providers_chain
    ON ai_providers(org_id, is_active, provider, priority, failures);

-- ── Usage tracking functions ──────────────────────────────────

-- Increment usage count after successful API call
CREATE OR REPLACE FUNCTION increment_provider_usage(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE ai_providers
    SET usage_count = COALESCE(usage_count, 0) + 1,
        last_used = NOW()
    WHERE id = p_id;
END;
$$;

-- Increment failure count after failed API call
CREATE OR REPLACE FUNCTION increment_provider_failure(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE ai_providers
    SET failures = COALESCE(failures, 0) + 1,
        last_failed_at = NOW()
    WHERE id = p_id;
    
    -- Auto-disable after 10 consecutive failures (safety net)
    UPDATE ai_providers
    SET auto_disabled_at = NOW(),
        is_active = false
    WHERE id = p_id
      AND COALESCE(failures, 0) >= 10
      AND auto_disabled_at IS NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✓ Migration 049: AI provider schema upgrades + usage tracking';
END $$;

COMMIT;
