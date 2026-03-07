-- ============================================================
-- AXIOM BRAIN - MIGRATION 017: AI Model Metadata System
-- Created: 2026-01-27
-- Description: Separate table for AI model discovery and management
--              Ported from Lekhika's robust ai_model_metadata system
-- NOTE: Handles existing tables by adding missing columns
-- ============================================================

-- ============================================================
-- AI MODEL METADATA TABLE
-- Stores discovered models from each provider API
-- Single source of truth for all available AI models
-- ============================================================

-- Create table if it doesn't exist (minimal schema)
CREATE TABLE IF NOT EXISTS ai_model_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns (each is idempotent)
DO $$
BEGIN
    -- Cost columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'input_cost_per_million') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN input_cost_per_million DECIMAL(10, 4) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'output_cost_per_million') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN output_cost_per_million DECIMAL(10, 4) DEFAULT 0;
    END IF;
    
    -- Capability columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'context_window_tokens') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN context_window_tokens INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'max_output_tokens') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN max_output_tokens INTEGER DEFAULT 4096;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'tokens_per_page') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN tokens_per_page INTEGER DEFAULT 500;
    END IF;
    
    -- Metadata columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'specialties') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN specialties JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'capabilities') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN capabilities JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'description') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN description TEXT;
    END IF;
    
    -- Key columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'key_name') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN key_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'key_model') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN key_model VARCHAR(512);
    END IF;
    
    -- Feature flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'supports_vision') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN supports_vision BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'supports_function_calling') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN supports_function_calling BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'supports_streaming') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN supports_streaming BOOLEAN DEFAULT true;
    END IF;
    
    -- Status columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'is_deprecated') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN is_deprecated BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'deprecation_reason') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN deprecation_reason TEXT;
    END IF;
    
    -- Testing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'test_passed') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN test_passed BOOLEAN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'test_error') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN test_error TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'last_tested') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN last_tested TIMESTAMPTZ;
    END IF;
    
    -- Multi-tenancy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'org_id') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN org_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'user_id') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN user_id UUID;
    END IF;
    
    -- Tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'metadata') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'discovered_at') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN discovered_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'last_verified_at') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN last_verified_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'updated_at') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_metadata' AND column_name = 'created_at') THEN
        ALTER TABLE ai_model_metadata ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add unique constraint on key_model if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_model_metadata_key_model_key') THEN
        ALTER TABLE ai_model_metadata ADD CONSTRAINT ai_model_metadata_key_model_key UNIQUE (key_model);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Add unique constraint on (provider, model_id) to prevent duplicate models
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_model_metadata_provider_model_unique') THEN
        ALTER TABLE ai_model_metadata ADD CONSTRAINT ai_model_metadata_provider_model_unique UNIQUE (provider, model_id);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================

-- Active models by provider (most common query)
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_active_provider 
    ON ai_model_metadata(provider, is_active) 
    WHERE is_active = true;

-- Model lookup
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_model_id 
    ON ai_model_metadata(model_id);

-- Cost-based sorting
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_cost 
    ON ai_model_metadata(provider, input_cost_per_million, output_cost_per_million);

-- Context window for capability matching
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_context 
    ON ai_model_metadata(context_window_tokens DESC) 
    WHERE is_active = true;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE ai_model_metadata IS 'Discovered AI models from provider APIs - single source of truth';
COMMENT ON COLUMN ai_model_metadata.provider IS 'AI provider name (openai, anthropic, google, etc.)';
COMMENT ON COLUMN ai_model_metadata.model_id IS 'Model identifier as returned by provider API';
COMMENT ON COLUMN ai_model_metadata.model_name IS 'Display name for the model';
COMMENT ON COLUMN ai_model_metadata.input_cost_per_million IS 'Cost per million input tokens in USD';
COMMENT ON COLUMN ai_model_metadata.output_cost_per_million IS 'Cost per million output tokens in USD';
COMMENT ON COLUMN ai_model_metadata.context_window_tokens IS 'Maximum context window size in tokens';
COMMENT ON COLUMN ai_model_metadata.specialties IS 'Model specializations (coding, reasoning, etc.)';
COMMENT ON COLUMN ai_model_metadata.capabilities IS 'Supported features (vision, function_calling, etc.)';
COMMENT ON COLUMN ai_model_metadata.is_active IS 'Whether model is available for use';
COMMENT ON COLUMN ai_model_metadata.metadata IS 'Raw API response data for reference';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_model_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_model_metadata_updated ON ai_model_metadata;
CREATE TRIGGER trigger_ai_model_metadata_updated
    BEFORE UPDATE ON ai_model_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_model_metadata_timestamp();

-- ============================================================
-- RLS POLICIES (Read-only for all authenticated users)
-- ============================================================

ALTER TABLE ai_model_metadata ENABLE ROW LEVEL SECURITY;

-- Platform admins can do everything
CREATE POLICY ai_model_metadata_admin_all ON ai_model_metadata
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM platform_admins 
            WHERE email = auth.jwt() ->> 'email' 
            AND is_active = true
        )
    );

-- All authenticated users can read active models
CREATE POLICY ai_model_metadata_read ON ai_model_metadata
    FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get models for a provider
CREATE OR REPLACE FUNCTION get_active_models_for_provider(p_provider VARCHAR)
RETURNS TABLE (
    id UUID,
    model_id VARCHAR,
    model_name VARCHAR,
    input_cost_per_million DECIMAL,
    output_cost_per_million DECIMAL,
    context_window_tokens INTEGER,
    capabilities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.model_id,
        m.model_name,
        m.input_cost_per_million,
        m.output_cost_per_million,
        m.context_window_tokens,
        m.capabilities
    FROM ai_model_metadata m
    WHERE m.provider = p_provider
      AND m.is_active = true
    ORDER BY m.model_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate estimated cost
CREATE OR REPLACE FUNCTION calculate_model_cost(
    p_model_id VARCHAR,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    v_input_rate DECIMAL;
    v_output_rate DECIMAL;
    v_total_cost DECIMAL;
BEGIN
    SELECT 
        input_cost_per_million / 1000000,
        output_cost_per_million / 1000000
    INTO v_input_rate, v_output_rate
    FROM ai_model_metadata
    WHERE model_id = p_model_id
    LIMIT 1;
    
    IF v_input_rate IS NULL THEN
        RETURN 0;
    END IF;
    
    v_total_cost := (p_input_tokens * v_input_rate) + (p_output_tokens * v_output_rate);
    RETURN ROUND(v_total_cost, 6);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- NO SEED DATA
-- Models are discovered dynamically via provider APIs
-- Test each model -> if works, upsert as active. If fails, upsert as inactive.
-- This ensures only REAL, TESTED models are in the database.
-- ============================================================

-- ============================================================
-- NOTE: Engine system tables already exist in 014_workflow-engine-tables.sql
-- - engine_instances (equivalent to ai_engines)
-- - engine_run_logs (equivalent to engine_executions)
-- - engine_api_key_mappings
-- This migration only adds ai_model_metadata for model discovery
-- ============================================================

-- ============================================================
-- END OF MIGRATION
-- ============================================================
