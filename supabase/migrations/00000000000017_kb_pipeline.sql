-- MIGRATION 027 (ported): kb pipeline
BEGIN;

CREATE TABLE IF NOT EXISTS kb_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES brain_agents(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  description   TEXT,
  lock_level    TEXT NOT NULL DEFAULT 'org_admin' CHECK (lock_level IN ('superadmin', 'org_admin', 'user')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  doc_count     INT NOT NULL DEFAULT 0,
  chunk_count   INT NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, name)
);

CREATE INDEX IF NOT EXISTS kb_sections_agent_idx ON kb_sections(agent_id, is_active);
CREATE INDEX IF NOT EXISTS kb_sections_org_idx ON kb_sections(org_id);

CREATE TABLE IF NOT EXISTS kb_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id            UUID NOT NULL REFERENCES kb_sections(id) ON DELETE CASCADE,
  agent_id              UUID NOT NULL REFERENCES brain_agents(id) ON DELETE CASCADE,
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  content               TEXT NOT NULL,
  content_hash          TEXT NOT NULL,
  file_name             TEXT,
  file_type             TEXT,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'chunking', 'embedding', 'ready', 'error', 'stale')),
  chunk_count           INT NOT NULL DEFAULT 0,
  embed_model           TEXT,
  error_message         TEXT,
  processing_started_at TIMESTAMPTZ,
  last_embedded         TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  uploaded_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_documents_section_idx ON kb_documents(section_id, is_active);
CREATE INDEX IF NOT EXISTS kb_documents_agent_idx ON kb_documents(agent_id, status);
CREATE INDEX IF NOT EXISTS kb_documents_hash_idx ON kb_documents(content_hash);

DROP TRIGGER IF EXISTS kb_documents_updated_at ON kb_documents;
CREATE TRIGGER kb_documents_updated_at
  BEFORE UPDATE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION brain_agents_set_updated_at();

CREATE OR REPLACE FUNCTION kb_sections_sync_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE kb_sections
    SET doc_count = doc_count + 1, last_updated = now()
    WHERE id = NEW.section_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true) THEN
    UPDATE kb_sections
    SET doc_count = GREATEST(doc_count - 1, 0), last_updated = now()
    WHERE id = COALESCE(NEW.section_id, OLD.section_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS kb_documents_count_sync ON kb_documents;
CREATE TRIGGER kb_documents_count_sync
  AFTER INSERT OR UPDATE OR DELETE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION kb_sections_sync_counts();

ALTER TABLE kb_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_sections_select ON kb_sections;
CREATE POLICY kb_sections_select ON kb_sections FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS kb_sections_write ON kb_sections;
CREATE POLICY kb_sections_write ON kb_sections FOR ALL
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS kb_documents_select ON kb_documents;
CREATE POLICY kb_documents_select ON kb_documents FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS kb_documents_write ON kb_documents;
CREATE POLICY kb_documents_write ON kb_documents FOR ALL
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

COMMIT;
