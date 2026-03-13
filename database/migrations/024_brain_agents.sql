-- ============================================================
-- MIGRATION 024: BRAIN AGENTS
-- The deployed Agent entity. One per org (or per user for enterprise).
-- 
-- Design decisions:
-- 1. brain_agents is distinct from brain_templates (blueprint) and
--    org_brain_assignments (legacy link table).
-- 2. Prompt texts are COPIED at deploy time — not referenced.
--    Template changes never silently affect live agents.
-- 3. org_id + user_id UNIQUE ensures one active brain per context.
-- ============================================================

BEGIN;

-- Ensure organization_members exists (same schema as 010 / supabase 09). Safe if 010 already ran.
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
INSERT INTO organization_members (org_id, user_id, role)
  SELECT org_id, id, COALESCE(role, 'member') FROM users
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

CREATE TABLE IF NOT EXISTS brain_agents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = org-level, set = user-level

  -- Source template (audit trail — which template was used)
  template_id           UUID REFERENCES brain_templates(id) ON DELETE SET NULL,
  template_version      VARCHAR(50) NOT NULL DEFAULT '1.0.0',

  -- Identity
  name                  VARCHAR(255) NOT NULL,
  avatar_emoji          VARCHAR(10)  NOT NULL DEFAULT '🧠',
  tier                  TEXT         NOT NULL DEFAULT 'basic'
                          CHECK (tier IN ('basic', 'medium', 'enterprise')),
  status                TEXT         NOT NULL DEFAULT 'configuring'
                          CHECK (status IN ('configuring', 'training', 'active', 'paused', 'error')),

  -- Prompt Stack (each layer stored as plain text — snapshot at deploy time)
  -- Foundation and guardrails are LOCKED after deployment.
  -- Domain is editable by org_admin.
  foundation_prompt     TEXT         NOT NULL DEFAULT '',
  persona_prompt        TEXT         NOT NULL DEFAULT '',
  domain_prompt         TEXT,                                          -- filled during onboarding
  guardrails_prompt     TEXT         NOT NULL DEFAULT '',

  -- Provider Config
  use_platform_keys     BOOLEAN      NOT NULL DEFAULT true,            -- false = BYOK (enterprise only)
  preferred_provider    TEXT,                                          -- NULL = use platform priority
  preferred_model       TEXT,

  -- Capabilities
  tools_granted         TEXT[]       NOT NULL DEFAULT '{}',            -- brain_tools.name values
  agents_enabled        TEXT[]       NOT NULL DEFAULT '{"writer","generalist"}',

  -- RAG Config
  rag_top_k             INT          NOT NULL DEFAULT 8  CHECK (rag_top_k BETWEEN 1 AND 20),
  rag_min_confidence    FLOAT        NOT NULL DEFAULT 0.65 CHECK (rag_min_confidence BETWEEN 0.0 AND 1.0),
  rag_query_expansion   BOOLEAN      NOT NULL DEFAULT true,
  rag_fts_weight        FLOAT        NOT NULL DEFAULT 0.3  CHECK (rag_fts_weight BETWEEN 0.0 AND 1.0),
  rag_vector_weight     FLOAT        NOT NULL DEFAULT 0.7  CHECK (rag_vector_weight BETWEEN 0.0 AND 1.0),

  -- Behaviour
  max_turns             INT          NOT NULL DEFAULT 20 CHECK (max_turns BETWEEN 1 AND 25),
  strict_grounding      BOOLEAN      NOT NULL DEFAULT true,           -- refuse to answer outside KB when no context found
  response_language     TEXT         NOT NULL DEFAULT 'en',

  -- Lifecycle
  deployed_at           TIMESTAMPTZ,
  deployed_by           UUID         REFERENCES users(id) ON DELETE SET NULL,
  last_active_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- One active brain per (org, user) pair
  UNIQUE (org_id, user_id)
);

-- Indexes (IF NOT EXISTS for idempotent re-runs)
CREATE INDEX IF NOT EXISTS brain_agents_org_idx    ON brain_agents(org_id, status);
CREATE INDEX IF NOT EXISTS brain_agents_status_idx ON brain_agents(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION brain_agents_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop then create in one block so re-runs never hit "trigger already exists"
DO $$
BEGIN
  DROP TRIGGER IF EXISTS brain_agents_updated_at ON brain_agents;
  EXECUTE 'CREATE TRIGGER brain_agents_updated_at BEFORE UPDATE ON brain_agents FOR EACH ROW EXECUTE FUNCTION brain_agents_set_updated_at()';
END $$;

-- RLS
ALTER TABLE brain_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_agents_select ON brain_agents;
CREATE POLICY brain_agents_select ON brain_agents FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS brain_agents_write ON brain_agents;
CREATE POLICY brain_agents_write ON brain_agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND org_id = brain_agents.org_id AND role IN ('admin', 'owner')
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

-- ============================================================
-- VALIDATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'brain_agents'
  ) THEN
    RAISE EXCEPTION 'Migration 024 FAILED: brain_agents table not created';
  END IF;
  RAISE NOTICE '✓ Migration 024: brain_agents created';
END $$;

COMMIT;
