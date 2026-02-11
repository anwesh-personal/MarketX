-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 01
-- Extensions & Core Foundation Tables
-- ============================================================
-- This is part of the unified migration system.
-- All 3 legacy systems (A, B, C) consolidated here.
-- Bugs fixed:
--   - No FK to auth.users (just UUID PKs)
--   - No functions in auth schema
--   - No REVOKE ALL FROM PUBLIC
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- SECTION 2: ORGANIZATIONS
-- Source: System A (002), System B (implicit), database/complete-setup.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
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
    client_id UUID, -- External IMT Client UUID (Migration 006 from System A)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_client_id ON organizations(client_id);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations';
COMMENT ON COLUMN organizations.client_id IS 'UUID reference to external InMarket Traffic Client record';

-- ============================================================
-- SECTION 3: PLATFORM ADMINS
-- Source: System A (003), System B (000), database/complete-setup.sql
-- BUG FIX: No FK to auth.users — just UUID PK
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);

COMMENT ON TABLE platform_admins IS 'Superadmin accounts for platform management';

-- ============================================================
-- SECTION 4: USERS
-- Source: System A (002), database/complete-setup.sql
-- BUG FIX: No FK to auth.users — just UUID PK
-- Includes theme columns from System A (004)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    can_upload_kb BOOLEAN DEFAULT false,
    can_trigger_runs BOOLEAN DEFAULT false,
    can_view_analytics BOOLEAN DEFAULT true,
    can_manage_team BOOLEAN DEFAULT false,
    theme_preference VARCHAR(50) DEFAULT 'minimalist-light',
    theme_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_theme_preference ON users(theme_preference);

COMMENT ON TABLE users IS 'Application users belonging to organizations';

-- ============================================================
-- SECTION 5: SYSTEM CONFIGS
-- Source: database/add-system-configs.sql, database/complete-setup.sql
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

COMMENT ON TABLE system_configs IS 'Application-wide configuration key-value store';

-- ============================================================
-- SECTION 6: HELPER FUNCTIONS (moved from auth schema to public)
-- Source: System A (002, 003)
-- BUG FIX: These were in auth schema, now in public
-- ============================================================

-- Get current user org_id (was auth.user_org_id)
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT org_id FROM users WHERE id = auth.uid()
$$;

-- Check if current user is platform admin (was auth.is_platform_admin)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_admins
        WHERE email = (auth.jwt() ->> 'email')
        AND is_active = true
    )
$$;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Theme timestamp trigger
CREATE OR REPLACE FUNCTION public.update_theme_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.theme_preference IS DISTINCT FROM OLD.theme_preference THEN
        NEW.theme_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply theme trigger to users
CREATE TRIGGER trigger_update_theme_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION public.update_theme_timestamp();

-- Apply updated_at trigger to organizations
CREATE TRIGGER trigger_update_organizations_timestamp
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Apply updated_at trigger to users
CREATE TRIGGER trigger_update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
