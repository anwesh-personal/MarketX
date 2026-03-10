-- MIGRATION 028 (ported): brain learning tables
BEGIN;

CREATE TABLE IF NOT EXISTS brain_memories (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id               UUID REFERENCES brain_agents(id) ON DELETE CASCADE,
  user_id                UUID REFERENCES users(id) ON DELETE CASCADE,
  scope                  TEXT NOT NULL DEFAULT 'org' CHECK (scope IN ('org', 'user', 'global')),
  memory_type            TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'outcome', 'pattern', 'correction')),
  content                TEXT NOT NULL,
  summary                TEXT,
  keywords               TEXT[] NOT NULL DEFAULT '{}',
  emotional_valence      FLOAT NOT NULL DEFAULT 0 CHECK (emotional_valence BETWEEN -1 AND 1),
  emotional_arousal      FLOAT NOT NULL DEFAULT 0 CHECK (emotional_arousal BETWEEN 0 AND 1),
  belief_id              UUID REFERENCES belief(id) ON DELETE SET NULL,
  angle_class            TEXT,
  resonance_score        FLOAT NOT NULL DEFAULT 0,
  resonance_links        UUID[] NOT NULL DEFAULT '{}',
  importance             FLOAT NOT NULL DEFAULT 0.5 CHECK (importance BETWEEN 0 AND 1),
  decay_rate             FLOAT NOT NULL DEFAULT 0.1 CHECK (decay_rate BETWEEN 0 AND 1),
  consolidation_count    INT NOT NULL DEFAULT 0,
  accessed_count         INT NOT NULL DEFAULT 0,
  source_conversation_id UUID,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brain_memories_org_idx ON brain_memories(org_id, is_active, importance DESC);
CREATE INDEX IF NOT EXISTS brain_memories_agent_idx ON brain_memories(agent_id, is_active);
CREATE INDEX IF NOT EXISTS brain_memories_type_idx ON brain_memories(memory_type, scope);
CREATE INDEX IF NOT EXISTS brain_memories_belief_idx ON brain_memories(belief_id) WHERE belief_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brain_memories_keywords_idx ON brain_memories USING GIN(keywords);
CREATE INDEX IF NOT EXISTS brain_memories_content_fts ON brain_memories USING GIN(to_tsvector('english', content));

DROP TRIGGER IF EXISTS brain_memories_updated_at ON brain_memories;
CREATE TRIGGER brain_memories_updated_at
  BEFORE UPDATE ON brain_memories
  FOR EACH ROW EXECUTE FUNCTION brain_agents_set_updated_at();

CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id           UUID REFERENCES brain_agents(id) ON DELETE CASCADE,
  domain             TEXT NOT NULL,
  description        TEXT NOT NULL,
  failed_queries     TEXT[] NOT NULL DEFAULT '{}',
  occurrence_count   INT NOT NULL DEFAULT 1,
  impact_level       TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  status             TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'learning', 'resolved', 'dismissed')),
  learning_resources TEXT[] NOT NULL DEFAULT '{}',
  resolution_notes   TEXT,
  first_identified   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_identified    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at        TIMESTAMPTZ,
  UNIQUE (org_id, domain, status)
);

CREATE INDEX IF NOT EXISTS knowledge_gaps_org_idx ON knowledge_gaps(org_id, status, impact_level DESC);
CREATE INDEX IF NOT EXISTS knowledge_gaps_agent_idx ON knowledge_gaps(agent_id, status);
CREATE INDEX IF NOT EXISTS knowledge_gaps_impact_idx ON knowledge_gaps(impact_level, occurrence_count DESC)
  WHERE status NOT IN ('resolved', 'dismissed');

CREATE TABLE IF NOT EXISTS brain_reflections (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id                  UUID REFERENCES brain_agents(id) ON DELETE CASCADE,
  trigger_type              TEXT NOT NULL CHECK (trigger_type IN ('generation_batch', 'signal_batch', 'conversation', 'manual')),
  trigger_id                UUID,
  quality_score             FLOAT CHECK (quality_score BETWEEN 0 AND 1),
  has_substance             BOOLEAN NOT NULL DEFAULT false,
  what_went_well            TEXT,
  what_could_improve        TEXT,
  knowledge_gaps_identified TEXT[] NOT NULL DEFAULT '{}',
  learning_points           TEXT[] NOT NULL DEFAULT '{}',
  angle_insights            JSONB NOT NULL DEFAULT '{}',
  belief_insights           JSONB NOT NULL DEFAULT '{}',
  analysis_duration_ms      INT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brain_reflections_org_idx ON brain_reflections(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brain_reflections_agent_idx ON brain_reflections(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brain_reflections_trigger_idx ON brain_reflections(trigger_type, trigger_id);

CREATE TABLE IF NOT EXISTS brain_dream_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id            UUID REFERENCES brain_agents(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'error', 'skipped')),
  trigger             TEXT NOT NULL DEFAULT 'nightly' CHECK (trigger IN ('nightly', 'manual', 'signal_threshold')),
  error_message       TEXT,
  signals_processed   INT NOT NULL DEFAULT 0,
  memories_created    INT NOT NULL DEFAULT 0,
  patterns_discovered INT NOT NULL DEFAULT 0,
  gaps_identified     INT NOT NULL DEFAULT 0,
  beliefs_reweighted  INT NOT NULL DEFAULT 0,
  narrative           TEXT,
  topics              TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS brain_dream_logs_org_idx ON brain_dream_logs(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS brain_dream_logs_status_idx ON brain_dream_logs(status);

ALTER TABLE brain_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_dream_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbls TEXT[] := ARRAY['brain_memories','knowledge_gaps','brain_reflections','brain_dream_logs'];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_select ON %I FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''superadmin'')
      )',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_write ON %I FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''superadmin'')
      )',
      tbl, tbl
    );
  END LOOP;
END $$;

COMMIT;
