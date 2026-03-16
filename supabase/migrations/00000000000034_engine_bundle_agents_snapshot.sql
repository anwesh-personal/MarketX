-- ============================================================
-- MIGRATION 034: BUNDLE AGENTS CONFIG + DEPLOYMENT SNAPSHOT
-- ============================================================
-- engine_bundles.agents_config   — full agent specs prefilled (LLM, prompts, tools, RAG)
-- engine_instances.api_key       — per-deployment unique API key
-- engine_instances.snapshot      — immutable full copy of bundle at deploy time
-- engine_instances.overrides     — per-user granular customizations (any field)
-- engine_instances.api_key_hash  — hashed for secure comparison
-- ============================================================

BEGIN;

-- ── engine_bundles: add agents_config JSONB ─────────────────
-- Structure:
-- [
--   {
--     "role": "writer",
--     "name": "Email Specialist",
--     "is_primary": true,
--     "llm": { "provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "temperature": 0.7, "max_tokens": 4000 },
--     "prompts": { "foundation": "...", "persona": "...", "domain": "...", "guardrails": "..." },
--     "tools": ["write_email", "search_kb", "get_icp"],
--     "rag": { "top_k": 5, "min_confidence": 0.6, "strict_grounding": false },
--     "memory_enabled": true,
--     "max_turns": 20
--   }
-- ]
ALTER TABLE engine_bundles
  ADD COLUMN IF NOT EXISTS agents_config JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Default LLM for the bundle (fallback for agents that don't specify their own)
ALTER TABLE engine_bundles
  ADD COLUMN IF NOT EXISTS default_llm JSONB NOT NULL DEFAULT '{
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "temperature": 0.7,
    "max_tokens": 4000
  }'::JSONB;

-- ── engine_instances: deployment-level fields ────────────────

-- Unique API key for this deployed instance (e.g. axm_live_xxxx)
-- Generated on deploy, shown once, stored as plaintext for now
-- (In prod: encrypt at application layer before storing)
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Hashed version for secure comparison
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

-- FULL immutable snapshot of the bundle at deploy time
-- This is the source of truth for what this instance is running
-- Changing the master bundle does NOT affect this snapshot
-- Structure mirrors engine_bundles + resolved agent configs
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS snapshot JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Per-user/per-instance overrides
-- Superadmin can override ANY field from snapshot without touching master bundle
-- Structure (partial — only changed fields):
-- {
--   "agents": {
--     "writer": { "llm": { "model": "gpt-4o" } },          -- override just model for writer
--     "analyst": { "tools": ["fetch_metrics", "run_sql"] }  -- override tools for analyst
--   },
--   "default_llm": { "provider": "openai", "model": "gpt-4o" },
--   "workflow": { "timeout_ms": 120000 }
-- }
ALTER TABLE engine_instances
  ADD COLUMN IF NOT EXISTS overrides JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Resolved config = snapshot merged with overrides (computed on read, not stored)
-- This is what the runtime actually uses

-- Index for API key lookups (auth)
CREATE INDEX IF NOT EXISTS idx_engine_instances_api_key      ON engine_instances(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_engine_instances_api_key_hash ON engine_instances(api_key_hash) WHERE api_key_hash IS NOT NULL;

-- ── engine_instance_override_logs ───────────────────────────
-- Audit trail of every override change
CREATE TABLE IF NOT EXISTS engine_instance_override_logs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID    NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
  changed_by      UUID    REFERENCES users(id) ON DELETE SET NULL,
  field_path      TEXT    NOT NULL,   -- e.g. "agents.writer.llm.model"
  old_value       JSONB,
  new_value       JSONB,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_override_logs_instance ON engine_instance_override_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_override_logs_changed_by ON engine_instance_override_logs(changed_by);

-- ── Available LLM models reference (for bundle builder dropdowns) ──
-- If ai_models table doesn't exist, skip; UI falls back to hardcoded list
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ai_models'
  ) THEN
    CREATE TABLE ai_models (
      id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
      provider     TEXT    NOT NULL,
      model_id     TEXT    NOT NULL,
      display_name TEXT    NOT NULL,
      context_window INT,
      is_active    BOOLEAN NOT NULL DEFAULT TRUE,
      supports_streaming BOOLEAN DEFAULT TRUE,
      cost_per_1k_input  NUMERIC(10,6),
      cost_per_1k_output NUMERIC(10,6),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, model_id)
    );

    INSERT INTO ai_models (provider, model_id, display_name, context_window, cost_per_1k_input, cost_per_1k_output) VALUES
      ('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet',  200000, 0.003,  0.015),
      ('anthropic', 'claude-3-5-haiku-20241022',  'Claude 3.5 Haiku',   200000, 0.0008, 0.004),
      ('anthropic', 'claude-3-opus-20240229',      'Claude 3 Opus',      200000, 0.015,  0.075),
      ('openai',    'gpt-4o',                      'GPT-4o',             128000, 0.0025, 0.010),
      ('openai',    'gpt-4o-mini',                 'GPT-4o Mini',        128000, 0.00015,0.0006),
      ('openai',    'gpt-4-turbo',                 'GPT-4 Turbo',        128000, 0.010,  0.030),
      ('openai',    'o1-preview',                  'o1 Preview',         128000, 0.015,  0.060),
      ('google',    'gemini-2.0-flash',            'Gemini 2.0 Flash',   1000000,0.00035,0.00105),
      ('google',    'gemini-1.5-pro',              'Gemini 1.5 Pro',     2000000,0.00125,0.005),
      ('xai',       'grok-2-1212',                 'Grok 2',             131072, 0.002,  0.010),
      ('mistral',   'mistral-large-latest',        'Mistral Large',      128000, 0.002,  0.006),
      ('perplexity','llama-3.1-sonar-large-128k-online','Sonar Large Online',127072,0.001,0.001)
    ON CONFLICT (provider, model_id) DO NOTHING;
  END IF;
END $$;

COMMIT;
