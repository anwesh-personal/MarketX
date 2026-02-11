-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 10
-- Seed Data (Brain Templates, Worker Templates, Node Palette, etc.)
-- Source: System B (008, 010, 014 seed sections, 015)
-- ============================================================

-- ============================================================
-- DEFAULT BRAIN TEMPLATES (from 008)
-- ============================================================
INSERT INTO brain_templates (name, description, system_prompt, temperature, max_tokens, tools_enabled, rag_enabled)
VALUES
('Customer Support Agent',
 'Friendly and helpful customer support AI.',
 'You are a professional customer support agent. Your goal is to help customers solve their problems quickly and efficiently.',
 0.7, 1000, true, true),
('Content Writer',
 'Creative AI writer for blogs, articles, marketing copy.',
 'You are an expert content writer with years of experience in copywriting, blogging, and marketing.',
 0.9, 2000, false, true),
('Code Assistant',
 'Technical AI assistant for coding and debugging.',
 'You are an expert software engineer with deep knowledge across multiple programming languages and frameworks.',
 0.3, 2000, true, true),
('Research Analyst',
 'Analytical AI for research and data analysis.',
 'You are a meticulous research analyst with expertise in data analysis, market research, and academic research.',
 0.5, 1500, true, true),
('Sales Assistant',
 'Persuasive AI for sales conversations.',
 'You are a skilled sales professional who understands customer psychology and can build rapport quickly.',
 0.8, 1200, true, false),
('Data Analyst',
 'AI specialized in data interpretation and visualization.',
 'You are a data analyst expert who can interpret complex datasets, identify trends, and provide actionable insights.',
 0.4, 1500, true, true),
('Personal Assistant',
 'General-purpose AI for task management and productivity.',
 'You are a highly organized personal assistant who helps with task management, scheduling, and general productivity.',
 0.6, 1000, true, false),
('Educational Tutor',
 'Patient AI teacher for explaining concepts.',
 'You are a patient and knowledgeable tutor who can explain complex topics in simple, understandable ways.',
 0.7, 1500, false, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DEFAULT WORKER TEMPLATES (from 010)
-- ============================================================
INSERT INTO worker_templates (name, description, worker_type, code_template, environment_vars, config)
VALUES
('Standard Worker', 'General-purpose worker for all task types', 'queue',
 'const express = require(''express''); const app = express(); const PORT = process.env.PORT || 3001;
app.get(''/health'', (req, res) => res.json({ status: ''healthy'' }));
app.listen(PORT, () => console.log(`Worker on ${PORT}`));',
 '{"PORT": "3001", "NODE_ENV": "production"}',
 '{"pm2": {"name": "standard-worker", "script": "server.js", "instances": 1}}'),
('Lean Worker', 'Optimized worker with reduced memory', 'queue',
 'const express = require(''express''); const app = express(); const PORT = process.env.LEAN_PORT || 3002;
app.get(''/health'', (req, res) => res.json({ status: ''healthy'', type: ''lean'' }));
app.listen(PORT, () => console.log(`Lean worker on ${PORT}`));',
 '{"LEAN_PORT": "3002", "NODE_ENV": "production"}',
 '{"pm2": {"name": "lean-worker", "script": "leanServer.js", "instances": 1}}'),
('Queue Worker', 'Background queue processor', 'queue',
 'const Queue = require(''bull''); const queue = new Queue(''tasks'');
queue.process(async (job) => { console.log(''Processing:'', job.id); return { success: true }; });',
 '{"NODE_ENV": "production", "REDIS_URL": "redis://localhost:6379"}',
 '{"pm2": {"name": "queue-worker", "script": "queueWorker.js", "instances": 1}}')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- NODE PALETTE SEED DATA (from 014)
-- ============================================================
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, sort_order) VALUES
-- Triggers
('email-trigger', 'Email Received', 'Triggered when n8n webhook sends email data', 'trigger', 'Mail', 'primary',
 '["Webhook Integration", "n8n Compatible"]'::jsonb,
 '["Parse email headers", "Extract body and subject"]'::jsonb, 1),
('manual-trigger', 'Manual Trigger', 'Start workflow manually', 'trigger', 'Play', 'info',
 '["On-Demand", "Debug Mode"]'::jsonb,
 '["Manual execution", "Test mode"]'::jsonb, 2),
('schedule-trigger', 'Scheduled Trigger', 'Run workflow on a schedule', 'trigger', 'RefreshCw', 'warning',
 '["Cron Support", "Recurring"]'::jsonb,
 '["Daily/hourly/weekly execution", "Timezone aware"]'::jsonb, 3),
-- Input
('input-config', 'Input Configuration', 'Define workflow input parameters', 'input', 'Settings', 'info',
 '["Form Builder", "Validation"]'::jsonb,
 '["Schema definition", "Required fields", "Default values"]'::jsonb, 10),
('text-input', 'Text Prompt Input', 'Collect text prompts', 'input', 'FileText', 'info',
 '["Rich Text", "AI Suggestions"]'::jsonb,
 '["Markdown support", "Auto-complete"]'::jsonb, 11),
('file-upload', 'File Upload', 'Process uploaded documents', 'input', 'Upload', 'info',
 '["Multi-Format", "OCR"]'::jsonb,
 '["PDF parsing", "DOCX extraction", "CSV/Excel processing"]'::jsonb, 12),
-- Process
('analyze-intent', 'Analyze Intent', 'Detect user intent and classify', 'process', 'Search', 'accent',
 '["AI Detection", "Scenario Matching"]'::jsonb,
 '["Intent classification", "Sentiment analysis"]'::jsonb, 20),
('retrieve-kb', 'Retrieve from KB', 'Fetch context from Knowledge Base', 'process', 'Database', 'success',
 '["Vector Search", "RAG"]'::jsonb,
 '["Semantic search", "Context window optimization"]'::jsonb, 21),
('generate-llm', 'Generate (LLM)', 'Call AI model to generate content', 'process', 'Brain', 'primary',
 '["Multi-Model", "Constitutional"]'::jsonb,
 '["GPT-4/Claude/Gemini support", "Temperature control"]'::jsonb, 22),
('validate-constitution', 'Constitution Check', 'Validate output against guardrails', 'process', 'Shield', 'error',
 '["Rules Engine", "Blocking"]'::jsonb,
 '["Forbidden terms detection", "Tone validation"]'::jsonb, 23),
('web-search', 'Web Research', 'Research online sources', 'process', 'Globe', 'info',
 '["Real-time", "Multi-Source"]'::jsonb,
 '["Perplexity/Tavily integration", "Source verification"]'::jsonb, 24),
('content-locker', 'Content Locker', 'Add gated content hooks', 'process', 'Lock', 'warning',
 '["Email Gates", "Progressive Unlock"]'::jsonb,
 '["Gate placement", "Email capture points"]'::jsonb, 25),
('seo-optimizer', 'SEO Optimizer', 'Optimize content for search', 'process', 'TrendingUp', 'success',
 '["Keyword Analysis", "Meta Tags"]'::jsonb,
 '["Keyword density", "Meta description generation"]'::jsonb, 26),
-- Condition
('logic-gate', 'Logic Gate', 'Boolean decision routing', 'condition', 'GitBranch', 'accent',
 '["Multi-Path", "AI Logic"]'::jsonb,
 '["AND/OR/NOT operations", "Nested conditions"]'::jsonb, 30),
('validation-check', 'Quality Gate', 'Quality assurance checkpoint', 'condition', 'CheckCircle', 'success',
 '["QA Gate", "Thresholds"]'::jsonb,
 '["Score-based routing", "Manual review trigger"]'::jsonb, 31),
-- Preview
('live-preview', 'Live Preview', 'Real-time content preview', 'preview', 'Eye', 'warning',
 '["Real-Time", "Editable"]'::jsonb,
 '["Instant updates", "Inline editing"]'::jsonb, 40),
('email-preview', 'Email Preview', 'Preview email across clients', 'preview', 'Mail', 'warning',
 '["Multi-Client", "Spam Check"]'::jsonb,
 '["Gmail/Outlook preview", "Spam score"]'::jsonb, 41),
-- Output
('output-n8n', 'Return to n8n', 'Send result back via API', 'output', 'Send', 'success',
 '["API Response", "Webhook"]'::jsonb,
 '["JSON response formatting", "Error handling"]'::jsonb, 50),
('output-store', 'Store Content', 'Save generated content to database', 'output', 'FileText', 'info',
 '["Versioning", "Supabase"]'::jsonb,
 '["Auto-versioning", "Metadata capture"]'::jsonb, 51),
('output-export', 'Export Files', 'Export in multiple formats', 'output', 'Download', 'primary',
 '["Multi-Format", "Branded"]'::jsonb,
 '["PDF/DOCX/HTML export", "Custom styling"]'::jsonb, 52),
('output-schedule', 'Schedule Publish', 'Schedule content for publication', 'output', 'Calendar', 'warning',
 '["Scheduling", "Multi-Channel"]'::jsonb,
 '["Timezone-aware scheduling", "Queue management"]'::jsonb, 53)
ON CONFLICT (node_id) DO NOTHING;

-- ============================================================
-- DEFAULT OPS CONFIG
-- ============================================================
INSERT INTO ops_config (version, config, is_active, created_by)
SELECT 'v1.0.0',
'{
  "writer": {"model": "gpt-4", "temperature": 0.7, "max_tokens": 2000},
  "analytics": {"aggregation_interval": "1h", "retention_days": 90},
  "learning": {"min_sample_size": 100, "significance_threshold": 0.95}
}'::jsonb,
true,
'system'
WHERE NOT EXISTS (SELECT 1 FROM ops_config WHERE is_active = true);

-- ============================================================
-- DEFAULT SUPERADMIN
-- ============================================================
INSERT INTO platform_admins (email, full_name, password_hash, is_active)
VALUES ('anweshrath@gmail.com', 'Anwesh Rath',
    '$2b$10$/moEKb.MmnDA4fLrQ3bwB.Ps2Wdayrul9VCgqEMhP/ZBWcaKE/37S', true)
ON CONFLICT (email) DO NOTHING;
