-- ============================================================
-- MIGRATION: Node Palette Redesign
-- Adds new categories and node types per V1 requirements
-- ============================================================

-- ============================================================
-- 1. UPDATE CATEGORY CONSTRAINT
-- Add 'resolver', 'generator', 'processor', 'validator' categories
-- ============================================================

-- Drop old constraint
ALTER TABLE node_palette DROP CONSTRAINT IF EXISTS node_palette_category_check;

-- Add new constraint with expanded categories
ALTER TABLE node_palette ADD CONSTRAINT node_palette_category_check 
    CHECK (category IN ('trigger', 'resolver', 'generator', 'processor', 'validator', 'condition', 'output', 'input', 'process', 'preview'));

-- ============================================================
-- 2. ADD INPUT/OUTPUT SCHEMA COLUMNS
-- Store Zod schema references for validation
-- ============================================================

ALTER TABLE node_palette ADD COLUMN IF NOT EXISTS input_schema VARCHAR(100);
ALTER TABLE node_palette ADD COLUMN IF NOT EXISTS output_schema VARCHAR(100);

COMMENT ON COLUMN node_palette.input_schema IS 'Reference to Zod input schema name in workers/src/schemas/nodes/';
COMMENT ON COLUMN node_palette.output_schema IS 'Reference to Zod output schema name in workers/src/schemas/nodes/';

-- ============================================================
-- 3. INSERT NEW RESOLVER NODES (The KEY innovation!)
-- These explicitly surface KB lookup steps
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, input_schema, output_schema, sort_order) VALUES
('resolve-icp', 'Resolve ICP', 'Match input signals to Ideal Customer Profile from Knowledge Base', 
 'resolver', 'Target', 'success', 
 '["KB Lookup", "Smart Matching"]'::jsonb,
 '["Industry matching", "Company size detection", "Pain point alignment", "Confidence scoring"]'::jsonb,
 'ResolveICPInput', 'ResolveICPOutput', 100),

('resolve-offer', 'Resolve Offer', 'Match ICP and stage to best offer from Knowledge Base',
 'resolver', 'Gift', 'success',
 '["Stage Aware", "ICP Aligned"]'::jsonb,
 '["Buyer stage matching", "Offer positioning", "Value prop selection", "Pricing tier selection"]'::jsonb,
 'ResolveOfferInput', 'ResolveOfferOutput', 101),

('resolve-angle', 'Select Angle', 'Choose persuasion angle based on ICP psychology',
 'resolver', 'Compass', 'success',
 '["Psychology Based", "A/B Ready"]'::jsonb,
 '["Pain vs gain selection", "Emotional trigger matching", "Proof point selection", "Hook generation"]'::jsonb,
 'ResolveAngleInput', 'ResolveAngleOutput', 102),

('resolve-blueprint', 'Select Blueprint', 'Choose content structure template for content type',
 'resolver', 'Layout', 'success',
 '["Content Specific", "Structured Output"]'::jsonb,
 '["Section planning", "Length optimization", "Format selection", "Example reference"]'::jsonb,
 'ResolveBlueprintInput', 'ResolveBlueprintOutput', 103),

('resolve-cta', 'Select CTA', 'Choose call-to-action based on offer and stage',
 'resolver', 'MousePointer', 'success',
 '["Urgency Levels", "Stage Appropriate"]'::jsonb,
 '["Action text generation", "URL mapping", "Urgency calibration", "A/B variations"]'::jsonb,
 'ResolveCTAInput', 'ResolveCTAOutput', 104);

-- ============================================================
-- 4. INSERT NEW GENERATOR NODES (Content-type specific!)
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, input_schema, output_schema, sort_order) VALUES
('generate-website-page', 'Generate Page', 'Create single web page with resolved context',
 'generator', 'FileCode', 'primary',
 '["SEO Ready", "Responsive"]'::jsonb,
 '["Section generation", "SEO metadata", "Responsive HTML", "CTA integration"]'::jsonb,
 'GenerateWebsitePageInput', 'GenerateWebsitePageOutput', 200),

('generate-website-bundle', 'Generate Website', 'Create multi-page website with navigation',
 'generator', 'Folders', 'primary',
 '["Multi-Page", "Navigation"]'::jsonb,
 '["Page set generation", "Navigation structure", "Internal linking", "Sitemap creation"]'::jsonb,
 'GenerateWebsiteBundleInput', 'GenerateWebsiteBundleOutput', 201),

('generate-email-flow', 'Generate Email Flow', 'Create email sequence with delays',
 'generator', 'MailPlus', 'primary',
 '["Sequenced", "Delay Logic"]'::jsonb,
 '["Multi-email generation", "Subject line variants", "Delay configuration", "CTA progression"]'::jsonb,
 'GenerateEmailFlowInput', 'GenerateEmailFlowOutput', 202),

('generate-email-reply', 'Generate Reply', 'Create contextual email reply',
 'generator', 'Reply', 'primary',
 '["Thread Aware", "Intent Based"]'::jsonb,
 '["Thread context analysis", "Intent-based response", "Objection handling", "Call scheduling"]'::jsonb,
 'GenerateEmailReplyInput', 'GenerateEmailReplyOutput', 203),

('generate-social-post', 'Generate Social', 'Create platform-specific social content',
 'generator', 'Share2', 'primary',
 '["Platform Aware", "Hashtags"]'::jsonb,
 '["Platform optimization", "Character limits", "Hashtag generation", "Image prompts"]'::jsonb,
 'GenerateSocialPostInput', 'GenerateSocialPostOutput', 204);

-- ============================================================
-- 5. INSERT NEW PROCESSOR NODES
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, input_schema, output_schema, sort_order) VALUES
('kb-retrieval', 'KB Retrieval', 'Semantic search across Knowledge Base vectors',
 'processor', 'DatabaseSearch', 'info',
 '["Vector Search", "Semantic"]'::jsonb,
 '["Embedding generation", "Similarity search", "Threshold filtering", "Source attribution"]'::jsonb,
 'KBRetrievalInput', 'KBRetrievalOutput', 300);

-- ============================================================
-- 6. UPDATE EXISTING NODES WITH SCHEMA REFERENCES
-- ============================================================

UPDATE node_palette SET 
    input_schema = 'WebhookTriggerInput',
    output_schema = 'WebhookTriggerOutput'
WHERE node_id = 'email-trigger';

UPDATE node_palette SET 
    input_schema = 'ManualTriggerInput',
    output_schema = 'ManualTriggerOutput'
WHERE node_id = 'manual-trigger';

UPDATE node_palette SET 
    input_schema = 'ScheduleTriggerInput',
    output_schema = 'ScheduleTriggerOutput'
WHERE node_id = 'schedule-trigger';

UPDATE node_palette SET 
    input_schema = 'AnalyzeIntentInput',
    output_schema = 'AnalyzeIntentOutput'
WHERE node_id = 'analyze-intent';

UPDATE node_palette SET 
    input_schema = 'KBRetrievalInput',
    output_schema = 'KBRetrievalOutput'
WHERE node_id = 'retrieve-kb';

UPDATE node_palette SET 
    input_schema = 'WebSearchInput',
    output_schema = 'WebSearchOutput'
WHERE node_id = 'web-search';

UPDATE node_palette SET 
    input_schema = 'ContentLockerInput',
    output_schema = 'ContentLockerOutput'
WHERE node_id = 'content-locker';

UPDATE node_palette SET 
    input_schema = 'SeoOptimizerInput',
    output_schema = 'SeoOptimizerOutput'
WHERE node_id = 'seo-optimizer';

UPDATE node_palette SET 
    input_schema = 'ConstitutionCheckInput',
    output_schema = 'ConstitutionCheckOutput'
WHERE node_id = 'validate-constitution';

UPDATE node_palette SET 
    input_schema = 'IfElseConditionInput',
    output_schema = 'IfElseConditionOutput'
WHERE node_id = 'logic-gate';

UPDATE node_palette SET 
    input_schema = 'QualityGateInput',
    output_schema = 'QualityGateOutput'
WHERE node_id = 'validation-check';

UPDATE node_palette SET 
    input_schema = 'OutputWebhookInput',
    output_schema = 'OutputWebhookOutput'
WHERE node_id = 'output-n8n';

UPDATE node_palette SET 
    input_schema = 'OutputStoreInput',
    output_schema = 'OutputStoreOutput'
WHERE node_id = 'output-store';

UPDATE node_palette SET 
    input_schema = 'OutputExportInput',
    output_schema = 'OutputExportOutput'
WHERE node_id = 'output-export';

UPDATE node_palette SET 
    input_schema = 'OutputAnalyticsInput',
    output_schema = 'OutputAnalyticsOutput'
WHERE node_id = 'output-analytics';

-- ============================================================
-- 7. ADD ROUTE CONDITION NODES
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, input_schema, output_schema, sort_order) VALUES
('route-by-stage', 'Route by Stage', 'Branch workflow based on buyer awareness stage',
 'condition', 'GitBranch', 'accent',
 '["Stage Detection", "Multi-Path"]'::jsonb,
 '["Auto stage detection", "5-stage routing", "Confidence scoring", "Default path"]'::jsonb,
 'RouteByStageInput', 'RouteByStageOutput', 400),

('route-by-validation', 'Route by Validation', 'Branch based on pass/fail result',
 'condition', 'GitMerge', 'accent',
 '["Pass/Fail", "Threshold"]'::jsonb,
 '["Score threshold routing", "Review path", "Auto-retry path"]'::jsonb,
 'RouteByValidationInput', 'RouteByValidationOutput', 401),

('route-by-type', 'Route by Content Type', 'Branch based on requested content type',
 'condition', 'Layers', 'accent',
 '["Type Detection", "Default Path"]'::jsonb,
 '["Content type matching", "Unknown type handling", "Multi-type support"]'::jsonb,
 'RouteByContentTypeInput', 'RouteByContentTypeOutput', 402);

-- ============================================================
-- 8. ADD OUTPUT EMAIL NODE
-- ============================================================

INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities, input_schema, output_schema, sort_order) VALUES
('output-email', 'Send Email', 'Send email via Resend API',
 'output', 'Send', 'success',
 '["Resend API", "Tracking"]'::jsonb,
 '["HTML/Plain text", "Scheduling", "Open/click tracking", "CC/BCC support"]'::jsonb,
 'OutputEmailInput', 'OutputEmailOutput', 500);

-- ============================================================
-- COMPLETE
-- ============================================================
