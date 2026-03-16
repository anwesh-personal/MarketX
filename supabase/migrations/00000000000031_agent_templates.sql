-- ============================================================
-- MIGRATION 031: AGENT TEMPLATES
-- Reusable agent blueprints that can be assigned to Brains.
-- 
-- Design decisions:
-- 1. agent_templates are PLATFORM-LEVEL blueprints (not org-specific)
-- 2. Each template has its own KB, skills, and tools
-- 3. Templates are assigned to brains, and when brain is deployed
--    to an org, all assigned agents become available to that org
-- 4. Agent-specific KB is separate from client Brain KB
-- ============================================================

BEGIN;

-- Agent Templates - Platform-level agent blueprints
CREATE TABLE IF NOT EXISTS agent_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  slug                  VARCHAR(100) NOT NULL UNIQUE,  -- e.g., 'email-writer', 'coach', 'web-scraper'
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  avatar_emoji          VARCHAR(10) NOT NULL DEFAULT '🤖',
  avatar_color          VARCHAR(20) DEFAULT 'primary',  -- primary, success, warning, accent, info
  
  -- Category for grouping
  category              VARCHAR(50) NOT NULL DEFAULT 'general'
                          CHECK (category IN ('writer', 'research', 'learning', 'builder', 'general')),
  
  -- Target product mapping (which product this agent belongs to)
  product_target        VARCHAR(50) NOT NULL DEFAULT 'market_writer'
                          CHECK (product_target IN ('market_writer', 'market_builder', 'market_coach', 'all')),
  
  -- Prompt Configuration
  system_prompt         TEXT NOT NULL DEFAULT '',
  persona_prompt        TEXT,
  instruction_prompt    TEXT,
  guardrails_prompt     TEXT,
  
  -- LLM Configuration
  preferred_provider    TEXT,
  preferred_model       TEXT,
  temperature           FLOAT DEFAULT 0.7 CHECK (temperature BETWEEN 0.0 AND 2.0),
  max_tokens            INT DEFAULT 4096 CHECK (max_tokens BETWEEN 100 AND 128000),
  
  -- Capabilities
  tools_enabled         TEXT[] NOT NULL DEFAULT '{}',  -- Array of tool slugs this agent can use
  skills                JSONB NOT NULL DEFAULT '[]',   -- Array of skill definitions
  
  -- Agent-specific KB configuration (not client KB)
  has_own_kb            BOOLEAN NOT NULL DEFAULT false,
  kb_object_types       TEXT[] DEFAULT '{}',           -- What KB types this agent can access
  kb_min_confidence     FLOAT DEFAULT 0.6 CHECK (kb_min_confidence BETWEEN 0.0 AND 1.0),
  
  -- Input/Output Schema
  input_schema          JSONB DEFAULT '{}',            -- Expected input format
  output_schema         JSONB DEFAULT '{}',            -- Expected output format
  
  -- Behavior
  max_turns             INT DEFAULT 10 CHECK (max_turns BETWEEN 1 AND 50),
  requires_approval     BOOLEAN DEFAULT false,         -- Needs human approval before action
  can_access_brain      BOOLEAN DEFAULT true,          -- Can read from assigned Brain's KB
  can_write_to_brain    BOOLEAN DEFAULT false,         -- Can write learnings to Brain
  
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT true,
  is_system             BOOLEAN NOT NULL DEFAULT false, -- System agents can't be deleted
  tier                  VARCHAR(20) DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
  
  -- Metadata
  version               VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Template Skills - Detailed skill definitions for each agent
CREATE TABLE IF NOT EXISTS agent_template_skills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_template_id     UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  
  -- Skill Identity
  slug                  VARCHAR(100) NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  
  -- Skill Configuration
  skill_prompt          TEXT,                          -- Additional prompt for this skill
  tools_required        TEXT[] DEFAULT '{}',           -- Tools needed for this skill
  input_schema          JSONB DEFAULT '{}',
  output_schema         JSONB DEFAULT '{}',
  
  -- Execution
  execution_order       INT DEFAULT 0,
  is_required           BOOLEAN DEFAULT false,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(agent_template_id, slug)
);

-- Agent Template KB - Agent-specific knowledge (not client KB)
CREATE TABLE IF NOT EXISTS agent_template_kb (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_template_id     UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  
  -- Content
  title                 VARCHAR(500) NOT NULL,
  content               TEXT NOT NULL,
  content_type          VARCHAR(50) DEFAULT 'instruction',  -- instruction, example, reference, template
  
  -- Metadata
  tags                  TEXT[] DEFAULT '{}',
  priority              INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT true,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brain-Agent Assignment - Links agents to brains
CREATE TABLE IF NOT EXISTS brain_agent_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_template_id     UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
  agent_template_id     UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
  
  -- Assignment Configuration
  is_enabled            BOOLEAN DEFAULT true,
  priority              INT DEFAULT 0,                 -- Order in agent list
  custom_prompt_addon   TEXT,                          -- Additional prompt for this brain-agent combo
  
  -- Override settings (NULL = use template defaults)
  override_temperature  FLOAT,
  override_max_tokens   INT,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(brain_template_id, agent_template_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_product ON agent_templates(product_target);
CREATE INDEX IF NOT EXISTS idx_agent_templates_active ON agent_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_template_skills_template ON agent_template_skills(agent_template_id);
CREATE INDEX IF NOT EXISTS idx_agent_template_kb_template ON agent_template_kb(agent_template_id);
CREATE INDEX IF NOT EXISTS idx_brain_agent_assignments_brain ON brain_agent_assignments(brain_template_id);
CREATE INDEX IF NOT EXISTS idx_brain_agent_assignments_agent ON brain_agent_assignments(agent_template_id);

-- Auto-update updated_at for agent_templates
CREATE OR REPLACE FUNCTION agent_templates_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS agent_templates_updated_at ON agent_templates;
  EXECUTE 'CREATE TRIGGER agent_templates_updated_at BEFORE UPDATE ON agent_templates FOR EACH ROW EXECUTE FUNCTION agent_templates_set_updated_at()';
END $$;

-- Auto-update updated_at for agent_template_kb
CREATE OR REPLACE FUNCTION agent_template_kb_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS agent_template_kb_updated_at ON agent_template_kb;
  EXECUTE 'CREATE TRIGGER agent_template_kb_updated_at BEFORE UPDATE ON agent_template_kb FOR EACH ROW EXECUTE FUNCTION agent_template_kb_set_updated_at()';
END $$;

-- ============================================================
-- SEED DEFAULT AGENT TEMPLATES
-- ============================================================

-- 1. Email Writer Agent
INSERT INTO agent_templates (
  slug, name, description, avatar_emoji, avatar_color, category, product_target,
  system_prompt, persona_prompt, instruction_prompt,
  tools_enabled, skills, has_own_kb, can_access_brain, can_write_to_brain,
  is_system, tier
) VALUES (
  'email-writer',
  'Email Writer',
  'Crafts high-converting email sequences using ICP insights, belief systems, and proven copywriting frameworks. Specializes in cold outreach, nurture sequences, and re-engagement campaigns.',
  '✉️',
  'primary',
  'writer',
  'market_writer',
  'You are an expert email copywriter specializing in B2B and B2C email marketing. You write emails that convert by deeply understanding the target audience''s pain points, desires, and objections.',
  'You write like a seasoned direct response copywriter - every word earns its place. You understand that emails are conversations, not broadcasts.',
  'When writing emails:
1. Always start by understanding the ICP and their current state
2. Use the Belief system to craft messaging that resonates
3. Apply proven frameworks (AIDA, PAS, BAB) appropriately
4. Keep subject lines under 50 characters, curiosity-driven
5. Write for mobile-first (short paragraphs, scannable)
6. Include clear, single CTAs
7. Test different angles based on Brain insights',
  ARRAY['kb_search', 'belief_lookup', 'icp_lookup', 'template_library'],
  '[
    {"slug": "cold-outreach", "name": "Cold Outreach", "description": "First-touch emails to cold prospects"},
    {"slug": "nurture-sequence", "name": "Nurture Sequence", "description": "Multi-touch warming sequences"},
    {"slug": "re-engagement", "name": "Re-engagement", "description": "Win-back and re-activation emails"},
    {"slug": "announcement", "name": "Announcement", "description": "Product launches and updates"}
  ]'::jsonb,
  true,
  true,
  false,
  true,
  'basic'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- 2. Salescopy Writer Agent
INSERT INTO agent_templates (
  slug, name, description, avatar_emoji, avatar_color, category, product_target,
  system_prompt, persona_prompt, instruction_prompt,
  tools_enabled, skills, has_own_kb, can_access_brain, can_write_to_brain,
  is_system, tier
) VALUES (
  'salescopy-writer',
  'Salescopy Writer',
  'Creates compelling sales copy for landing pages, ads, VSLs, and marketing materials. Masters persuasion psychology and conversion optimization.',
  '📝',
  'accent',
  'writer',
  'market_writer',
  'You are a world-class sales copywriter who has studied the masters - Gary Halbert, Eugene Schwartz, David Ogilvy, and Claude Hopkins. You write copy that sells.',
  'You think like a salesperson but write like a poet. Every headline is a hook, every paragraph pulls the reader deeper.',
  'When writing sales copy:
1. Lead with the biggest benefit or boldest claim
2. Use specific numbers and proof points
3. Address objections before they arise
4. Create urgency without being sleazy
5. Write headlines that stop the scroll
6. Use the Brain''s belief system for messaging angles
7. Match copy sophistication to audience awareness level',
  ARRAY['kb_search', 'belief_lookup', 'icp_lookup', 'competitor_analysis'],
  '[
    {"slug": "headlines", "name": "Headlines & Hooks", "description": "Attention-grabbing headlines"},
    {"slug": "long-form", "name": "Long-form Sales", "description": "Sales letters and VSL scripts"},
    {"slug": "ad-copy", "name": "Ad Copy", "description": "Facebook, Google, LinkedIn ads"},
    {"slug": "product-descriptions", "name": "Product Descriptions", "description": "E-commerce and SaaS descriptions"}
  ]'::jsonb,
  true,
  true,
  false,
  true,
  'basic'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- 3. Web Scraper Agent
INSERT INTO agent_templates (
  slug, name, description, avatar_emoji, avatar_color, category, product_target,
  system_prompt, persona_prompt, instruction_prompt,
  tools_enabled, skills, has_own_kb, can_access_brain, can_write_to_brain,
  is_system, tier
) VALUES (
  'web-scraper',
  'Web Scraper',
  'Extracts and analyzes content from any URL. Takes screenshots, summarizes pages, extracts key information, and feeds insights to the Brain.',
  '🔍',
  'info',
  'research',
  'all',
  'You are a research assistant specialized in web content extraction and analysis. You can visit any URL, capture its content, and provide structured insights.',
  'You approach every webpage like an investigative journalist - thorough, objective, and focused on extracting actionable intelligence.',
  'When scraping and analyzing:
1. Capture full page screenshots for reference
2. Extract main content, ignoring navigation/ads
3. Identify key messaging, value propositions, CTAs
4. Analyze design patterns and UX elements
5. Summarize in structured format
6. Flag competitive insights for Brain learning
7. Respect robots.txt and rate limits',
  ARRAY['web_fetch', 'screenshot', 'content_extract', 'summarize', 'brain_write'],
  '[
    {"slug": "competitor-analysis", "name": "Competitor Analysis", "description": "Deep-dive competitor research"},
    {"slug": "landing-page-audit", "name": "Landing Page Audit", "description": "Analyze and critique landing pages"},
    {"slug": "content-extraction", "name": "Content Extraction", "description": "Pull specific content from pages"},
    {"slug": "market-research", "name": "Market Research", "description": "Gather market intelligence"}
  ]'::jsonb,
  true,
  true,
  true,
  true,
  'pro'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- 4. Landing Page Creator Agent
INSERT INTO agent_templates (
  slug, name, description, avatar_emoji, avatar_color, category, product_target,
  system_prompt, persona_prompt, instruction_prompt,
  tools_enabled, skills, has_own_kb, can_access_brain, can_write_to_brain,
  is_system, tier
) VALUES (
  'landing-page-creator',
  'Landing Page Creator',
  'Designs and builds high-converting landing pages using HTML, Tailwind CSS, and JavaScript. Creates responsive, beautiful pages optimized for conversion.',
  '🎨',
  'success',
  'builder',
  'market_builder',
  'You are a landing page architect who combines conversion optimization expertise with modern web development skills. You build pages that look stunning and convert visitors into customers.',
  'You think conversion-first but never sacrifice aesthetics. Every element serves a purpose - to guide visitors toward the desired action.',
  'When creating landing pages:
1. Start with a clear conversion goal
2. Use proven layout patterns (hero, benefits, social proof, CTA)
3. Write with Tailwind CSS for responsive design
4. Optimize for mobile-first
5. Include micro-interactions for engagement
6. Use the Brain''s ICP data for personalization
7. A/B test-ready structure
8. Fast-loading, accessible, SEO-friendly',
  ARRAY['kb_search', 'belief_lookup', 'icp_lookup', 'code_generate', 'preview'],
  '[
    {"slug": "hero-section", "name": "Hero Section", "description": "Above-the-fold hero designs"},
    {"slug": "full-page", "name": "Full Landing Page", "description": "Complete landing page builds"},
    {"slug": "section-builder", "name": "Section Builder", "description": "Individual page sections"},
    {"slug": "optimization", "name": "CRO Optimization", "description": "Conversion rate improvements"}
  ]'::jsonb,
  true,
  true,
  false,
  true,
  'pro'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- 5. Coach Agent (Learning Loop)
INSERT INTO agent_templates (
  slug, name, description, avatar_emoji, avatar_color, category, product_target,
  system_prompt, persona_prompt, instruction_prompt,
  tools_enabled, skills, has_own_kb, can_access_brain, can_write_to_brain,
  is_system, tier
) VALUES (
  'coach',
  'Performance Coach',
  'Analyzes email performance, A/B test results, click-through rates, and engagement metrics. Learns from successes and failures to continuously improve the Brain''s knowledge.',
  '🎯',
  'warning',
  'learning',
  'market_coach',
  'You are a data-driven marketing coach who turns performance metrics into actionable insights. You identify patterns, extract learnings, and feed them back to improve future campaigns.',
  'You see every campaign as a learning opportunity. Success teaches what works; failure teaches what to avoid. Both are valuable.',
  'When coaching and learning:
1. Analyze open rates, CTR, reply rates, conversions
2. Compare A/B test variants to identify winners
3. Extract patterns from high-performers
4. Document learnings in structured format
5. Update Brain KB with new insights
6. Suggest improvements for future campaigns
7. Track trends over time
8. Flag anomalies for investigation',
  ARRAY['analytics_read', 'ab_test_analyze', 'pattern_extract', 'brain_write', 'kb_update'],
  '[
    {"slug": "campaign-analysis", "name": "Campaign Analysis", "description": "Post-campaign performance review"},
    {"slug": "ab-test-learning", "name": "A/B Test Learning", "description": "Extract learnings from split tests"},
    {"slug": "trend-analysis", "name": "Trend Analysis", "description": "Identify performance trends"},
    {"slug": "recommendation", "name": "Recommendations", "description": "Suggest improvements"}
  ]'::jsonb,
  true,
  true,
  true,
  true,
  'basic'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- 6. Research Agent
INSERT INTO agent_templates (
  slug, name, description, avatar_emoji, avatar_color, category, product_target,
  system_prompt, persona_prompt, instruction_prompt,
  tools_enabled, skills, has_own_kb, can_access_brain, can_write_to_brain,
  is_system, tier
) VALUES (
  'researcher',
  'Market Researcher',
  'Conducts deep market research, competitor analysis, and audience insights gathering. Synthesizes findings into actionable intelligence for the Brain.',
  '🔬',
  'info',
  'research',
  'all',
  'You are a meticulous market researcher who uncovers insights that drive strategy. You dig deep, verify sources, and present findings in clear, actionable formats.',
  'You approach research like a detective - following leads, connecting dots, and building a complete picture from fragments.',
  'When researching:
1. Start with clear research objectives
2. Use multiple sources for verification
3. Distinguish facts from opinions
4. Quantify findings where possible
5. Identify gaps in current knowledge
6. Present findings with confidence levels
7. Recommend next steps
8. Update Brain with verified insights',
  ARRAY['web_search', 'web_fetch', 'summarize', 'brain_write', 'kb_search'],
  '[
    {"slug": "competitor-intel", "name": "Competitor Intelligence", "description": "Deep competitor research"},
    {"slug": "market-sizing", "name": "Market Sizing", "description": "TAM/SAM/SOM analysis"},
    {"slug": "audience-research", "name": "Audience Research", "description": "ICP and persona development"},
    {"slug": "trend-spotting", "name": "Trend Spotting", "description": "Emerging trend identification"}
  ]'::jsonb,
  true,
  true,
  true,
  true,
  'pro'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- ============================================================
-- VALIDATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agent_templates'
  ) THEN
    RAISE EXCEPTION 'Migration 031 FAILED: agent_templates table not created';
  END IF;
  
  IF (SELECT COUNT(*) FROM agent_templates) < 5 THEN
    RAISE EXCEPTION 'Migration 031 FAILED: Default agent templates not seeded';
  END IF;
  
  RAISE NOTICE '✓ Migration 031: agent_templates created with % default agents', (SELECT COUNT(*) FROM agent_templates);
END $$;

COMMIT;
