-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 03
-- Brain System (Templates, Assignments, Versions, A/B Tests)
-- Source: System B (000, 001, 011)
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    system_prompt TEXT,
    model VARCHAR(100) DEFAULT 'gpt-4',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    tools_enabled BOOLEAN DEFAULT false,
    rag_enabled BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_templates_org ON brain_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_brain_templates_name ON brain_templates(name);

CREATE TABLE IF NOT EXISTS org_brain_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    config_overrides JSONB DEFAULT '{}',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(org_id, brain_template_id)
);

CREATE INDEX IF NOT EXISTS idx_org_brain_org ON org_brain_assignments(org_id);

CREATE TABLE IF NOT EXISTS brain_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brain_template_id UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    previous_config JSONB,
    new_config JSONB,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_version_template ON brain_version_history(brain_template_id);

CREATE TABLE IF NOT EXISTS brain_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variant_a_id UUID REFERENCES brain_templates(id),
    variant_b_id UUID REFERENCES brain_templates(id),
    traffic_split DECIMAL(3,2) DEFAULT 0.5,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
    results JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID REFERENCES brain_templates(id),
    user_id UUID REFERENCES users(id),
    input_text TEXT,
    output_text TEXT,
    model_used VARCHAR(100),
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success',
    error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_req_org ON brain_request_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_brain_req_template ON brain_request_logs(brain_template_id);
CREATE INDEX IF NOT EXISTS idx_brain_req_created ON brain_request_logs(created_at DESC);

-- Brain thinking and tool configs (from 011)
CREATE TABLE IF NOT EXISTS brain_thinking_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brain_template_id UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
    thinking_enabled BOOLEAN DEFAULT false,
    thinking_style VARCHAR(50) DEFAULT 'structured',
    show_thinking_to_user BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_tool_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brain_template_id UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    tool_type VARCHAR(50) DEFAULT 'function',
    description TEXT,
    parameters JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tool_type VARCHAR(50) DEFAULT 'api_call',
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brain analytics & performance stats (from 011)
CREATE TABLE IF NOT EXISTS brain_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID REFERENCES brain_templates(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    hour_bucket TIMESTAMPTZ,
    day_bucket DATE,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2),
    p50_response_time_ms DECIMAL(10,2),
    p95_response_time_ms DECIMAL(10,2),
    p99_response_time_ms DECIMAL(10,2),
    total_input_tokens BIGINT DEFAULT 0,
    total_output_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    agent_usage JSONB DEFAULT '{}',
    intent_distribution JSONB DEFAULT '{}',
    avg_user_rating DECIMAL(3,2),
    feedback_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_analytics_org_time ON brain_analytics(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_brain_analytics_day ON brain_analytics(day_bucket, org_id);

CREATE TABLE IF NOT EXISTS brain_performance_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID REFERENCES brain_templates(id),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    timeout_count INTEGER DEFAULT 0,
    min_latency DECIMAL(10,2),
    max_latency DECIMAL(10,2),
    avg_latency DECIMAL(10,2),
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    rag_retrievals INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constitution rules (from 011)
CREATE TABLE IF NOT EXISTS constitution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    constitution_id UUID,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('brand_voice', 'compliance', 'forbidden', 'required', 'style', 'format')),
    rule_name VARCHAR(255) NOT NULL,
    rule_content TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    applies_to VARCHAR(50)[] DEFAULT ARRAY['all'],
    enforcement_level VARCHAR(20) DEFAULT 'strict' CHECK (enforcement_level IN ('strict', 'soft', 'advisory')),
    failure_action VARCHAR(50) DEFAULT 'block',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_constitution_rules_org ON constitution_rules(org_id, is_active);

-- User memory (from 011)
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN ('preference', 'fact', 'instruction', 'context', 'correction')),
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'conversation',
    confidence DECIMAL(3,2) DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id, memory_type, key)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_user_org ON user_memory(user_id, org_id, is_active);

-- Feedback (from 011)
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    conversation_id UUID,
    message_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50) DEFAULT 'general',
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(org_id, created_at DESC);

-- Training data tables (from 011)
CREATE TABLE IF NOT EXISTS training_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID REFERENCES brain_templates(id),
    title VARCHAR(500),
    quality_score DECIMAL(3,2),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES training_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    quality_score DECIMAL(3,2),
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers
CREATE TRIGGER trigger_update_brain_templates_timestamp
BEFORE UPDATE ON brain_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
