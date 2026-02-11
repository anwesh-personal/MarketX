-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 08
-- Workflow Engine Tables (structures only, seed data in 10)
-- Source: System B (014), System C (workflow tables)
-- ============================================================

-- ============================================================
-- WORKFLOW TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    node_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES platform_admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_status ON workflow_templates(status);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_created ON workflow_templates(created_at DESC);

-- ============================================================
-- CONSTITUTIONS (Guardrails per org)
-- ============================================================
CREATE TABLE IF NOT EXISTS constitutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_constitutions_org ON constitutions(org_id);
CREATE INDEX IF NOT EXISTS idx_constitutions_active ON constitutions(is_active);

-- ============================================================
-- ENGINE INSTANCES (org-specific workflow clones)
-- ============================================================
CREATE TABLE IF NOT EXISTS engine_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE RESTRICT,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    kb_id UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
    constitution_id UUID REFERENCES constitutions(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'disabled' CHECK (status IN ('active', 'standby', 'disabled', 'error')),
    config JSONB DEFAULT '{}',
    runs_today INTEGER DEFAULT 0,
    runs_total INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_instances_template ON engine_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_engine_instances_org ON engine_instances(org_id);
CREATE INDEX IF NOT EXISTS idx_engine_instances_status ON engine_instances(status);

-- ============================================================
-- ENGINE API KEY MAPPINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS engine_api_key_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(engine_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_engine_api_key_engine ON engine_api_key_mappings(engine_id);

-- ============================================================
-- NODE PALETTE (categories updated from 020)
-- ============================================================
CREATE TABLE IF NOT EXISTS node_palette (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'trigger', 'input', 'process', 'condition', 'preview', 'output',
        'resolver', 'generator', 'processor', 'validator'
    )),
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    features JSONB DEFAULT '[]',
    capabilities JSONB DEFAULT '[]',
    default_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_palette_category ON node_palette(category);
CREATE INDEX IF NOT EXISTS idx_node_palette_active ON node_palette(is_active);
CREATE INDEX IF NOT EXISTS idx_node_palette_sort ON node_palette(sort_order);

-- ============================================================
-- ENGINE RUN LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS engine_run_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'running', 'completed', 'failed')),
    input_data JSONB,
    output_data JSONB,
    node_execution_log JSONB DEFAULT '[]',
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_engine_run_logs_engine ON engine_run_logs(engine_id);
CREATE INDEX IF NOT EXISTS idx_engine_run_logs_org ON engine_run_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_engine_run_logs_status ON engine_run_logs(status);
CREATE INDEX IF NOT EXISTS idx_engine_run_logs_started ON engine_run_logs(started_at DESC);

-- ============================================================
-- USER API KEYS (from System C — api_key_system)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    engine_id UUID REFERENCES engine_instances(id) ON DELETE SET NULL,
    key_hash TEXT NOT NULL,
    key_prefix VARCHAR(12) NOT NULL,
    label VARCHAR(255),
    permissions JSONB DEFAULT '["execute"]',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    rate_limit INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_org ON user_api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_prefix ON user_api_keys(key_prefix);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_workflow_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.node_count = jsonb_array_length(COALESCE(NEW.nodes, '[]'::jsonb));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_templates
BEFORE UPDATE ON workflow_templates FOR EACH ROW
EXECUTE FUNCTION update_workflow_templates_timestamp();

CREATE TRIGGER trigger_update_engine_instances
BEFORE UPDATE ON engine_instances FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION update_constitutions_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_constitutions
BEFORE UPDATE ON constitutions FOR EACH ROW
EXECUTE FUNCTION update_constitutions_version();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION reset_daily_engine_runs()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE engine_instances SET runs_today = 0;
END;
$$;

CREATE OR REPLACE FUNCTION clone_engine_from_template(
    p_template_id UUID, p_name VARCHAR, p_org_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_engine_id UUID;
BEGIN
    INSERT INTO engine_instances (name, template_id, org_id, status)
    VALUES (p_name, p_template_id, p_org_id, 'disabled')
    RETURNING id INTO v_engine_id;
    RETURN v_engine_id;
END;
$$;
