-- ============================================================
-- MIGRATION 033: ENGINE BUNDLES (ENGINE-AS-UNIT ARCHITECTURE)
-- ============================================================
-- engine_bundles  — master bundle template (superadmin creates)
--                   Brain Template + Workflow Template + Email Provider + API key mode
-- engine_instances — extended with bundle_id, brain_agent_id, assigned_user_id,
--                    api_key_mode, byok_keys, email_provider_id
--
-- Deploy flow:
--   1. Superadmin creates engine_bundle (master)
--   2. Superadmin deploys bundle to org → system:
--      a. Clones brain_template → creates brain_agents record for org
--      b. Creates engine_instances record (deployed clone) tied to bundle
-- ============================================================

BEGIN;

-- ============================================================
-- ENGINE BUNDLES (master templates — no org_id, superadmin-owned)
-- ============================================================
CREATE TABLE IF NOT EXISTS engine_bundles (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT    NOT NULL,
  description           TEXT,
  slug                  TEXT    UNIQUE,                             -- optional human-readable key

  -- Component references (the "bundle" definition)
  brain_template_id     UUID    REFERENCES brain_templates(id) ON DELETE SET NULL,
  workflow_template_id  UUID    REFERENCES workflow_templates(id) ON DELETE SET NULL,

  -- Email provider — nullable (org may bring their own)
  email_provider_id     TEXT,                                      -- FK loosely typed (email_providers.id may be UUID or text)

  -- API key strategy default
  default_api_key_mode  TEXT    NOT NULL DEFAULT 'platform'
                          CHECK (default_api_key_mode IN ('platform', 'byok', 'hybrid')),

  -- Feature flags / default settings for deployed instances
  config                JSONB   NOT NULL DEFAULT '{}'::JSONB,

  -- Tier tagging (echii / pulz / quanta)
  tier                  TEXT    DEFAULT 'echii'
                          CHECK (tier IN ('echii', 'pulz', 'quanta')),

  status                TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'draft', 'archived')),

  created_by            UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_bundles_status     ON engine_bundles(status);
CREATE INDEX IF NOT EXISTS idx_engine_bundles_brain_tmpl ON engine_bundles(brain_template_id);
CREATE INDEX IF NOT EXISTS idx_engine_bundles_wf_tmpl    ON engine_bundles(workflow_template_id);

-- ============================================================
-- EXTEND engine_instances → deployed clones of bundles
-- ============================================================

-- Link deployed instance back to its master bundle
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES engine_bundles(id) ON DELETE SET NULL;

-- The live brain agent deployed for this org (snapshot at deploy time)
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS brain_agent_id UUID REFERENCES brain_agents(id) ON DELETE SET NULL;

-- Which user this instance is assigned to (null = org-wide)
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- API key strategy for this deployed instance
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS api_key_mode TEXT NOT NULL DEFAULT 'platform'
    CHECK (api_key_mode IN ('platform', 'byok', 'hybrid'));

-- BYOK keys — stored encrypted (application-level encryption required before insert)
-- Structure: { "openai": "enc:...", "anthropic": "enc:...", ... }
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS byok_keys JSONB DEFAULT NULL;

-- Email provider linked to this deployed instance
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS email_provider_id TEXT DEFAULT NULL;

-- Per-instance email provider config (overrides bundle default)
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS email_provider_config JSONB DEFAULT NULL;

-- Is this the master bundle template (false = deployed clone)
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT FALSE;

-- Deployment metadata
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS deployed_at  TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS deployed_by  UUID REFERENCES users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engine_instances_bundle_id        ON engine_instances(bundle_id);
CREATE INDEX IF NOT EXISTS idx_engine_instances_brain_agent_id   ON engine_instances(brain_agent_id);
CREATE INDEX IF NOT EXISTS idx_engine_instances_assigned_user    ON engine_instances(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_engine_instances_api_key_mode     ON engine_instances(api_key_mode);

-- ============================================================
-- ENGINE BUNDLE DEPLOYMENTS (audit log of every deploy action)
-- ============================================================
CREATE TABLE IF NOT EXISTS engine_bundle_deployments (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id         UUID    NOT NULL REFERENCES engine_bundles(id) ON DELETE CASCADE,
  engine_instance_id UUID   NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
  org_id            UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_user_id  UUID    REFERENCES users(id) ON DELETE SET NULL,
  brain_agent_id    UUID    REFERENCES brain_agents(id) ON DELETE SET NULL,
  deployed_by       UUID    REFERENCES users(id) ON DELETE SET NULL,
  api_key_mode      TEXT    NOT NULL DEFAULT 'platform',
  deployment_notes  TEXT,
  status            TEXT    NOT NULL DEFAULT 'success'
                      CHECK (status IN ('success', 'failed', 'rolling_back')),
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundle_deployments_bundle   ON engine_bundle_deployments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_deployments_org      ON engine_bundle_deployments(org_id);
CREATE INDEX IF NOT EXISTS idx_bundle_deployments_instance ON engine_bundle_deployments(engine_instance_id);

-- ============================================================
-- UPDATED_AT TRIGGER for engine_bundles
-- ============================================================
CREATE OR REPLACE FUNCTION update_engine_bundles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_engine_bundles_updated_at ON engine_bundles;
CREATE TRIGGER trg_engine_bundles_updated_at
  BEFORE UPDATE ON engine_bundles
  FOR EACH ROW EXECUTE FUNCTION update_engine_bundles_updated_at();

COMMIT;
