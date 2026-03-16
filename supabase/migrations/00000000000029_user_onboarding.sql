-- ============================================================
-- User Onboarding System
-- Tracks onboarding completion and stores collected data
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 6,
    company_data JSONB DEFAULT '{}',
    icp_data JSONB DEFAULT '[]',
    offer_data JSONB DEFAULT '{}',
    voice_data JSONB DEFAULT '{}',
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_sessions_select ON onboarding_sessions;
CREATE POLICY onboarding_sessions_select ON onboarding_sessions
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS onboarding_sessions_write ON onboarding_sessions;
CREATE POLICY onboarding_sessions_write ON onboarding_sessions
    FOR ALL USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid())
    );

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_org ON onboarding_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
