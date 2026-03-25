-- ============================================================
-- MIGRATION 046: ORG AGENTS
-- When an Engine Bundle is deployed, agent templates assigned
-- to the brain are cloned into org_agents for the target org.
-- This gives each org their own copy of each agent, linked to
-- their brain, with customizable prompts and config.
-- ============================================================

BEGIN;

-- ============================================================
-- ORG_AGENTS — Deployed agent instances per org/user
-- ============================================================
CREATE TABLE IF NOT EXISTS org_agents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = org-wide agent
    
    -- Source tracking
    agent_template_id   UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
    engine_instance_id  UUID REFERENCES engine_instances(id) ON DELETE SET NULL,
    brain_agent_id      UUID REFERENCES brain_agents(id) ON DELETE SET NULL,
    
    -- Identity (cloned from template, customizable per org)
    slug                VARCHAR(100) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    avatar_emoji        VARCHAR(10) NOT NULL DEFAULT '🤖',
    avatar_color        VARCHAR(20) DEFAULT 'primary',
    category            VARCHAR(50) NOT NULL DEFAULT 'general',
    product_target      VARCHAR(50) NOT NULL DEFAULT 'market_writer',
    
    -- Prompt Configuration (cloned text — template changes don't affect this)
    system_prompt       TEXT NOT NULL DEFAULT '',
    persona_prompt      TEXT,
    instruction_prompt  TEXT,
    guardrails_prompt   TEXT,
    
    -- LLM Configuration
    preferred_provider  TEXT,
    preferred_model     TEXT,
    temperature         FLOAT DEFAULT 0.7,
    max_tokens          INT DEFAULT 4096,
    
    -- Capabilities
    tools_enabled       TEXT[] NOT NULL DEFAULT '{}',
    skills              JSONB NOT NULL DEFAULT '[]',
    
    -- Brain integration flags
    can_access_brain    BOOLEAN DEFAULT true,   -- Can read from brain KB
    can_write_to_brain  BOOLEAN DEFAULT false,  -- Can write learnings to brain KB
    has_own_kb          BOOLEAN DEFAULT false,   -- Has agent-specific KB
    kb_min_confidence   FLOAT DEFAULT 0.6,
    
    -- Behavior
    max_turns           INT DEFAULT 10,
    requires_approval   BOOLEAN DEFAULT false,
    
    -- Status
    status              VARCHAR(20) DEFAULT 'active' 
                        CHECK (status IN ('configuring', 'active', 'paused', 'disabled')),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    version             VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    deployed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One agent slug per org (unless user-specific)
    UNIQUE(org_id, slug, user_id)
);

-- ============================================================
-- ORG_AGENT_KB — Agent-specific knowledge per org
-- (cloned from agent_template_kb at deploy time)
-- ============================================================
CREATE TABLE IF NOT EXISTS org_agent_kb (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_agent_id        UUID NOT NULL REFERENCES org_agents(id) ON DELETE CASCADE,
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Content
    title               VARCHAR(500) NOT NULL,
    content             TEXT NOT NULL,
    content_type        VARCHAR(50) DEFAULT 'instruction',
    
    -- Metadata
    tags                TEXT[] DEFAULT '{}',
    priority            INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT true,
    source              VARCHAR(50) DEFAULT 'template_clone',  -- template_clone, user_added, agent_learned
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_org_agents_org ON org_agents(org_id);
CREATE INDEX IF NOT EXISTS idx_org_agents_user ON org_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_org_agents_brain ON org_agents(brain_agent_id);
CREATE INDEX IF NOT EXISTS idx_org_agents_slug ON org_agents(org_id, slug);
CREATE INDEX IF NOT EXISTS idx_org_agents_template ON org_agents(agent_template_id);
CREATE INDEX IF NOT EXISTS idx_org_agents_engine ON org_agents(engine_instance_id);
CREATE INDEX IF NOT EXISTS idx_org_agents_active ON org_agents(org_id, is_active, status);

CREATE INDEX IF NOT EXISTS idx_org_agent_kb_agent ON org_agent_kb(org_agent_id);
CREATE INDEX IF NOT EXISTS idx_org_agent_kb_org ON org_agent_kb(org_id);

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION org_agents_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS org_agents_updated_at ON org_agents;
CREATE TRIGGER org_agents_updated_at
    BEFORE UPDATE ON org_agents
    FOR EACH ROW EXECUTE FUNCTION org_agents_set_updated_at();

DROP TRIGGER IF EXISTS org_agent_kb_updated_at ON org_agent_kb;
CREATE TRIGGER org_agent_kb_updated_at
    BEFORE UPDATE ON org_agent_kb
    FOR EACH ROW EXECUTE FUNCTION org_agents_set_updated_at();

-- ============================================================
-- RLS (service role has full access)
-- ============================================================
ALTER TABLE org_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_agent_kb ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_agents_service_all ON org_agents;
CREATE POLICY org_agents_service_all ON org_agents
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS org_agent_kb_service_all ON org_agent_kb;
CREATE POLICY org_agent_kb_service_all ON org_agent_kb
    FOR ALL USING (true) WITH CHECK (true);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VALIDATION
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'org_agents'
    ) THEN
        RAISE EXCEPTION 'Migration 046 FAILED: org_agents table not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'org_agent_kb'
    ) THEN
        RAISE EXCEPTION 'Migration 046 FAILED: org_agent_kb table not created';
    END IF;
    
    RAISE NOTICE '✓ Migration 046: org_agents + org_agent_kb created successfully';
END $$;

COMMIT;
