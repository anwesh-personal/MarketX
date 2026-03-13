-- ============================================================
-- MIGRATION 035: EXTENDED INFRASTRUCTURE CONFIG
-- ============================================================
-- Extends worker_deployment_config with:
--   - Redis URL (stored in DB, not env)
--   - Worker API URL (dynamic per deployment target)
--   - Dedicated server as a 3rd deployment target
--   - AI API keys (stored encrypted, UI-manageable)
--   - Queue concurrency controls per queue
--   - Test status / last ping per connection
-- ============================================================

BEGIN;

-- ── 1. Extend worker_deployment_config ──────────────────────

-- Allow dedicated server as deployment target
ALTER TABLE worker_deployment_config
  DROP CONSTRAINT IF EXISTS worker_deployment_config_active_target_check;

ALTER TABLE worker_deployment_config
  ADD CONSTRAINT worker_deployment_config_active_target_check
  CHECK (active_target IN ('railway', 'vps', 'dedicated', 'local'));

ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS active_target_label TEXT DEFAULT NULL;  -- human name for UI

-- ── Redis config (managed from UI, not .env) ────────────────
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS redis_url       TEXT DEFAULT NULL;           -- e.g. redis://user:pass@host:6379
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS redis_password  TEXT DEFAULT NULL;           -- separate if URL doesn't include it
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS redis_db        INTEGER DEFAULT 0;
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS redis_tls       BOOLEAN DEFAULT FALSE;       -- Railway Redis needs TLS
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS redis_last_ping TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS redis_status    TEXT DEFAULT 'unconfigured'  -- 'ok' | 'error' | 'unconfigured'
    CHECK (redis_status IN ('ok', 'error', 'unconfigured', 'testing'));
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS redis_error     TEXT DEFAULT NULL;

-- ── Worker API URL ───────────────────────────────────────────
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS worker_api_url TEXT DEFAULT NULL;       -- where workers management API runs
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS worker_api_secret TEXT DEFAULT NULL;    -- optional auth header
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS worker_last_ping TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS worker_status   TEXT DEFAULT 'unconfigured'
    CHECK (worker_status IN ('ok', 'error', 'unconfigured', 'testing'));

-- ── Dedicated server config ──────────────────────────────────
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS dedicated_host     TEXT DEFAULT NULL;
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS dedicated_port     INTEGER DEFAULT 22;
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS dedicated_username TEXT DEFAULT NULL;
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS dedicated_password TEXT DEFAULT NULL;   -- stored encrypted
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS dedicated_ssh_key  TEXT DEFAULT NULL;   -- PEM key alternative

-- ── Queue concurrency controls ───────────────────────────────
-- JSON: { "engine-execution": 4, "kb-processor": 10, "learning-loop": 1, ... }
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS queue_concurrency JSONB DEFAULT '{
    "engine-execution": 2,
    "kb-processor": 5,
    "conversation": 3,
    "analytics": 2,
    "dream-state": 2,
    "fine-tuning": 1,
    "learning-loop": 1,
    "workflow-execution": 10
  }'::JSONB;

-- ── Misc worker settings ─────────────────────────────────────
ALTER TABLE worker_deployment_config
  ADD COLUMN IF NOT EXISTS worker_env_vars JSONB DEFAULT '{}'::JSONB;  -- extra env vars for workers

-- ── 2. AI API Keys table ──────────────────────────────────────
-- Store AI provider keys from UI (superadmin sets these)
-- Workers + brain routes read from here instead of env vars
CREATE TABLE IF NOT EXISTS platform_ai_keys (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     TEXT    NOT NULL UNIQUE,  -- 'openai', 'anthropic', 'google', 'xai', 'mistral', 'perplexity'
  api_key      TEXT    NOT NULL,         -- stored encrypted (app-level encryption)
  base_url     TEXT    DEFAULT NULL,     -- optional override for self-hosted models
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested  TIMESTAMPTZ DEFAULT NULL,
  test_status  TEXT    DEFAULT 'untested' CHECK (test_status IN ('ok', 'error', 'untested', 'testing')),
  test_model   TEXT    DEFAULT NULL,     -- which model was used in last test
  test_error   TEXT    DEFAULT NULL,
  notes        TEXT    DEFAULT NULL,     -- e.g. "production key", "backup key"
  updated_by   UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_keys_provider ON platform_ai_keys(provider);
CREATE INDEX IF NOT EXISTS idx_ai_keys_active ON platform_ai_keys(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_platform_ai_keys_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_keys_updated_at ON platform_ai_keys;
CREATE TRIGGER trg_ai_keys_updated_at
  BEFORE UPDATE ON platform_ai_keys
  FOR EACH ROW EXECUTE FUNCTION update_platform_ai_keys_ts();

-- RLS
ALTER TABLE platform_ai_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_ai_keys" ON platform_ai_keys;
CREATE POLICY "service_role_ai_keys" ON platform_ai_keys
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ── 3. Infrastructure audit log ──────────────────────────────
CREATE TABLE IF NOT EXISTS infra_config_audit (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by   TEXT        NOT NULL,   -- admin email
  section      TEXT        NOT NULL,   -- 'redis', 'worker', 'vps', 'railway', 'dedicated', 'ai_key'
  field        TEXT        NOT NULL,
  old_value    TEXT,                   -- masked if sensitive
  new_value    TEXT,                   -- masked if sensitive
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_infra_audit_section ON infra_config_audit(section);
CREATE INDEX IF NOT EXISTS idx_infra_audit_created ON infra_config_audit(created_at DESC);

COMMIT;
