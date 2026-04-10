-- KB Extraction Jobs — tracks async document extraction status
-- Queued by /api/kb/extract → processed by kb-extraction-processor worker
-- Frontend polls /api/kb/extract/status?id=xxx

CREATE TABLE IF NOT EXISTS public.kb_extraction_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- File metadata
    file_name       TEXT NOT NULL,
    file_size       INTEGER NOT NULL DEFAULT 0,
    mime_type       TEXT,

    -- Processing state
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    -- AI provider used
    provider_used   TEXT,
    model_used      TEXT,

    -- Result (the extracted structured JSON)
    result          JSONB,
    raw_text_preview TEXT,
    error           TEXT,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_extraction_org ON kb_extraction_jobs(org_id, created_at DESC);
CREATE INDEX idx_kb_extraction_status ON kb_extraction_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_kb_extraction_user ON kb_extraction_jobs(user_id);

-- RLS
ALTER TABLE kb_extraction_jobs ENABLE ROW LEVEL SECURITY;

-- Users can see their own org's extractions
CREATE POLICY kb_extraction_user_read ON kb_extraction_jobs
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

-- Service role can do everything (worker writes results)
CREATE POLICY kb_extraction_service_all ON kb_extraction_jobs
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger
CREATE TRIGGER kb_extraction_jobs_updated_at
    BEFORE UPDATE ON kb_extraction_jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed the kb_extraction agent into mastery_agent_configs
INSERT INTO mastery_agent_configs (
    scope, agent_key, display_name, description,
    agent_category, is_system, decision_type,
    decision_outputs, kb_object_types,
    pipeline_stage, pipeline_order,
    scoring_rules, field_rules, keyword_rules
) VALUES (
    'global', 'kb_extraction',
    'KB Extraction Agent',
    'Extracts structured marketing intelligence from uploaded company documents (PDF, DOCX, TXT, MD)',
    'custom', true, 'document_extraction',
    ARRAY['brand', 'icp', 'offers', 'angles', 'ctas', 'compliance'],
    ARRAY['brand', 'icp_segment', 'offer', 'angle', 'cta'],
    'on_demand', 0,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
) ON CONFLICT DO NOTHING;
