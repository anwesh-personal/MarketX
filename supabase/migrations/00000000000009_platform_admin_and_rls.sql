-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 09
-- Platform Admin Features + RLS Policies
-- Source: System A (005), database/complete-setup.sql
-- ============================================================

-- ============================================================
-- IMPERSONATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS impersonation_logs (
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

CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON impersonation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target ON impersonation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_started ON impersonation_logs(started_at);

-- ============================================================
-- LICENSE TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS license_transactions (
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

CREATE INDEX IF NOT EXISTS idx_license_tx_org ON license_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_license_tx_admin ON license_transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_license_tx_type ON license_transactions(transaction_type);

-- ============================================================
-- TEAM INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS team_invitations (
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

CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON team_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- ============================================================
-- SUPERADMIN AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS superadmin_audit_log (
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

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON superadmin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON superadmin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON superadmin_audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON superadmin_audit_log(created_at);

-- General audit logs (used by impersonate API)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    actor_id UUID,
    actor_email VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- ORGANIZATION MEMBERS (view for RLS lookups)
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION log_superadmin_action(
    p_admin_id UUID, p_action VARCHAR, p_resource_type VARCHAR,
    p_resource_id UUID, p_changes JSONB DEFAULT NULL, p_ip_address VARCHAR DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_log_id UUID;
BEGIN
    INSERT INTO superadmin_audit_log (admin_id, action, resource_type, resource_id, changes, ip_address)
    VALUES (p_admin_id, p_action, p_resource_type, p_resource_id, p_changes, p_ip_address)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_organization_with_audit(
    p_admin_id UUID, p_org_name VARCHAR, p_slug VARCHAR, p_plan VARCHAR, p_quotas JSONB
) RETURNS TABLE (org_id UUID, transaction_id UUID) LANGUAGE plpgsql AS $$
DECLARE v_org_id UUID; v_transaction_id UUID;
BEGIN
    INSERT INTO organizations (name, slug, plan, status, max_kbs, max_runs_per_month, max_team_members)
    VALUES (p_org_name, p_slug, p_plan, 'active',
        COALESCE((p_quotas->>'max_kbs')::INTEGER, 1),
        COALESCE((p_quotas->>'max_runs_per_month')::INTEGER, 10),
        COALESCE((p_quotas->>'max_team_members')::INTEGER, 3))
    RETURNING id INTO v_org_id;
    INSERT INTO license_transactions (org_id, admin_id, transaction_type, to_plan, quota_changes)
    VALUES (v_org_id, p_admin_id, 'created', p_plan, p_quotas)
    RETURNING id INTO v_transaction_id;
    PERFORM log_superadmin_action(p_admin_id, 'create_organization', 'organization', v_org_id,
        jsonb_build_object('plan', p_plan, 'quotas', p_quotas), NULL);
    RETURN QUERY SELECT v_org_id, v_transaction_id;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Applied to all tenant tables (using public.* functions)
-- ============================================================

-- Core tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_rules ENABLE ROW LEVEL SECURITY;

-- Brain tables
ALTER TABLE brain_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Agent tables
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_resonance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interaction_summary ENABLE ROW LEVEL SECURITY;

-- Worker tables
ALTER TABLE dream_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vps_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_deployment_config ENABLE ROW LEVEL SECURITY;

-- Workflow tables
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_api_key_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_palette ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_run_logs ENABLE ROW LEVEL SECURITY;

-- AI tables
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- KEY RLS POLICIES (non-exhaustive, service_role bypasses)
-- ============================================================

-- Organizations: users see own org
DROP POLICY IF EXISTS "Users see own org" ON organizations;
CREATE POLICY "Users see own org" ON organizations FOR SELECT
    USING (id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users: see org members
DROP POLICY IF EXISTS "Users see org users" ON users;
CREATE POLICY "Users see org users" ON users FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Knowledge bases: org scoped
DROP POLICY IF EXISTS "Users see org KBs" ON knowledge_bases;
CREATE POLICY "Users see org KBs" ON knowledge_bases FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Workflow templates: superadmin full access
DROP POLICY IF EXISTS "Superadmin full access to workflow_templates" ON workflow_templates;
CREATE POLICY "Superadmin full access to workflow_templates" ON workflow_templates FOR ALL USING (true);

-- Node palette: authenticated users view active
DROP POLICY IF EXISTS "View active node palette" ON node_palette;
CREATE POLICY "View active node palette" ON node_palette FOR SELECT USING (is_active = true);

-- Engine instances: org scoped
DROP POLICY IF EXISTS "Users see org engines" ON engine_instances;
CREATE POLICY "Users see org engines" ON engine_instances FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Engine run logs: org scoped
DROP POLICY IF EXISTS "Users see org run logs" ON engine_run_logs;
CREATE POLICY "Users see org run logs" ON engine_run_logs FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- AI providers: org scoped
DROP POLICY IF EXISTS "Users see org AI providers" ON ai_providers;
CREATE POLICY "Users see org AI providers" ON ai_providers FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Worker deployment config: superadmin only
DROP POLICY IF EXISTS "Superadmin access worker config" ON worker_deployment_config;
CREATE POLICY "Superadmin access worker config" ON worker_deployment_config FOR ALL
    USING (EXISTS (SELECT 1 FROM platform_admins WHERE email = auth.jwt() ->> 'email' AND is_active = true));

-- Service role bypass for worker config
DROP POLICY IF EXISTS "Service role access worker config" ON worker_deployment_config;
CREATE POLICY "Service role access worker config" ON worker_deployment_config FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- VPS servers: superadmin
DROP POLICY IF EXISTS "Superadmin access vps_servers" ON vps_servers;
CREATE POLICY "Superadmin access vps_servers" ON vps_servers FOR ALL
    USING (auth.jwt() ->> 'role' = 'superadmin');

-- Agent memory: own data only
DROP POLICY IF EXISTS "Users own agent memory" ON agent_memory;
CREATE POLICY "Users own agent memory" ON agent_memory FOR ALL USING (user_id = auth.uid());

-- Feedback: users submit own
DROP POLICY IF EXISTS "Users submit feedback" ON feedback;
CREATE POLICY "Users submit feedback" ON feedback FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users see org feedback" ON feedback;
CREATE POLICY "Users see org feedback" ON feedback FOR SELECT
    USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
