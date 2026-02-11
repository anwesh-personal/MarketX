-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 07
-- AI Provider Management
-- Source: System B (006, 017), database/complete-setup.sql
-- ============================================================

-- ============================================================
-- AI PROVIDERS (API Keys)
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

CREATE INDEX IF NOT EXISTS idx_ai_providers_user ON ai_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_org ON ai_providers(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_provider ON ai_providers(provider);
CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(is_active);

COMMENT ON TABLE ai_providers IS 'API keys for AI providers, managed per-user or per-org';

-- ============================================================
-- AI MODELS (from 006)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    model_type VARCHAR(50) DEFAULT 'chat' CHECK (model_type IN ('chat', 'completion', 'embedding', 'image', 'audio')),
    input_cost_per_1k DECIMAL(10,6),
    output_cost_per_1k DECIMAL(10,6),
    context_window INTEGER,
    max_output_tokens INTEGER,
    supports_streaming BOOLEAN DEFAULT true,
    supports_functions BOOLEAN DEFAULT false,
    supports_vision BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(model_type);

-- ============================================================
-- AI MODEL METADATA (from 017) — discovered models
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

CREATE INDEX IF NOT EXISTS idx_ai_model_meta_user ON ai_model_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_meta_org ON ai_model_metadata(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_meta_provider ON ai_model_metadata(provider);
CREATE INDEX IF NOT EXISTS idx_ai_model_meta_model ON ai_model_metadata(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_meta_active ON ai_model_metadata(is_active);

COMMENT ON TABLE ai_model_metadata IS 'Discovered AI models from provider APIs with capability metadata';

-- ============================================================
-- AI COSTS (from 006)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ai_models(id),
    provider VARCHAR(50),
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6),
    request_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_costs_org ON ai_costs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_costs_provider ON ai_costs(provider);

-- ============================================================
-- BRAIN-AI ASSIGNMENTS (from 006)
-- ============================================================
CREATE TABLE IF NOT EXISTS brain_ai_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brain_template_id UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
    ai_provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_id UUID REFERENCES ai_models(id),
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brain_template_id, ai_provider_id)
);

-- ============================================================
-- AI USAGE ANALYTICS (for superadmin dashboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(255),
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6),
    latency_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success',
    error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);

-- Trigger
CREATE TRIGGER trigger_update_ai_providers_timestamp
BEFORE UPDATE ON ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
