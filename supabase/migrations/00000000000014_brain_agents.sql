-- MIGRATION 024 (ported): brain_agents
BEGIN;

CREATE TABLE IF NOT EXISTS brain_agents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id           UUID REFERENCES brain_templates(id) ON DELETE SET NULL,
  template_version      VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  name                  VARCHAR(255) NOT NULL,
  avatar_emoji          VARCHAR(10) NOT NULL DEFAULT '🧠',
  tier                  TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'medium', 'enterprise')),
  status                TEXT NOT NULL DEFAULT 'configuring' CHECK (status IN ('configuring', 'training', 'active', 'paused', 'error')),
  foundation_prompt     TEXT NOT NULL DEFAULT '',
  persona_prompt        TEXT NOT NULL DEFAULT '',
  domain_prompt         TEXT,
  guardrails_prompt     TEXT NOT NULL DEFAULT '',
  use_platform_keys     BOOLEAN NOT NULL DEFAULT true,
  preferred_provider    TEXT,
  preferred_model       TEXT,
  tools_granted         TEXT[] NOT NULL DEFAULT '{}',
  agents_enabled        TEXT[] NOT NULL DEFAULT '{"writer","generalist"}',
  rag_top_k             INT NOT NULL DEFAULT 8 CHECK (rag_top_k BETWEEN 1 AND 20),
  rag_min_confidence    FLOAT NOT NULL DEFAULT 0.65 CHECK (rag_min_confidence BETWEEN 0.0 AND 1.0),
  rag_query_expansion   BOOLEAN NOT NULL DEFAULT true,
  rag_fts_weight        FLOAT NOT NULL DEFAULT 0.3 CHECK (rag_fts_weight BETWEEN 0.0 AND 1.0),
  rag_vector_weight     FLOAT NOT NULL DEFAULT 0.7 CHECK (rag_vector_weight BETWEEN 0.0 AND 1.0),
  max_turns             INT NOT NULL DEFAULT 20 CHECK (max_turns BETWEEN 1 AND 25),
  strict_grounding      BOOLEAN NOT NULL DEFAULT true,
  response_language     TEXT NOT NULL DEFAULT 'en',
  deployed_at           TIMESTAMPTZ,
  deployed_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  last_active_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS brain_agents_org_idx ON brain_agents(org_id, status);
CREATE INDEX IF NOT EXISTS brain_agents_status_idx ON brain_agents(status);

CREATE OR REPLACE FUNCTION brain_agents_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brain_agents_updated_at ON brain_agents;
CREATE TRIGGER brain_agents_updated_at
  BEFORE UPDATE ON brain_agents
  FOR EACH ROW EXECUTE FUNCTION brain_agents_set_updated_at();

ALTER TABLE brain_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_agents_select ON brain_agents;
CREATE POLICY brain_agents_select ON brain_agents FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS brain_agents_write ON brain_agents;
CREATE POLICY brain_agents_write ON brain_agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND users.org_id = brain_agents.org_id
        AND role IN ('admin', 'owner')
    )
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

COMMIT;
