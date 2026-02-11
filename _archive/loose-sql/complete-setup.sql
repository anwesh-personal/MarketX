-- ============================================================
-- AXIOM ENGINE - COMPLETE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- MIGRATION 1: Multi-Tenancy Foundation
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    max_kbs INTEGER DEFAULT 1,
    max_runs_per_month INTEGER DEFAULT 10,
    max_team_members INTEGER DEFAULT 3,
    current_kbs_count INTEGER DEFAULT 0,
    runs_this_month INTEGER DEFAULT 0,
    client_id UUID, -- External InMarket Traffic Client UUID for integration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_client_id ON organizations(client_id);

COMMENT ON COLUMN organizations.client_id IS 'UUID reference to external InMarket Traffic Client record. Used for Client API and Contact API integrations.';

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    can_upload_kb BOOLEAN DEFAULT false,
    can_trigger_runs BOOLEAN DEFAULT false,
    can_view_analytics BOOLEAN DEFAULT true,
    can_manage_team BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Knowledge Bases table
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    data JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_bases_org_id ON knowledge_bases(org_id);
CREATE INDEX idx_knowledge_bases_version ON knowledge_bases(version);

-- Runs table
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(id),
    triggered_by UUID REFERENCES users(id),
    writer_input JSONB NOT NULL,
    writer_output JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_runs_org_id ON runs(org_id);
CREATE INDEX idx_runs_kb_id ON runs(kb_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);

-- Analytics Events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID REFERENCES runs(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_org_id ON analytics_events(org_id);
CREATE INDEX idx_analytics_events_run_id ON analytics_events(run_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Learning Rules table
CREATE TABLE learning_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(id),
    rule_type VARCHAR(100) NOT NULL,
    condition JSONB NOT NULL,
    action JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_rules_org_id ON learning_rules(org_id);
CREATE INDEX idx_learning_rules_kb_id ON learning_rules(kb_id);
CREATE INDEX idx_learning_rules_is_active ON learning_rules(is_active);

-- ============================================================
-- MIGRATION 2: Platform Superadmin & Workers
-- ============================================================

-- Platform Admins table
CREATE TABLE platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_admins_email ON platform_admins(email);

-- Jobs table (for async worker execution)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'running', 'completed', 'failed')),
    priority INTEGER DEFAULT 0,
    claimed_by UUID,
    claimed_at TIMESTAMPTZ,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
CREATE INDEX idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

-- Workers table (heartbeat tracking)
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_type VARCHAR(100) NOT NULL,
    hostname VARCHAR(255),
    pid INTEGER,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'dead')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workers_worker_type ON workers(worker_type);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_workers_last_heartbeat ON workers(last_heartbeat DESC);

-- Platform Usage Stats table
CREATE TABLE platform_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    runs_count INTEGER DEFAULT 0,
    kb_updates_count INTEGER DEFAULT 0,
    analytics_events_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_usage_stats_org_id ON platform_usage_stats(org_id);
CREATE INDEX idx_platform_usage_stats_date ON platform_usage_stats(date DESC);

-- ============================================================
-- MIGRATION 3: Theme System
-- ============================================================

-- Add theme columns to users table
ALTER TABLE users 
ADD COLUMN theme_preference VARCHAR(50) DEFAULT 'minimalist-light',
ADD COLUMN theme_updated_at TIMESTAMPTZ;

-- Add constraint for valid themes
ALTER TABLE users
ADD CONSTRAINT check_theme_preference 
CHECK (theme_preference IN (
    'minimalist-light', 'minimalist-dark',
    'aqua-light', 'aqua-dark',
    'modern-light', 'modern-dark'
));

-- Create index for theme queries
CREATE INDEX idx_users_theme_preference ON users(theme_preference);

-- Auto-update theme_updated_at trigger
CREATE OR REPLACE FUNCTION update_theme_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.theme_preference IS DISTINCT FROM OLD.theme_preference THEN
        NEW.theme_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_theme_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_theme_timestamp();

-- ============================================================
-- MIGRATION 4: Superadmin Features
-- ============================================================

-- Impersonation Logs table
CREATE TABLE impersonation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    actions_taken JSONB DEFAULT '[]',
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_impersonation_logs_admin_id ON impersonation_logs(admin_id);
CREATE INDEX idx_impersonation_logs_target_user_id ON impersonation_logs(target_user_id);
CREATE INDEX idx_impersonation_logs_started_at ON impersonation_logs(started_at);

-- License Transactions table
CREATE TABLE license_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES platform_admins(id),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'created', 'upgraded', 'downgraded', 
        'gifted', 'suspended', 'reactivated',
        'quota_updated', 'plan_changed'
    )),
    from_plan VARCHAR(50),
    to_plan VARCHAR(50),
    price_usd DECIMAL(10,2),
    quota_changes JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_transactions_org_id ON license_transactions(org_id);
CREATE INDEX idx_license_transactions_admin_id ON license_transactions(admin_id);
CREATE INDEX idx_license_transactions_transaction_type ON license_transactions(transaction_type);
CREATE INDEX idx_license_transactions_created_at ON license_transactions(created_at);

-- Team Invitations table
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_invitations_org_id ON team_invitations(org_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE UNIQUE INDEX idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- Superadmin Audit Log table
CREATE TABLE superadmin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES platform_admins(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_superadmin_audit_log_admin_id ON superadmin_audit_log(admin_id);
CREATE INDEX idx_superadmin_audit_log_action ON superadmin_audit_log(action);
CREATE INDEX idx_superadmin_audit_log_resource_type ON superadmin_audit_log(resource_type);
CREATE INDEX idx_superadmin_audit_log_created_at ON superadmin_audit_log(created_at);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to log superadmin actions
CREATE OR REPLACE FUNCTION log_superadmin_action(
    p_admin_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_changes JSONB DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO superadmin_audit_log (
        admin_id, action, resource_type, resource_id, changes, ip_address
    )
    VALUES (
        p_admin_id, p_action, p_resource_type, p_resource_id, p_changes, p_ip_address
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function to create organization with audit trail
CREATE OR REPLACE FUNCTION create_organization_with_audit(
    p_admin_id UUID,
    p_org_name VARCHAR,
    p_slug VARCHAR,
    p_plan VARCHAR,
    p_quotas JSONB
)
RETURNS TABLE (
    org_id UUID,
    transaction_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_org_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Create organization
    INSERT INTO organizations (name, slug, plan, status, max_kbs, max_runs_per_month, max_team_members)
    VALUES (
        p_org_name,
        p_slug,
        p_plan,
        'active',
        COALESCE((p_quotas->>'max_kbs')::INTEGER, 1),
        COALESCE((p_quotas->>'max_runs_per_month')::INTEGER, 10),
        COALESCE((p_quotas->>'max_team_members')::INTEGER, 3)
    )
    RETURNING id INTO v_org_id;
    
    -- Log transaction
    INSERT INTO license_transactions (org_id, admin_id, transaction_type, to_plan, quota_changes)
    VALUES (v_org_id, p_admin_id, 'created', p_plan, p_quotas)
    RETURNING id INTO v_transaction_id;
    
    -- Audit log
    PERFORM log_superadmin_action(
        p_admin_id,
        'create_organization',
        'organization',
        v_org_id,
        jsonb_build_object('plan', p_plan, 'quotas', p_quotas),
        NULL
    );
    
    RETURN QUERY SELECT v_org_id, v_transaction_id;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_rules ENABLE ROW LEVEL SECURITY;

-- Users can see their own organization
CREATE POLICY "Users see own org"
ON organizations FOR SELECT
USING (id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users can see users in their organization
CREATE POLICY "Users see org users"
ON users FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users can see their org's KBs
CREATE POLICY "Users see org KBs"
ON knowledge_bases FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users can see their org's runs
CREATE POLICY "Users see org runs"
ON runs FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users can see their org's analytics
CREATE POLICY "Users see org analytics"
ON analytics_events FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users can see their org's learning rules
CREATE POLICY "Users see org learning rules"
ON learning_rules FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- MIGRATION 5: AI Provider Management
-- ============================================================

-- Add password support for authentication
ALTER TABLE platform_admins 
ADD COLUMN password_hash VARCHAR(255);

ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255);

-- AI Providers table (API Keys Management)
CREATE TABLE ai_providers (
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

CREATE INDEX idx_ai_providers_user_id ON ai_providers(user_id);
CREATE INDEX idx_ai_providers_org_id ON ai_providers(org_id);
CREATE INDEX idx_ai_providers_provider ON ai_providers(provider);
CREATE INDEX idx_ai_providers_is_active ON ai_providers(is_active);

-- AI Model Metadata table (Discovered Models)
CREATE TABLE ai_model_metadata (
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

CREATE INDEX idx_ai_model_metadata_user_id ON ai_model_metadata(user_id);
CREATE INDEX idx_ai_model_metadata_org_id ON ai_model_metadata(org_id);
CREATE INDEX idx_ai_model_metadata_provider ON ai_model_metadata(provider);
CREATE INDEX idx_ai_model_metadata_model_id ON ai_model_metadata(model_id);
CREATE INDEX idx_ai_model_metadata_is_active ON ai_model_metadata(is_active);

-- System Configs table
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES platform_admins(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_configs_key ON system_configs(key);

-- Auto-update triggers
CREATE OR REPLACE FUNCTION update_ai_providers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_providers_timestamp
BEFORE UPDATE ON ai_providers
FOR EACH ROW
EXECUTE FUNCTION update_ai_providers_timestamp();

-- RLS for AI tables
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see org AI providers"
ON ai_providers FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users see org AI models"
ON ai_model_metadata FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- INITIAL DATA (Optional - for testing)
-- ============================================================

-- Create a test superadmin (CHANGE PASSWORD BEFORE PRODUCTION!)
INSERT INTO platform_admins (email, full_name, is_active)
VALUES ('admin@axiom.com', 'Platform Administrator', true);

-- ============================================================
-- COMPLETE!
-- ============================================================
-- All 17 tables created successfully (including AI management)
-- You can now start using the Axiom Engine platform
-- ============================================================
