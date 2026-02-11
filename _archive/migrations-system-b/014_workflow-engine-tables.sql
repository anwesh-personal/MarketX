-- ============================================================
-- AXIOM ENGINE - WORKFLOW & ENGINE MANAGEMENT
-- Migration: workflow-engine-tables.sql
-- Date: 2026-01-24
-- ============================================================

-- ============================================================
-- TABLE 1: WORKFLOW TEMPLATES
-- Master templates for content generation workflows
-- ============================================================

CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    node_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES platform_admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_templates_status ON workflow_templates(status);
CREATE INDEX idx_workflow_templates_created_at ON workflow_templates(created_at DESC);

COMMENT ON TABLE workflow_templates IS 'Master workflow templates for AI content generation. SuperAdmin-managed.';
COMMENT ON COLUMN workflow_templates.nodes IS 'ReactFlow nodes array with position, type, and data';
COMMENT ON COLUMN workflow_templates.edges IS 'ReactFlow edges array defining node connections';

-- ============================================================
-- TABLE 2: CONSTITUTIONS
-- Guardrails and rules per organization
-- ============================================================

CREATE TABLE constitutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_constitutions_org_id ON constitutions(org_id);
CREATE INDEX idx_constitutions_is_active ON constitutions(is_active);

COMMENT ON TABLE constitutions IS 'Organization-specific guardrails for content generation validation';
COMMENT ON COLUMN constitutions.rules IS 'JSON object containing validation rules, forbidden terms, required elements';

-- ============================================================
-- TABLE 3: ENGINE INSTANCES
-- Cloned workflow instances assigned to organizations
-- ============================================================

CREATE TABLE engine_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE RESTRICT,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    kb_id UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
    constitution_id UUID REFERENCES constitutions(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'disabled' CHECK (status IN ('active', 'standby', 'disabled', 'error')),
    config JSONB DEFAULT '{}',
    runs_today INTEGER DEFAULT 0,
    runs_total INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_engine_instances_template_id ON engine_instances(template_id);
CREATE INDEX idx_engine_instances_org_id ON engine_instances(org_id);
CREATE INDEX idx_engine_instances_status ON engine_instances(status);
CREATE INDEX idx_engine_instances_last_run ON engine_instances(last_run_at DESC);

COMMENT ON TABLE engine_instances IS 'Cloned workflow engines deployed per organization with isolated config';
COMMENT ON COLUMN engine_instances.config IS 'Engine-specific configuration overrides';

-- ============================================================
-- TABLE 4: ENGINE API KEY MAPPINGS
-- Links engines to organization API keys for isolation
-- ============================================================

CREATE TABLE engine_api_key_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(engine_id, provider_id)
);

CREATE INDEX idx_engine_api_key_mappings_engine_id ON engine_api_key_mappings(engine_id);
CREATE INDEX idx_engine_api_key_mappings_provider_id ON engine_api_key_mappings(provider_id);

COMMENT ON TABLE engine_api_key_mappings IS 'Maps engine instances to organization API keys for rate limit isolation';

-- ============================================================
-- TABLE 5: NODE PALETTE
-- Dynamic node types for workflow builder
-- ============================================================

CREATE TABLE node_palette (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('trigger', 'input', 'process', 'condition', 'preview', 'output')),
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    features JSONB DEFAULT '[]',
    capabilities JSONB DEFAULT '[]',
    default_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_node_palette_category ON node_palette(category);
CREATE INDEX idx_node_palette_is_active ON node_palette(is_active);
CREATE INDEX idx_node_palette_sort_order ON node_palette(sort_order);

COMMENT ON TABLE node_palette IS 'Available node types for the workflow builder';
COMMENT ON COLUMN node_palette.node_id IS 'Unique identifier used in ReactFlow node type registry';
COMMENT ON COLUMN node_palette.icon IS 'Lucide icon name';
COMMENT ON COLUMN node_palette.color IS 'Axiom color token: primary, success, warning, error, info, accent';

-- ============================================================
-- TABLE 6: ENGINE RUN LOGS
-- Execution history for analytics and debugging
-- ============================================================

CREATE TABLE engine_run_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'running', 'completed', 'failed')),
    input_data JSONB,
    output_data JSONB,
    node_execution_log JSONB DEFAULT '[]',
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_engine_run_logs_engine_id ON engine_run_logs(engine_id);
CREATE INDEX idx_engine_run_logs_org_id ON engine_run_logs(org_id);
CREATE INDEX idx_engine_run_logs_status ON engine_run_logs(status);
CREATE INDEX idx_engine_run_logs_started_at ON engine_run_logs(started_at DESC);

COMMENT ON TABLE engine_run_logs IS 'Execution logs for engine runs with full I/O and cost tracking';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_api_key_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_palette ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_run_logs ENABLE ROW LEVEL SECURITY;

-- Superadmin has full access to workflow_templates
CREATE POLICY "Superadmin full access to workflow_templates"
ON workflow_templates FOR ALL
USING (true);

-- Org users can view their constitutions
CREATE POLICY "Users see org constitutions"
ON constitutions FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Org users can view their engine instances
CREATE POLICY "Users see org engines"
ON engine_instances FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- All authenticated users can view active node palette
CREATE POLICY "Authenticated users view node palette"
ON node_palette FOR SELECT
USING (is_active = true);

-- Org users can view their run logs
CREATE POLICY "Users see org run logs"
ON engine_run_logs FOR SELECT
USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_workflow_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.node_count = jsonb_array_length(NEW.nodes);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_templates_timestamp
BEFORE UPDATE ON workflow_templates
FOR EACH ROW
EXECUTE FUNCTION update_workflow_templates_timestamp();

CREATE OR REPLACE FUNCTION update_engine_instances_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_engine_instances_timestamp
BEFORE UPDATE ON engine_instances
FOR EACH ROW
EXECUTE FUNCTION update_engine_instances_timestamp();

CREATE OR REPLACE FUNCTION update_constitutions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_constitutions_timestamp
BEFORE UPDATE ON constitutions
FOR EACH ROW
EXECUTE FUNCTION update_constitutions_timestamp();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to reset daily run counts (call via cron)
CREATE OR REPLACE FUNCTION reset_daily_engine_runs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE engine_instances SET runs_today = 0;
END;
$$;

-- Function to clone engine from template
CREATE OR REPLACE FUNCTION clone_engine_from_template(
    p_template_id UUID,
    p_name VARCHAR,
    p_org_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_engine_id UUID;
BEGIN
    INSERT INTO engine_instances (name, template_id, org_id, status)
    VALUES (p_name, p_template_id, p_org_id, 'disabled')
    RETURNING id INTO v_engine_id;
    
    RETURN v_engine_id;
END;
$$;

-- ============================================================
-- SEED DATA: NODE PALETTE
-- ============================================================

-- TRIGGER NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, sort_order) VALUES
('email-trigger', 'Email Received', 'Triggered when n8n webhook sends email data', 'trigger', 'Mail', 'primary', 
 '["Webhook Integration", "n8n Compatible"]'::jsonb, 
 '["Parse email headers", "Extract body and subject", "Detect attachments", "Sender identification"]'::jsonb, 1),
('manual-trigger', 'Manual Trigger', 'Start workflow manually for testing or on-demand execution', 'trigger', 'Play', 'info', 
 '["On-Demand", "Debug Mode"]'::jsonb, 
 '["Manual execution", "Test mode", "Parameter injection"]'::jsonb, 2),
('schedule-trigger', 'Scheduled Trigger', 'Run workflow on a schedule (cron-based)', 'trigger', 'RefreshCw', 'warning', 
 '["Cron Support", "Recurring"]'::jsonb, 
 '["Daily/hourly/weekly execution", "Timezone aware", "Skip on failure option"]'::jsonb, 3);

-- INPUT NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, sort_order) VALUES
('input-config', 'Input Configuration', 'Define and validate workflow input parameters', 'input', 'Settings', 'info', 
 '["Form Builder", "Validation"]'::jsonb, 
 '["Schema definition", "Required field enforcement", "Default values", "Type validation"]'::jsonb, 10),
('text-input', 'Text Prompt Input', 'Collect text prompts with AI-assisted suggestions', 'input', 'FileText', 'info', 
 '["Rich Text", "AI Suggestions"]'::jsonb, 
 '["Markdown support", "Auto-complete", "Template variables"]'::jsonb, 11),
('file-upload', 'File Upload', 'Process uploaded documents (PDF, DOCX, CSV)', 'input', 'Upload', 'info', 
 '["Multi-Format", "OCR"]'::jsonb, 
 '["PDF parsing", "DOCX extraction", "CSV/Excel processing", "Image OCR"]'::jsonb, 12);

-- PROCESS NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, sort_order) VALUES
('analyze-intent', 'Analyze Intent', 'Detect user intent and classify scenario', 'process', 'Search', 'accent', 
 '["AI Detection", "Scenario Matching"]'::jsonb, 
 '["Intent classification", "Sentiment analysis", "Topic extraction", "Urgency detection"]'::jsonb, 20),
('retrieve-kb', 'Retrieve from KB', 'Fetch relevant context from Knowledge Base', 'process', 'Database', 'success', 
 '["Vector Search", "RAG"]'::jsonb, 
 '["Semantic search", "Context window optimization", "Source attribution", "Relevance scoring"]'::jsonb, 21),
('generate-llm', 'Generate (LLM)', 'Call AI model to generate content', 'process', 'Brain', 'primary', 
 '["Multi-Model", "Constitutional"]'::jsonb, 
 '["GPT-4/Claude/Gemini support", "Temperature control", "Token management", "Streaming output"]'::jsonb, 22),
('validate-constitution', 'Constitution Check', 'Validate output against organization guardrails', 'process', 'Shield', 'error', 
 '["Rules Engine", "Blocking"]'::jsonb, 
 '["Forbidden terms detection", "Tone validation", "Fact checking", "Brand voice enforcement"]'::jsonb, 23),
('web-search', 'Web Research', 'Research online sources for context', 'process', 'Globe', 'info', 
 '["Real-time", "Multi-Source"]'::jsonb, 
 '["Perplexity/Tavily integration", "Source verification", "Date filtering", "Domain filtering"]'::jsonb, 24),
('content-locker', 'Content Locker', 'Add gated content hooks for lead generation', 'process', 'Lock', 'warning', 
 '["Email Gates", "Progressive Unlock"]'::jsonb, 
 '["Gate placement", "Unlock triggers", "Email capture points", "Analytics hooks"]'::jsonb, 25),
('seo-optimizer', 'SEO Optimizer', 'Optimize content for search engines', 'process', 'TrendingUp', 'success', 
 '["Keyword Analysis", "Meta Tags"]'::jsonb, 
 '["Keyword density optimization", "Meta description generation", "Heading structure", "Internal linking suggestions"]'::jsonb, 26);

-- CONDITION NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, sort_order) VALUES
('logic-gate', 'Logic Gate', 'Boolean decision routing based on conditions', 'condition', 'GitBranch', 'accent', 
 '["Multi-Path", "AI Logic"]'::jsonb, 
 '["AND/OR/NOT operations", "Nested conditions", "AI-assisted decisions", "Fallback routing"]'::jsonb, 30),
('validation-check', 'Quality Gate', 'Quality assurance checkpoint with pass/fail routing', 'condition', 'CheckCircle', 'success', 
 '["QA Gate", "Thresholds"]'::jsonb, 
 '["Score-based routing", "Manual review trigger", "Auto-retry on failure", "Escalation rules"]'::jsonb, 31);

-- PREVIEW NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, sort_order) VALUES
('live-preview', 'Live Preview', 'Real-time content visualization and editing', 'preview', 'Eye', 'warning', 
 '["Real-Time", "Editable"]'::jsonb, 
 '["Instant updates", "Inline editing", "Format switching", "Approval workflow"]'::jsonb, 40),
('email-preview', 'Email Preview', 'Preview email across multiple clients', 'preview', 'Mail', 'warning', 
 '["Multi-Client", "Spam Check"]'::jsonb, 
 '["Gmail/Outlook/Apple Mail preview", "Spam score", "Dark mode testing", "Link validation"]'::jsonb, 41);

-- OUTPUT NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, sort_order) VALUES
('output-n8n', 'Return to n8n', 'Send result back via API response', 'output', 'Send', 'success', 
 '["API Response", "Webhook"]'::jsonb, 
 '["JSON response formatting", "Status codes", "Error handling", "Retry logic"]'::jsonb, 50),
('output-store', 'Store Content', 'Save generated content to database', 'output', 'FileText', 'info', 
 '["Versioning", "Supabase"]'::jsonb, 
 '["Auto-versioning", "Metadata capture", "Search indexing", "Retention policies"]'::jsonb, 51),
('output-export', 'Export Files', 'Export content in multiple formats', 'output', 'Download', 'primary', 
 '["Multi-Format", "Branded"]'::jsonb, 
 '["PDF/DOCX/HTML/Markdown export", "Custom styling", "Watermarking", "Batch processing"]'::jsonb, 52),
('output-schedule', 'Schedule Publish', 'Schedule content for future publication', 'output', 'Calendar', 'warning', 
 '["Scheduling", "Multi-Channel"]'::jsonb, 
 '["Timezone-aware scheduling", "Platform-specific timing", "Queue management", "Conflict detection"]'::jsonb, 53);

-- ============================================================
-- SEED DATA: 10 WORKFLOW TEMPLATES
-- ============================================================

-- Email Writers (2)
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Email Reply Engine v1', 
 'Constitutional email reply generation using 4-step cognitive sequence. Ideal for cold outreach responses and customer support.', 
 'active',
 '[
   {"id":"trigger-1","type":"email-trigger","position":{"x":50,"y":200},"data":{"label":"Email Received","nodeType":"email-trigger"}},
   {"id":"analyze-1","type":"analyze-intent","position":{"x":300,"y":200},"data":{"label":"Detect Scenario","nodeType":"analyze-intent"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":100},"data":{"label":"Load KB Context","nodeType":"retrieve-kb"}},
   {"id":"generate-1","type":"generate-llm","position":{"x":550,"y":300},"data":{"label":"Generate Reply","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":800,"y":200},"data":{"label":"Constitution Check","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-n8n","position":{"x":1050,"y":200},"data":{"label":"Return to n8n","nodeType":"output-n8n"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"analyze-1","animated":true},
   {"id":"e2","source":"analyze-1","target":"kb-1","animated":true},
   {"id":"e3","source":"analyze-1","target":"generate-1","animated":true},
   {"id":"e4","source":"kb-1","target":"generate-1","animated":true},
   {"id":"e5","source":"generate-1","target":"validate-1","animated":true},
   {"id":"e6","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb),

('Email Flow Generator v1', 
 'Multi-step email sequence builder. Creates 5-7 email nurture flows with delay configuration and CTA variants.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":200},"data":{"label":"Start Flow","nodeType":"manual-trigger"}},
   {"id":"input-1","type":"input-config","position":{"x":300,"y":200},"data":{"label":"Flow Config","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":100},"data":{"label":"ICP + Angles","nodeType":"retrieve-kb"}},
   {"id":"generate-1","type":"generate-llm","position":{"x":550,"y":300},"data":{"label":"Generate Emails","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":800,"y":200},"data":{"label":"Constitution Check","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1050,"y":200},"data":{"label":"Store Flow","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"input-1","animated":true},
   {"id":"e2","source":"input-1","target":"kb-1","animated":true},
   {"id":"e3","source":"input-1","target":"generate-1","animated":true},
   {"id":"e4","source":"kb-1","target":"generate-1","animated":true},
   {"id":"e5","source":"generate-1","target":"validate-1","animated":true},
   {"id":"e6","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb);

-- Blog + Social Post Writers (2)
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Blog + Social Engine v1', 
 'Generates SEO-optimized blog posts with matching LinkedIn, X, and YouTube descriptions. Pillar-based content strategy.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":250},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"topic-1","type":"input-config","position":{"x":300,"y":250},"data":{"label":"Topic + Pillar","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":100},"data":{"label":"Brand Voice","nodeType":"retrieve-kb"}},
   {"id":"research-1","type":"web-search","position":{"x":550,"y":250},"data":{"label":"Research","nodeType":"web-search"}},
   {"id":"generate-blog","type":"generate-llm","position":{"x":800,"y":150},"data":{"label":"Blog Post","nodeType":"generate-llm"}},
   {"id":"generate-social","type":"generate-llm","position":{"x":800,"y":350},"data":{"label":"Social Posts","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":1050,"y":250},"data":{"label":"Check All","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1300,"y":250},"data":{"label":"Store Content","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"topic-1","animated":true},
   {"id":"e2","source":"topic-1","target":"kb-1","animated":true},
   {"id":"e3","source":"topic-1","target":"research-1","animated":true},
   {"id":"e4","source":"kb-1","target":"generate-blog","animated":true},
   {"id":"e5","source":"research-1","target":"generate-blog","animated":true},
   {"id":"e6","source":"generate-blog","target":"generate-social","animated":true},
   {"id":"e7","source":"generate-blog","target":"validate-1","animated":true},
   {"id":"e8","source":"generate-social","target":"validate-1","animated":true},
   {"id":"e9","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb),

('Social Multi-Platform v1', 
 'Creates platform-specific content for LinkedIn thought leadership, X threads, and YouTube scripts from a single brief.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":250},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"brief-1","type":"input-config","position":{"x":300,"y":250},"data":{"label":"Content Brief","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":250},"data":{"label":"Brand + Voice","nodeType":"retrieve-kb"}},
   {"id":"linkedin-1","type":"generate-llm","position":{"x":800,"y":100},"data":{"label":"LinkedIn Post","nodeType":"generate-llm"}},
   {"id":"twitter-1","type":"generate-llm","position":{"x":800,"y":250},"data":{"label":"X Thread","nodeType":"generate-llm"}},
   {"id":"youtube-1","type":"generate-llm","position":{"x":800,"y":400},"data":{"label":"YT Script","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":1050,"y":250},"data":{"label":"Validate All","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1300,"y":250},"data":{"label":"Store","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"brief-1","animated":true},
   {"id":"e2","source":"brief-1","target":"kb-1","animated":true},
   {"id":"e3","source":"kb-1","target":"linkedin-1","animated":true},
   {"id":"e4","source":"kb-1","target":"twitter-1","animated":true},
   {"id":"e5","source":"kb-1","target":"youtube-1","animated":true},
   {"id":"e6","source":"linkedin-1","target":"validate-1","animated":true},
   {"id":"e7","source":"twitter-1","target":"validate-1","animated":true},
   {"id":"e8","source":"youtube-1","target":"validate-1","animated":true},
   {"id":"e9","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb);

-- Sales Copy Writers (2)
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Sales Copy Engine v1', 
 'Generates high-converting sales copy with AIDA framework, benefit stacking, and objection handling. ICP-targeted.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":200},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"offer-1","type":"input-config","position":{"x":300,"y":200},"data":{"label":"Offer + ICP","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":100},"data":{"label":"Offers + Angles","nodeType":"retrieve-kb"}},
   {"id":"generate-1","type":"generate-llm","position":{"x":550,"y":300},"data":{"label":"Generate Copy","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":800,"y":200},"data":{"label":"No Hype Check","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1050,"y":200},"data":{"label":"Store Copy","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"offer-1","animated":true},
   {"id":"e2","source":"offer-1","target":"kb-1","animated":true},
   {"id":"e3","source":"offer-1","target":"generate-1","animated":true},
   {"id":"e4","source":"kb-1","target":"generate-1","animated":true},
   {"id":"e5","source":"generate-1","target":"validate-1","animated":true},
   {"id":"e6","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb),

('VSL Script Writer v1', 
 'Video Sales Letter script generator with hook, story, offer structure. Includes pattern interrupts and CTA sequences.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":200},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"product-1","type":"input-config","position":{"x":300,"y":200},"data":{"label":"Product Brief","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":100},"data":{"label":"Testimonials + Proof","nodeType":"retrieve-kb"}},
   {"id":"generate-1","type":"generate-llm","position":{"x":550,"y":300},"data":{"label":"VSL Script","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":800,"y":200},"data":{"label":"Claims Check","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1050,"y":200},"data":{"label":"Store Script","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"product-1","animated":true},
   {"id":"e2","source":"product-1","target":"kb-1","animated":true},
   {"id":"e3","source":"product-1","target":"generate-1","animated":true},
   {"id":"e4","source":"kb-1","target":"generate-1","animated":true},
   {"id":"e5","source":"generate-1","target":"validate-1","animated":true},
   {"id":"e6","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb);

-- Sales Copy + Sales Page Design (2)
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Landing Page Builder v1', 
 'Full landing page generator with copy + HTML/Tailwind design. Includes hero, benefits, testimonials, FAQ, and CTA sections.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":250},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"config-1","type":"input-config","position":{"x":300,"y":250},"data":{"label":"Page Config","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":150},"data":{"label":"ICP + Offer","nodeType":"retrieve-kb"}},
   {"id":"copy-1","type":"generate-llm","position":{"x":550,"y":350},"data":{"label":"Generate Copy","nodeType":"generate-llm"}},
   {"id":"design-1","type":"generate-llm","position":{"x":800,"y":250},"data":{"label":"Generate HTML","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":1050,"y":250},"data":{"label":"Validate","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1300,"y":250},"data":{"label":"Store Page","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"config-1","animated":true},
   {"id":"e2","source":"config-1","target":"kb-1","animated":true},
   {"id":"e3","source":"config-1","target":"copy-1","animated":true},
   {"id":"e4","source":"kb-1","target":"copy-1","animated":true},
   {"id":"e5","source":"copy-1","target":"design-1","animated":true},
   {"id":"e6","source":"design-1","target":"validate-1","animated":true},
   {"id":"e7","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb),

('Sales Funnel Page Pack v1', 
 'Complete funnel: Opt-in page, Thank you page, Sales page, and Order confirmation. Coherent design system throughout.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":250},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"funnel-1","type":"input-config","position":{"x":300,"y":250},"data":{"label":"Funnel Config","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":150},"data":{"label":"Offer + Avatar","nodeType":"retrieve-kb"}},
   {"id":"optin-1","type":"generate-llm","position":{"x":800,"y":50},"data":{"label":"Opt-in Page","nodeType":"generate-llm"}},
   {"id":"thankyou-1","type":"generate-llm","position":{"x":800,"y":175},"data":{"label":"Thank You","nodeType":"generate-llm"}},
   {"id":"sales-1","type":"generate-llm","position":{"x":800,"y":300},"data":{"label":"Sales Page","nodeType":"generate-llm"}},
   {"id":"confirm-1","type":"generate-llm","position":{"x":800,"y":425},"data":{"label":"Order Confirm","nodeType":"generate-llm"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":1050,"y":250},"data":{"label":"Validate All","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1300,"y":250},"data":{"label":"Store Funnel","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"funnel-1","animated":true},
   {"id":"e2","source":"funnel-1","target":"kb-1","animated":true},
   {"id":"e3","source":"kb-1","target":"optin-1","animated":true},
   {"id":"e4","source":"kb-1","target":"thankyou-1","animated":true},
   {"id":"e5","source":"kb-1","target":"sales-1","animated":true},
   {"id":"e6","source":"kb-1","target":"confirm-1","animated":true},
   {"id":"e7","source":"optin-1","target":"validate-1","animated":true},
   {"id":"e8","source":"thankyou-1","target":"validate-1","animated":true},
   {"id":"e9","source":"sales-1","target":"validate-1","animated":true},
   {"id":"e10","source":"confirm-1","target":"validate-1","animated":true},
   {"id":"e11","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb);

-- Mini Ebook Writers with Content Locker (2)
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Mini Ebook Generator v1', 
 'Creates 15-25 page lead magnet ebooks with TOC, chapters, and actionable content. Includes content locker integration hooks.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":250},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"config-1","type":"input-config","position":{"x":300,"y":250},"data":{"label":"Ebook Brief","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":150},"data":{"label":"Expert Knowledge","nodeType":"retrieve-kb"}},
   {"id":"outline-1","type":"generate-llm","position":{"x":550,"y":350},"data":{"label":"Create Outline","nodeType":"generate-llm"}},
   {"id":"chapters-1","type":"generate-llm","position":{"x":800,"y":250},"data":{"label":"Write Chapters","nodeType":"generate-llm"}},
   {"id":"locker-1","type":"content-locker","position":{"x":1050,"y":250},"data":{"label":"Add Locker Hooks","nodeType":"content-locker"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":1300,"y":250},"data":{"label":"Validate","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1550,"y":250},"data":{"label":"Store Ebook","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"config-1","animated":true},
   {"id":"e2","source":"config-1","target":"kb-1","animated":true},
   {"id":"e3","source":"config-1","target":"outline-1","animated":true},
   {"id":"e4","source":"kb-1","target":"outline-1","animated":true},
   {"id":"e5","source":"outline-1","target":"chapters-1","animated":true},
   {"id":"e6","source":"chapters-1","target":"locker-1","animated":true},
   {"id":"e7","source":"locker-1","target":"validate-1","animated":true},
   {"id":"e8","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb),

('Gated Content Pack v1', 
 'Lead magnet system: Ebook + Checklist + Cheat Sheet bundle with progressive content unlocking and email capture points.', 
 'active',
 '[
   {"id":"trigger-1","type":"manual-trigger","position":{"x":50,"y":250},"data":{"label":"Start","nodeType":"manual-trigger"}},
   {"id":"topic-1","type":"input-config","position":{"x":300,"y":250},"data":{"label":"Topic + Audience","nodeType":"input-config"}},
   {"id":"kb-1","type":"retrieve-kb","position":{"x":550,"y":150},"data":{"label":"Expertise","nodeType":"retrieve-kb"}},
   {"id":"ebook-1","type":"generate-llm","position":{"x":800,"y":100},"data":{"label":"Mini Ebook","nodeType":"generate-llm"}},
   {"id":"checklist-1","type":"generate-llm","position":{"x":800,"y":250},"data":{"label":"Checklist","nodeType":"generate-llm"}},
   {"id":"cheatsheet-1","type":"generate-llm","position":{"x":800,"y":400},"data":{"label":"Cheat Sheet","nodeType":"generate-llm"}},
   {"id":"locker-1","type":"content-locker","position":{"x":1050,"y":250},"data":{"label":"Setup Gates","nodeType":"content-locker"}},
   {"id":"validate-1","type":"validate-constitution","position":{"x":1300,"y":250},"data":{"label":"Validate","nodeType":"validate-constitution"}},
   {"id":"output-1","type":"output-store","position":{"x":1550,"y":250},"data":{"label":"Store Pack","nodeType":"output-store"}}
 ]'::jsonb,
 '[
   {"id":"e1","source":"trigger-1","target":"topic-1","animated":true},
   {"id":"e2","source":"topic-1","target":"kb-1","animated":true},
   {"id":"e3","source":"kb-1","target":"ebook-1","animated":true},
   {"id":"e4","source":"kb-1","target":"checklist-1","animated":true},
   {"id":"e5","source":"kb-1","target":"cheatsheet-1","animated":true},
   {"id":"e6","source":"ebook-1","target":"locker-1","animated":true},
   {"id":"e7","source":"checklist-1","target":"locker-1","animated":true},
   {"id":"e8","source":"cheatsheet-1","target":"locker-1","animated":true},
   {"id":"e9","source":"locker-1","target":"validate-1","animated":true},
   {"id":"e10","source":"validate-1","target":"output-1","animated":true}
 ]'::jsonb);

-- ============================================================
-- COMPLETE!
-- ============================================================
-- Tables created: 6
-- Node palette entries: 20
-- Workflow templates: 10
-- ============================================================
