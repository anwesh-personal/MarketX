-- ============================================================================
-- MIGRATION 050: PROMPT STUDIO — SCHEMA
-- ============================================================================
-- Reusable prompt blocks that can be assigned to brains, agents, or templates.
-- Supports versioning, variable templates, and many-to-many assignments.
-- ============================================================================

BEGIN;

-- ── PROMPT BLOCKS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = platform-level
    
    -- Identity
    slug            VARCHAR(150) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    -- Classification
    category        VARCHAR(50) NOT NULL CHECK (category IN (
        'foundation',    -- Core identity & purpose
        'persona',       -- Voice, tone, style
        'instruction',   -- How to do the task
        'guardrails',    -- What NOT to do, compliance
        'domain',        -- Domain expertise context
        'task',          -- Specific task template
        'custom'         -- User-defined
    )),
    
    -- The actual prompt content
    content         TEXT NOT NULL,
    
    -- Template variables declared in this prompt
    -- e.g. [{"name": "brand_name", "description": "Company name", "required": true, "default": ""}]
    variables       JSONB DEFAULT '[]',
    
    -- Organization
    tags            TEXT[] DEFAULT '{}',
    
    -- Versioning
    version         INTEGER NOT NULL DEFAULT 1,
    parent_id       UUID REFERENCES prompt_blocks(id) ON DELETE SET NULL,
    
    -- Metadata
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_system       BOOLEAN NOT NULL DEFAULT false,  -- Platform-provided, can't delete
    quality_score   REAL CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    usage_count     INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One slug+version per scope (org or platform)
    UNIQUE(org_id, slug, version)
);

-- ── PROMPT ASSIGNMENTS ────────────────────────────────────────
-- Many-to-many: prompt_blocks ↔ brain_agents / org_agents / agent_templates
CREATE TABLE IF NOT EXISTS prompt_assignments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_block_id     UUID NOT NULL REFERENCES prompt_blocks(id) ON DELETE CASCADE,
    
    -- Polymorphic target
    target_type         VARCHAR(50) NOT NULL CHECK (target_type IN (
        'brain_agent', 'org_agent', 'agent_template'
    )),
    target_id           UUID NOT NULL,
    
    -- Ordering within same category on same target
    priority            INTEGER NOT NULL DEFAULT 0,
    
    -- Per-assignment variable overrides
    override_variables  JSONB DEFAULT '{}',
    
    -- Status
    is_active           BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit
    assigned_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One prompt per target (no duplicates)
    UNIQUE(prompt_block_id, target_type, target_id)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pb_org ON prompt_blocks(org_id);
CREATE INDEX IF NOT EXISTS idx_pb_category ON prompt_blocks(category);
CREATE INDEX IF NOT EXISTS idx_pb_slug ON prompt_blocks(slug);
CREATE INDEX IF NOT EXISTS idx_pb_active ON prompt_blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_pb_system ON prompt_blocks(is_system);
CREATE INDEX IF NOT EXISTS idx_pb_tags ON prompt_blocks USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_pa_prompt ON prompt_assignments(prompt_block_id);
CREATE INDEX IF NOT EXISTS idx_pa_target ON prompt_assignments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_pa_active ON prompt_assignments(is_active);

-- ── TRIGGERS ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pb_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prompt_blocks_updated_at
    BEFORE UPDATE ON prompt_blocks
    FOR EACH ROW EXECUTE FUNCTION pb_set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE prompt_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_assignments ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY pb_service_all ON prompt_blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pa_service_all ON prompt_assignments FOR ALL USING (true) WITH CHECK (true);

-- Users: read platform prompts + their org's prompts
CREATE POLICY pb_user_read ON prompt_blocks FOR SELECT USING (
    org_id IS NULL OR org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
);

CREATE POLICY pa_user_read ON prompt_assignments FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✓ Migration 050: prompt_blocks + prompt_assignments created';
END $$;

COMMIT;
