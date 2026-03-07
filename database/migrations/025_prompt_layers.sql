-- ============================================================
-- MIGRATION 025: PROMPT LAYERS
-- Reusable prompt layer library managed by superadmin.
-- brain_agents COPY these at deploy time — not reference them.
-- This ensures live agents are never affected by template edits.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS prompt_layers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  layer_type   TEXT NOT NULL
                 CHECK (layer_type IN ('foundation', 'persona', 'guardrails', 'domain_seed')),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  content      TEXT NOT NULL,

  -- Versioning (each edit creates a new row — old rows kept as history)
  version      INT  NOT NULL DEFAULT 1,
  parent_id    UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,  -- previous version

  -- Availability
  is_active    BOOLEAN NOT NULL DEFAULT true,
  tier         TEXT    NOT NULL DEFAULT 'all'
                 CHECK (tier IN ('basic', 'medium', 'enterprise', 'all')),

  -- Audit
  created_by   UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX prompt_layers_type_idx   ON prompt_layers(layer_type, is_active);
CREATE INDEX prompt_layers_tier_idx   ON prompt_layers(tier, is_active);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION prompt_layers_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER prompt_layers_updated_at
  BEFORE UPDATE ON prompt_layers
  FOR EACH ROW EXECUTE FUNCTION prompt_layers_set_updated_at();

-- RLS: superadmin only for writes; all authenticated users can read active layers
-- (agents need to read prompts at runtime)
ALTER TABLE prompt_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY prompt_layers_read ON prompt_layers FOR SELECT
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY prompt_layers_write ON prompt_layers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

-- ============================================================
-- Add prompt layer FK references to brain_templates
-- ============================================================
ALTER TABLE brain_templates
  ADD COLUMN IF NOT EXISTS foundation_layer_id  UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS persona_layer_id     UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guardrails_layer_id  UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_tools        TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_agents       TEXT[]  NOT NULL DEFAULT '{"writer","generalist"}',
  ADD COLUMN IF NOT EXISTS default_rag_config   JSONB   NOT NULL DEFAULT '{
    "topK": 8,
    "minConfidence": 0.65,
    "queryExpansion": true,
    "ftsWeight": 0.3,
    "vectorWeight": 0.7
  }';

-- ============================================================
-- VALIDATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'prompt_layers'
  ) THEN
    RAISE EXCEPTION 'Migration 025 FAILED: prompt_layers table not created';
  END IF;
  RAISE NOTICE '✓ Migration 025: prompt_layers created';
END $$;

COMMIT;
