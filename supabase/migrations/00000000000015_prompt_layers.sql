-- MIGRATION 025 (ported): prompt_layers
BEGIN;

CREATE TABLE IF NOT EXISTS prompt_layers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_type   TEXT NOT NULL CHECK (layer_type IN ('foundation', 'persona', 'guardrails', 'domain_seed')),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  content      TEXT NOT NULL,
  version      INT NOT NULL DEFAULT 1,
  parent_id    UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  tier         TEXT NOT NULL DEFAULT 'all' CHECK (tier IN ('basic', 'medium', 'enterprise', 'all')),
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prompt_layers_type_idx ON prompt_layers(layer_type, is_active);
CREATE INDEX IF NOT EXISTS prompt_layers_tier_idx ON prompt_layers(tier, is_active);

CREATE OR REPLACE FUNCTION prompt_layers_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prompt_layers_updated_at ON prompt_layers;
CREATE TRIGGER prompt_layers_updated_at
  BEFORE UPDATE ON prompt_layers
  FOR EACH ROW EXECUTE FUNCTION prompt_layers_set_updated_at();

ALTER TABLE prompt_layers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_layers_read ON prompt_layers;
CREATE POLICY prompt_layers_read ON prompt_layers FOR SELECT
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS prompt_layers_write ON prompt_layers;
CREATE POLICY prompt_layers_write ON prompt_layers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

ALTER TABLE brain_templates
  ADD COLUMN IF NOT EXISTS foundation_layer_id UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS persona_layer_id UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guardrails_layer_id UUID REFERENCES prompt_layers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_tools TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_agents TEXT[] NOT NULL DEFAULT '{"writer","generalist"}',
  ADD COLUMN IF NOT EXISTS default_rag_config JSONB NOT NULL DEFAULT '{
    "topK": 8,
    "minConfidence": 0.65,
    "queryExpansion": true,
    "ftsWeight": 0.3,
    "vectorWeight": 0.7
  }';

COMMIT;
