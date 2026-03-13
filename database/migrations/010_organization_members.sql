-- ============================================================
-- MIGRATION 010: ORGANIZATION MEMBERS
-- Canonical org membership table for RLS. Required by 011, 024, 027, 028.
-- Schema matches supabase/migrations/00000000000009_platform_admin_and_rls.sql.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS organization_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);

-- Backfill from users so existing rows work with RLS (one org per user in users table)
INSERT INTO organization_members (org_id, user_id, role)
  SELECT org_id, id, COALESCE(role, 'member') FROM users
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organization_members'
  ) THEN
    RAISE EXCEPTION 'Migration 010 FAILED: organization_members table not created';
  END IF;
  RAISE NOTICE '✓ Migration 010: organization_members created';
END $$;

COMMIT;
