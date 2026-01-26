-- ============================================================
-- AXIOM ENGINE - NODE PALETTE V2
-- Migration: update_node_palette_v2.sql
-- Date: 2026-01-26
-- 
-- PURPOSE: Replace placeholder nodes with proper V1 node types
-- that align with the client requirements.
-- ============================================================

-- STEP 1: Clear existing node palette (start fresh)
DELETE FROM node_palette;

-- ============================================================
-- TRIGGER NODES (3)
-- Start points for workflows
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, default_config, is_active, sort_order) VALUES

('webhook-trigger', 
 'Webhook Trigger', 
 'Receive data from n8n, Zapier, or any external webhook source. Primary entry point for production workflows.',
 'trigger', 'Webhook', 'warning',
 '["Webhook Integration", "n8n Compatible", "Zapier Compatible", "Custom Headers"]'::jsonb,
 '["Parse JSON payload", "Extract headers", "Validate signature", "Rate limiting"]'::jsonb,
 '{"validateSignature": false, "rateLimitPerMinute": 60}'::jsonb,
 true, 1),

('schedule-trigger',
 'Schedule Trigger',
 'Run workflow on a schedule. Supports cron expressions. Default: Daily at 6 AM EST (Learning Loop).',
 'trigger', 'Clock', 'warning',
 '["Cron Support", "Timezone Aware", "Retry on Failure"]'::jsonb,
 '["Cron expression parsing", "Timezone conversion", "Last run tracking", "Skip on failure option"]'::jsonb,
 '{"cronExpression": "0 6 * * *", "timezone": "America/New_York", "retryOnFailure": true}'::jsonb,
 true, 2),

('manual-trigger',
 'Manual Trigger',
 'Start workflow manually for testing or on-demand execution. Supports mock data injection.',
 'trigger', 'Play', 'info',
 '["On-Demand", "Test Mode", "Mock Data"]'::jsonb,
 '["Manual execution", "Test mode flag", "Mock data injection", "Debug logging"]'::jsonb,
 '{"testMode": false}'::jsonb,
 true, 3);

-- ============================================================
-- RESOLVER NODES (5) - NEW CATEGORY
-- KB lookup and context resolution
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, default_config, is_active, sort_order) VALUES

('resolve-icp',
 'Resolve ICP',
 'Match input signals to an ICP segment from the Knowledge Base. Uses hints like industry, job title, company size.',
 'input', 'Target', 'info',
 '["AI Matching", "Hint-Based", "Confidence Score"]'::jsonb,
 '["Match by industry", "Match by job title", "Match by company size", "Fallback to default ICP", "Return confidence score"]'::jsonb,
 '{"fallbackToDefault": true, "minConfidence": 0.5}'::jsonb,
 true, 10),

('resolve-offer',
 'Resolve Offer',
 'Select the appropriate Offer from KB based on context. Can match by category or ICP fit.',
 'input', 'Tag', 'info',
 '["Context Matching", "ICP Alignment"]'::jsonb,
 '["Match by category", "Match by ICP fit", "Price range filtering", "Return best match"]'::jsonb,
 '{"requireICP": false}'::jsonb,
 true, 11),

('resolve-angle',
 'Select Angle',
 'Choose persuasion angle from KB. Respects learning preferences. 6 axes: risk, speed, control, loss, upside, identity.',
 'input', 'Compass', 'info',
 '["KB Preferences", "6 Persuasion Axes", "Learning-Aware"]'::jsonb,
 '["Check KB preferences first", "Default by ICP if no preference", "Random from applicable if no match"]'::jsonb,
 '{"respectKBPreferences": true}'::jsonb,
 true, 12),

('resolve-blueprint',
 'Select Blueprint',
 'Choose content blueprint based on type. Websites, emails, social posts each have their own blueprint types.',
 'input', 'Layout', 'info',
 '["Multi-Content-Type", "Layout Selection"]'::jsonb,
 '["Website page blueprints", "Email flow blueprints", "Social post blueprints", "Layout matching"]'::jsonb,
 '{"includeLayout": true}'::jsonb,
 true, 13),

('resolve-cta',
 'Select CTA',
 'Choose Call-to-Action based on routing rules in KB. Considers buyer stage and entry point.',
 'input', 'MousePointer', 'info',
 '["Routing Rules", "Buyer Stage Aware"]'::jsonb,
 '["Apply routing rules", "Consider buyer stage", "Return destination slug", "Track routing suggestions"]'::jsonb,
 '{}'::jsonb,
 true, 14);

-- ============================================================
-- GENERATOR NODES (5)
-- Content-type-specific generation
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, default_config, is_active, sort_order) VALUES

('generate-website-page',
 'Generate Page',
 'Generate a single website page with sections. Uses blueprint, layout, angle, and CTA context.',
 'process', 'FileText', 'primary',
 '["Section-Based", "KB-Driven", "Variant Support"]'::jsonb,
 '["Build sections from layout", "Apply angle narrative", "Insert CTAs", "Generate routing suggestions", "Create variants for A/B"]'::jsonb,
 '{"generateVariant": false}'::jsonb,
 true, 20),

('generate-website-bundle',
 'Generate Website',
 'Generate multiple pages as a cohesive bundle with routing map. For funnels and multi-page sites.',
 'process', 'Layers', 'primary',
 '["Multi-Page", "Routing Map", "Consistent Variants"]'::jsonb,
 '["Generate multiple page types", "Build routing map", "Ensure variant consistency", "Cross-reference CTAs"]'::jsonb,
 '{"includeRouting": true}'::jsonb,
 true, 21),

('generate-email-flow',
 'Generate Email Flow',
 'Create email sequence with delays. Soap Opera or Seinfeld style. 3-7 emails with progression.',
 'process', 'Mail', 'primary',
 '["Sequence Logic", "Delay Configuration", "Story Arc"]'::jsonb,
 '["Generate subject lines", "First line hooks", "Body with angle", "Progressive CTAs", "Delay rules"]'::jsonb,
 '{"defaultEmailCount": 5, "defaultDelayHours": 48}'::jsonb,
 true, 22),

('generate-email-reply',
 'Generate Reply',
 'Generate contextual email reply using scenario matching and reply strategies from KB.',
 'process', 'Reply', 'primary',
 '["Scenario Matching", "Strategy Selection", "Thread-Aware"]'::jsonb,
 '["Match to scenario", "Apply reply strategy", "Consider thread context", "Generate variants"]'::jsonb,
 '{"includeThread": true}'::jsonb,
 true, 23),

('generate-social-post',
 'Generate Social',
 'Create platform-specific social content. LinkedIn, X, YouTube with proper constraints.',
 'process', 'Share2', 'primary',
 '["Platform-Specific", "Pillar-Based", "Hashtag Generation"]'::jsonb,
 '["Apply platform constraints", "Use content pillar", "Generate hashtags", "Format for platform"]'::jsonb,
 '{"generateHashtags": true}'::jsonb,
 true, 24);

-- ============================================================
-- PROCESSOR NODES (4)
-- Data transformation and enrichment
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, default_config, is_active, sort_order) VALUES

('analyze-intent',
 'Analyze Intent',
 'Detect intent, scenario, sentiment from incoming content. Powers reply playbook matching.',
 'process', 'Search', 'accent',
 '["AI Detection", "Scenario Matching", "Sentiment Analysis"]'::jsonb,
 '["Intent classification", "Scenario detection", "Sentiment scoring", "Urgency detection", "Topic extraction"]'::jsonb,
 '{"includeTopics": true}'::jsonb,
 true, 30),

('web-search',
 'Web Research',
 'Search the web for context. Useful for blog posts and thought leadership content.',
 'process', 'Globe', 'accent',
 '["Real-time", "Multi-Source", "Synthesis"]'::jsonb,
 '["Search via Perplexity/Tavily", "Filter by date", "Filter by domain", "Synthesize into context"]'::jsonb,
 '{"maxResults": 5, "synthesize": true}'::jsonb,
 true, 31),

('seo-optimize',
 'SEO Optimizer',
 'Optimize content for search engines. Keyword density, meta tags, heading structure.',
 'process', 'TrendingUp', 'accent',
 '["Keyword Analysis", "Meta Generation", "Structure Check"]'::jsonb,
 '["Analyze keyword density", "Generate meta title/description", "Check heading structure", "Suggest improvements"]'::jsonb,
 '{"targetDensity": 0.02}'::jsonb,
 true, 32),

('add-content-locker',
 'Content Locker',
 'Add email gates and content locking hooks for lead generation.',
 'process', 'Lock', 'accent',
 '["Email Gates", "Progressive Unlock", "Analytics Hooks"]'::jsonb,
 '["Insert gate points", "Configure unlock conditions", "Add analytics events"]'::jsonb,
 '{"gateType": "email"}'::jsonb,
 true, 33);

-- ============================================================
-- VALIDATOR NODES (2)
-- Quality and compliance checking
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, default_config, is_active, sort_order) VALUES

('validate-constitution',
 'Constitution Check',
 'Validate content against organization guardrails. Forbidden terms, tone, compliance rules.',
 'condition', 'Shield', 'error',
 '["Rules Engine", "Auto-Fix", "Violation Logging"]'::jsonb,
 '["Check forbidden terms", "Validate tone", "Check compliance rules", "Suggest fixes", "Score content"]'::jsonb,
 '{"autoFix": false, "minScore": 70}'::jsonb,
 true, 40),

('validate-quality',
 'Quality Gate',
 'Multi-dimensional quality check. Clarity, engagement, accuracy, brand alignment.',
 'condition', 'CheckCircle', 'success',
 '["Multi-Dimensional", "Threshold-Based", "Action Routing"]'::jsonb,
 '["Score clarity", "Score engagement", "Score accuracy", "Score brand alignment", "Route by result"]'::jsonb,
 '{"minScore": 70, "maxIssues": 3}'::jsonb,
 true, 41);

-- ============================================================
-- CONDITION NODES (3)
-- Branching and routing
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, default_config, is_active, sort_order) VALUES

('route-by-stage',
 'Route by Stage',
 'Branch workflow based on buyer awareness stage. 5 outputs: Unaware → Most Aware.',
 'condition', 'GitBranch', 'accent',
 '["5-Way Branch", "Stage Detection"]'::jsonb,
 '["Route to UNAWARE branch", "Route to PROBLEM_AWARE branch", "Route to SOLUTION_AWARE branch", "Route to PRODUCT_AWARE branch", "Route to MOST_AWARE branch"]'::jsonb,
 '{}'::jsonb,
 true, 50),

('route-by-validation',
 'Route by Validation',
 'Branch workflow based on validation result. 2 outputs: Pass or Fail.',
 'condition', 'Split', 'accent',
 '["Binary Branch", "Pass/Fail Routing"]'::jsonb,
 '["Route to PASS branch", "Route to FAIL branch"]'::jsonb,
 '{}'::jsonb,
 true, 51),

('route-by-type',
 'Route by Type',
 'Branch workflow based on content type requested. N outputs for N content types.',
 'condition', 'Shuffle', 'accent',
 '["Multi-Branch", "Content-Type Routing"]'::jsonb,
 '["Route by website", "Route by email_flow", "Route by email_reply", "Route by social_post"]'::jsonb,
 '{}'::jsonb,
 true, 52);

-- ============================================================
-- OUTPUT NODES (3)
-- Terminal nodes for workflow completion
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, default_config, is_active, sort_order) VALUES

('output-webhook',
 'Send Webhook',
 'Send result back via HTTP webhook. Primary output for n8n integration.',
 'output', 'Send', 'success',
 '["HTTP Response", "Custom Headers", "Retry Logic"]'::jsonb,
 '["POST/PUT payload", "Custom headers", "Status codes", "Retry on failure"]'::jsonb,
 '{"method": "POST", "retryOnFailure": true}'::jsonb,
 true, 60),

('output-store',
 'Store Content',
 'Save generated content to database with versioning and metadata.',
 'output', 'Database', 'success',
 '["Versioning", "Metadata", "Searchable"]'::jsonb,
 '["Auto-versioning", "Attach metadata", "Tag for search", "Return storage ID"]'::jsonb,
 '{"autoVersion": true}'::jsonb,
 true, 61),

('output-analytics',
 'Log Analytics',
 'Record event for learning loop. Enables performance tracking and KB preference updates.',
 'output', 'BarChart3', 'success',
 '["Event Logging", "Learning Loop", "Tracking"]'::jsonb,
 '["Log generation event", "Track variant", "Record context", "Enable learning loop"]'::jsonb,
 '{}'::jsonb,
 true, 62);

-- ============================================================
-- SUMMARY
-- ============================================================
-- Total nodes: 25
-- Triggers: 3
-- Resolvers (as input category): 5
-- Generators (as process category): 5
-- Processors (as process category): 4
-- Validators (as condition category): 2
-- Conditions: 3
-- Outputs: 3
-- ============================================================
