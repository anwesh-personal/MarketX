-- ============================================================
-- SAFE INCREMENTAL MIGRATION - AI Provider Tables
-- This script uses IF NOT EXISTS to safely add only missing pieces
-- ============================================================

-- ============================================================
-- 1. Add Password Columns (if not exists)
-- ============================================================

-- Add password_hash to platform_admins (safe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'platform_admins' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE platform_admins ADD COLUMN password_hash VARCHAR(255);
        RAISE NOTICE 'Added password_hash to platform_admins';
    ELSE
        RAISE NOTICE 'password_hash already exists in platform_admins';
    END IF;
END $$;

-- Add password_hash to users (safe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        RAISE NOTICE 'Added password_hash to users';
    ELSE
        RAISE NOTICE 'password_hash already exists in users';
    END IF;
END $$;

-- ============================================================
-- 2. Create AI Providers Table (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'google', 'mistral', 
        'perplexity', 'xai', 'cohere', 'groq'
    )),
    name VARCHAR(255) NOT NULL,
    api_key TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    failures INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (safe - will skip if exists)
CREATE INDEX IF NOT EXISTS idx_ai_providers_user_id ON ai_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_org_id ON ai_providers(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_provider ON ai_providers(provider);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active);

-- ============================================================
-- 3. Create AI Model Metadata Table (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_model_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    model_name VARCHAR(255),
    key_name VARCHAR(255),
    key_model VARCHAR(255) UNIQUE,
    input_cost_per_million DECIMAL(10, 6),
    output_cost_per_million DECIMAL(10, 6),
    context_window_tokens INTEGER,
    tokens_per_page INTEGER,
    max_output_tokens INTEGER,
    specialties TEXT[],
    description TEXT,
    supports_vision BOOLEAN DEFAULT false,
    supports_function_calling BOOLEAN DEFAULT false,
    supports_streaming BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    test_passed BOOLEAN,
    test_error TEXT,
    last_tested TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (safe)
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_user_id ON ai_model_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_org_id ON ai_model_metadata(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_provider ON ai_model_metadata(provider);
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_model_id ON ai_model_metadata(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_metadata_is_active ON ai_model_metadata(is_active);

-- ============================================================
-- 4. Create System Configs Table (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES platform_admins(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);

-- ============================================================
-- 5. Create Triggers (safe with OR REPLACE)
-- ============================================================

-- Trigger for ai_providers
CREATE OR REPLACE FUNCTION update_ai_providers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_providers_timestamp ON ai_providers;
CREATE TRIGGER trigger_update_ai_providers_timestamp
BEFORE UPDATE ON ai_providers
FOR EACH ROW
EXECUTE FUNCTION update_ai_providers_timestamp();

-- Trigger for ai_model_metadata
CREATE OR REPLACE FUNCTION update_ai_model_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ai_model_metadata_timestamp ON ai_model_metadata;
CREATE TRIGGER trigger_update_ai_model_metadata_timestamp
BEFORE UPDATE ON ai_model_metadata
FOR EACH ROW
EXECUTE FUNCTION update_ai_model_metadata_timestamp();

-- ============================================================
-- 6. Helper Functions (safe with OR REPLACE)
-- ============================================================

CREATE OR REPLACE FUNCTION increment_provider_usage(p_provider_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ai_providers
    SET 
        usage_count = usage_count + 1,
        last_used = NOW()
    WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_provider_failure(p_provider_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ai_providers
    SET 
        failures = failures + 1,
        is_active = CASE 
            WHEN failures + 1 >= 5 THEN false
            ELSE is_active 
        END
    WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_model_test_result(
    p_model_id UUID,
    p_test_passed BOOLEAN,
    p_test_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE ai_model_metadata
    SET 
        test_passed = p_test_passed,
        test_error = p_test_error,
        last_tested = NOW(),
        is_active = p_test_passed
    WHERE id = p_model_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Enable RLS (safe - won't error if already enabled)
-- ============================================================

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users see org AI providers" ON ai_providers;
DROP POLICY IF EXISTS "Users see org AI models" ON ai_model_metadata;
DROP POLICY IF EXISTS "Admins see system configs" ON system_configs;

-- Create policies
CREATE POLICY "Users see org AI providers"
ON ai_providers FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see org AI models"
ON ai_model_metadata FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins see system configs"
ON system_configs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE id = auth.uid() AND is_active = true
));

-- ============================================================
-- COMPLETE!
-- ============================================================
-- Run check-existing-tables.sql to verify what was added
-- ============================================================
