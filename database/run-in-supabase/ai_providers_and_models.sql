-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Creates ai_providers + ai_model_metadata tables
-- Safe to re-run (all statements are idempotent)
-- ============================================================

-- ============================================================
-- 1. AI PROVIDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  api_key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name = 'usage_count') THEN
    ALTER TABLE ai_providers ADD COLUMN usage_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name = 'failures') THEN
    ALTER TABLE ai_providers ADD COLUMN failures INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name = 'last_used_at') THEN
    ALTER TABLE ai_providers ADD COLUMN last_used_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name = 'last_failure_at') THEN
    ALTER TABLE ai_providers ADD COLUMN last_failure_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name = 'auto_disabled_at') THEN
    ALTER TABLE ai_providers ADD COLUMN auto_disabled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name = 'models_discovered') THEN
    ALTER TABLE ai_providers ADD COLUMN models_discovered JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name = 'priority') THEN
    ALTER TABLE ai_providers ADD COLUMN priority INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(provider, is_active) WHERE is_active = true;

-- ============================================================
-- 2. AI MODEL METADATA TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_model_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'input_cost_per_million') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN input_cost_per_million DECIMAL(10, 4) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'output_cost_per_million') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN output_cost_per_million DECIMAL(10, 4) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'context_window_tokens') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN context_window_tokens INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'max_output_tokens') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN max_output_tokens INTEGER DEFAULT 4096;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'supports_vision') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN supports_vision BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'supports_function_calling') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN supports_function_calling BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'supports_streaming') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN supports_streaming BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'is_deprecated') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN is_deprecated BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'deprecation_reason') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN deprecation_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'test_passed') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN test_passed BOOLEAN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'test_error') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN test_error TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'last_tested') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN last_tested TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'description') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'key_name') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN key_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'key_model') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN key_model VARCHAR(512);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'capabilities') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN capabilities JSONB DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'metadata') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'discovered_at') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN discovered_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'last_verified_at') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN last_verified_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'org_id') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN org_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'user_id') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Clean duplicates BEFORE adding constraints
-- Keeps the newest row per (provider, model_id), deletes older dupes
DELETE FROM ai_model_metadata a
USING ai_model_metadata b
WHERE a.provider = b.provider
  AND a.model_id = b.model_id
  AND a.ctid < b.ctid;

-- Same for key_model duplicates
DELETE FROM ai_model_metadata a
USING ai_model_metadata b
WHERE a.key_model IS NOT NULL
  AND a.key_model = b.key_model
  AND a.ctid < b.ctid;

-- Now safe to add unique constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_model_metadata_provider_model_unique') THEN
        ALTER TABLE ai_model_metadata ADD CONSTRAINT ai_model_metadata_provider_model_unique UNIQUE (provider, model_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_model_metadata_key_model_key') THEN
        ALTER TABLE ai_model_metadata ADD CONSTRAINT ai_model_metadata_key_model_key UNIQUE (key_model);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_active_provider ON ai_model_metadata(provider, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_model_id ON ai_model_metadata(model_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_model_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_model_metadata_updated ON ai_model_metadata;
CREATE TRIGGER trigger_ai_model_metadata_updated
    BEFORE UPDATE ON ai_model_metadata
    FOR EACH ROW EXECUTE FUNCTION update_ai_model_metadata_timestamp();

-- ============================================================
-- 3. RLS — service_role bypasses RLS, but add policies for auth users
-- ============================================================

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_metadata ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (API routes use this)
DROP POLICY IF EXISTS ai_providers_service_all ON ai_providers;
CREATE POLICY ai_providers_service_all ON ai_providers FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ai_model_metadata_service_all ON ai_model_metadata;
CREATE POLICY ai_model_metadata_service_all ON ai_model_metadata FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read
DROP POLICY IF EXISTS ai_providers_auth_read ON ai_providers;
CREATE POLICY ai_providers_auth_read ON ai_providers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS ai_model_metadata_auth_read ON ai_model_metadata;
CREATE POLICY ai_model_metadata_auth_read ON ai_model_metadata FOR SELECT TO authenticated USING (true);

-- ============================================================
-- DONE. Both tables are ready.
-- ============================================================
