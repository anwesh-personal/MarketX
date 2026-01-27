-- ============================================================
-- AXIOM ENGINE - V2 WORKFLOW TEMPLATES
-- Migration: workflow-v2-templates.sql
-- Date: 2026-01-26
-- 
-- This adds V2-compatible workflow templates that match
-- the V2_ALL_NODES definitions in v2-node-definitions.ts
-- ============================================================

-- ============================================================
-- CLEAR OLD TEMPLATES (start fresh with V2)
-- ============================================================

DELETE FROM workflow_templates WHERE name LIKE '%v1' OR name LIKE '% v1';

-- ============================================================
-- V2 WORKFLOW TEMPLATES
-- Using nodeTypes that match V2_ALL_NODES:
-- trigger-webhook, trigger-schedule, trigger-manual, trigger-email-inbound
-- resolve-icp, resolve-offer, resolve-angle, resolve-blueprint, resolve-cta
-- generate-email-reply, generate-email-flow, generate-website-page, etc.
-- validate-quality, validate-constitution, analyze-intent
-- output-webhook, output-store, output-email
-- ============================================================

-- Template 1: Email Reply Engine
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Email Reply Engine', 
 'Constitutional email reply generation. Resolves ICP and offer from KB, generates personalized reply, validates against constitution.', 
 'active',
 '[
    {"id":"trigger-1","type":"v2Node","position":{"x":50,"y":200},"data":{"label":"Email Received","nodeType":"trigger-email-inbound","category":"trigger","color":"#F59E0B","config":{"parseAttachments":true},"features":["Email Parsing","Attachment Support"]}},
    {"id":"resolve-icp-1","type":"v2Node","position":{"x":300,"y":100},"data":{"label":"Resolve ICP","nodeType":"resolve-icp","category":"resolver","color":"#8B5CF6","config":{"selectionMode":"auto"},"features":["Context Matching","Segment Selection"]}},
    {"id":"resolve-offer-1","type":"v2Node","position":{"x":300,"y":300},"data":{"label":"Resolve Offer","nodeType":"resolve-offer","category":"resolver","color":"#8B5CF6","config":{"selectionMode":"auto"},"features":["Product Matching","Pricing Info"]}},
    {"id":"generate-1","type":"v2Node","position":{"x":550,"y":200},"data":{"label":"Generate Reply","nodeType":"generate-email-reply","category":"generator","color":"#10B981","config":{"includeSignature":true,"tone":"professional"},"features":["Context-Aware","Personalization"]}},
    {"id":"validate-1","type":"v2Node","position":{"x":800,"y":200},"data":{"label":"Constitution Check","nodeType":"validate-constitution","category":"validator","color":"#3B82F6","config":{"strictMode":false},"features":["Rule Checks","Forbidden Terms"]}},
    {"id":"output-1","type":"v2Node","position":{"x":1050,"y":200},"data":{"label":"Send Email","nodeType":"output-email","category":"output","color":"#EF4444","config":{"provider":"resend"},"features":["SMTP/API","Tracking"]}}
  ]'::jsonb,
 '[
    {"id":"e1","source":"trigger-1","target":"resolve-icp-1","animated":true,"type":"smoothstep"},
    {"id":"e2","source":"trigger-1","target":"resolve-offer-1","animated":true,"type":"smoothstep"},
    {"id":"e3","source":"resolve-icp-1","target":"generate-1","animated":true,"type":"smoothstep"},
    {"id":"e4","source":"resolve-offer-1","target":"generate-1","animated":true,"type":"smoothstep"},
    {"id":"e5","source":"generate-1","target":"validate-1","animated":true,"type":"smoothstep"},
    {"id":"e6","source":"validate-1","target":"output-1","animated":true,"type":"smoothstep"}
  ]'::jsonb);

-- Template 2: Email Nurture Flow Generator
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Email Nurture Flow', 
 'Creates 5-email nurture sequences with proper timing and personalization. Uses ICP, offer, and angle resolution.', 
 'active',
 '[
    {"id":"trigger-1","type":"v2Node","position":{"x":50,"y":200},"data":{"label":"Manual Start","nodeType":"trigger-manual","category":"trigger","color":"#F59E0B","config":{"inputSchema":{}},"features":["Form Input","Variable Mapping"]}},
    {"id":"resolve-icp-1","type":"v2Node","position":{"x":300,"y":100},"data":{"label":"Resolve ICP","nodeType":"resolve-icp","category":"resolver","color":"#8B5CF6","config":{},"features":["Context Matching"]}},
    {"id":"resolve-angle-1","type":"v2Node","position":{"x":300,"y":300},"data":{"label":"Resolve Angle","nodeType":"resolve-angle","category":"resolver","color":"#8B5CF6","config":{},"features":["Narrative Selection"]}},
    {"id":"generate-1","type":"v2Node","position":{"x":550,"y":200},"data":{"label":"Generate Flow","nodeType":"generate-email-flow","category":"generator","color":"#10B981","config":{"emailCount":5,"daysBetween":2},"features":["Sequence Builder","A/B Variants"]}},
    {"id":"validate-1","type":"v2Node","position":{"x":800,"y":200},"data":{"label":"Quality Check","nodeType":"validate-quality","category":"validator","color":"#3B82F6","config":{"minScore":70},"features":["Grammar Check","Readability"]}},
    {"id":"output-1","type":"v2Node","position":{"x":1050,"y":200},"data":{"label":"Store Flow","nodeType":"output-store","category":"output","color":"#EF4444","config":{"table":"email_flows"},"features":["Supabase","Versioning"]}}
  ]'::jsonb,
 '[
    {"id":"e1","source":"trigger-1","target":"resolve-icp-1","animated":true,"type":"smoothstep"},
    {"id":"e2","source":"trigger-1","target":"resolve-angle-1","animated":true,"type":"smoothstep"},
    {"id":"e3","source":"resolve-icp-1","target":"generate-1","animated":true,"type":"smoothstep"},
    {"id":"e4","source":"resolve-angle-1","target":"generate-1","animated":true,"type":"smoothstep"},
    {"id":"e5","source":"generate-1","target":"validate-1","animated":true,"type":"smoothstep"},
    {"id":"e6","source":"validate-1","target":"output-1","animated":true,"type":"smoothstep"}
  ]'::jsonb);

-- Template 3: Blog + Social Content Engine
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Blog + Social Engine', 
 'Generates SEO-optimized blog posts with matching LinkedIn and X posts. Uses web research for fresh data.', 
 'active',
 '[
    {"id":"trigger-1","type":"v2Node","position":{"x":50,"y":250},"data":{"label":"Manual Start","nodeType":"trigger-manual","category":"trigger","color":"#F59E0B","config":{},"features":["Form Input"]}},
    {"id":"resolve-blueprint-1","type":"v2Node","position":{"x":300,"y":150},"data":{"label":"Resolve Blueprint","nodeType":"resolve-blueprint","category":"resolver","color":"#8B5CF6","config":{},"features":["Template Selection"]}},
    {"id":"enrich-web-1","type":"v2Node","position":{"x":300,"y":350},"data":{"label":"Web Research","nodeType":"enrich-web-search","category":"enricher","color":"#EC4899","config":{"maxResults":5},"features":["Live Search","Source Attribution"]}},
    {"id":"generate-blog-1","type":"v2Node","position":{"x":600,"y":150},"data":{"label":"Generate Blog","nodeType":"generate-website-page","category":"generator","color":"#10B981","config":{"pageType":"blog"},"features":["SEO Optimized"]}},
    {"id":"generate-social-1","type":"v2Node","position":{"x":600,"y":350},"data":{"label":"Generate Social","nodeType":"generate-social-post","category":"generator","color":"#10B981","config":{"platforms":["linkedin","twitter"]},"features":["Multi-Platform"]}},
    {"id":"validate-1","type":"v2Node","position":{"x":900,"y":250},"data":{"label":"Constitution Check","nodeType":"validate-constitution","category":"validator","color":"#3B82F6","config":{},"features":["Brand Voice"]}},
    {"id":"output-1","type":"v2Node","position":{"x":1150,"y":250},"data":{"label":"Store Content","nodeType":"output-store","category":"output","color":"#EF4444","config":{"table":"generated_content"},"features":["Versioning"]}}
  ]'::jsonb,
 '[
    {"id":"e1","source":"trigger-1","target":"resolve-blueprint-1","animated":true,"type":"smoothstep"},
    {"id":"e2","source":"trigger-1","target":"enrich-web-1","animated":true,"type":"smoothstep"},
    {"id":"e3","source":"resolve-blueprint-1","target":"generate-blog-1","animated":true,"type":"smoothstep"},
    {"id":"e4","source":"enrich-web-1","target":"generate-blog-1","animated":true,"type":"smoothstep"},
    {"id":"e5","source":"generate-blog-1","target":"generate-social-1","animated":true,"type":"smoothstep"},
    {"id":"e6","source":"generate-blog-1","target":"validate-1","animated":true,"type":"smoothstep"},
    {"id":"e7","source":"generate-social-1","target":"validate-1","animated":true,"type":"smoothstep"},
    {"id":"e8","source":"validate-1","target":"output-1","animated":true,"type":"smoothstep"}
  ]'::jsonb);

-- Template 4: Landing Page Builder
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Landing Page Builder', 
 'Full landing page generator with copy + HTML. Includes hero, benefits, testimonials, FAQ, and CTA sections.', 
 'active',
 '[
    {"id":"trigger-1","type":"v2Node","position":{"x":50,"y":250},"data":{"label":"Manual Start","nodeType":"trigger-manual","category":"trigger","color":"#F59E0B","config":{},"features":["Form Input"]}},
    {"id":"resolve-icp-1","type":"v2Node","position":{"x":300,"y":150},"data":{"label":"Resolve ICP","nodeType":"resolve-icp","category":"resolver","color":"#8B5CF6","config":{},"features":["Context Matching"]}},
    {"id":"resolve-offer-1","type":"v2Node","position":{"x":300,"y":350},"data":{"label":"Resolve Offer","nodeType":"resolve-offer","category":"resolver","color":"#8B5CF6","config":{},"features":["Product Matching"]}},
    {"id":"generate-page-1","type":"v2Node","position":{"x":600,"y":250},"data":{"label":"Generate Page","nodeType":"generate-website-page","category":"generator","color":"#10B981","config":{"pageType":"landing"},"features":["SEO Optimized","Responsive"]}},
    {"id":"validate-1","type":"v2Node","position":{"x":900,"y":250},"data":{"label":"Constitution Check","nodeType":"validate-constitution","category":"validator","color":"#3B82F6","config":{},"features":["Brand Voice"]}},
    {"id":"output-1","type":"v2Node","position":{"x":1150,"y":250},"data":{"label":"Store Page","nodeType":"output-store","category":"output","color":"#EF4444","config":{},"features":["Versioning"]}}
  ]'::jsonb,
 '[
    {"id":"e1","source":"trigger-1","target":"resolve-icp-1","animated":true,"type":"smoothstep"},
    {"id":"e2","source":"trigger-1","target":"resolve-offer-1","animated":true,"type":"smoothstep"},
    {"id":"e3","source":"resolve-icp-1","target":"generate-page-1","animated":true,"type":"smoothstep"},
    {"id":"e4","source":"resolve-offer-1","target":"generate-page-1","animated":true,"type":"smoothstep"},
    {"id":"e5","source":"generate-page-1","target":"validate-1","animated":true,"type":"smoothstep"},
    {"id":"e6","source":"validate-1","target":"output-1","animated":true,"type":"smoothstep"}
  ]'::jsonb);

-- Template 5: Sales Funnel Pack
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Sales Funnel Pack', 
 'Complete funnel: Opt-in, Thank-you, Sales page, Order confirmation. Uses parallel generation with merge.', 
 'active',
 '[
    {"id":"trigger-1","type":"v2Node","position":{"x":50,"y":250},"data":{"label":"Manual Start","nodeType":"trigger-manual","category":"trigger","color":"#F59E0B","config":{},"features":["Form Input"]}},
    {"id":"resolve-offer-1","type":"v2Node","position":{"x":300,"y":250},"data":{"label":"Resolve Offer","nodeType":"resolve-offer","category":"resolver","color":"#8B5CF6","config":{},"features":["Product Matching"]}},
    {"id":"split-1","type":"v2Node","position":{"x":550,"y":250},"data":{"label":"Split Parallel","nodeType":"split-parallel","category":"utility","color":"#6366F1","config":{"branchCount":4},"features":["Parallel Execution"]}},
    {"id":"generate-optin","type":"v2Node","position":{"x":800,"y":50},"data":{"label":"Opt-in Page","nodeType":"generate-website-page","category":"generator","color":"#10B981","config":{"pageType":"optin"},"features":["Email Capture"]}},
    {"id":"generate-thanks","type":"v2Node","position":{"x":800,"y":175},"data":{"label":"Thank You Page","nodeType":"generate-website-page","category":"generator","color":"#10B981","config":{"pageType":"thankyou"},"features":["Confirmation"]}},
    {"id":"generate-sales","type":"v2Node","position":{"x":800,"y":300},"data":{"label":"Sales Page","nodeType":"generate-website-page","category":"generator","color":"#10B981","config":{"pageType":"sales"},"features":["Long-form"]}},
    {"id":"generate-confirm","type":"v2Node","position":{"x":800,"y":425},"data":{"label":"Order Confirm","nodeType":"generate-website-page","category":"generator","color":"#10B981","config":{"pageType":"confirmation"},"features":["Receipt"]}},
    {"id":"merge-1","type":"v2Node","position":{"x":1050,"y":250},"data":{"label":"Merge Results","nodeType":"merge-combine","category":"utility","color":"#6366F1","config":{"waitMode":"all"},"features":["Wait All"]}},
    {"id":"validate-1","type":"v2Node","position":{"x":1300,"y":250},"data":{"label":"Validate All","nodeType":"validate-constitution","category":"validator","color":"#3B82F6","config":{},"features":["Brand Voice"]}},
    {"id":"output-1","type":"v2Node","position":{"x":1550,"y":250},"data":{"label":"Store Funnel","nodeType":"output-store","category":"output","color":"#EF4444","config":{},"features":["Versioning"]}}
  ]'::jsonb,
 '[
    {"id":"e1","source":"trigger-1","target":"resolve-offer-1","animated":true,"type":"smoothstep"},
    {"id":"e2","source":"resolve-offer-1","target":"split-1","animated":true,"type":"smoothstep"},
    {"id":"e3","source":"split-1","target":"generate-optin","animated":true,"type":"smoothstep"},
    {"id":"e4","source":"split-1","target":"generate-thanks","animated":true,"type":"smoothstep"},
    {"id":"e5","source":"split-1","target":"generate-sales","animated":true,"type":"smoothstep"},
    {"id":"e6","source":"split-1","target":"generate-confirm","animated":true,"type":"smoothstep"},
    {"id":"e7","source":"generate-optin","target":"merge-1","animated":true,"type":"smoothstep"},
    {"id":"e8","source":"generate-thanks","target":"merge-1","animated":true,"type":"smoothstep"},
    {"id":"e9","source":"generate-sales","target":"merge-1","animated":true,"type":"smoothstep"},
    {"id":"e10","source":"generate-confirm","target":"merge-1","animated":true,"type":"smoothstep"},
    {"id":"e11","source":"merge-1","target":"validate-1","animated":true,"type":"smoothstep"},
    {"id":"e12","source":"validate-1","target":"output-1","animated":true,"type":"smoothstep"}
  ]'::jsonb);

-- Template 6: Webhook-Triggered Content Generator
INSERT INTO workflow_templates (name, description, status, nodes, edges) VALUES
('Webhook Content Generator', 
 'Webhook-triggered content generation with company enrichment and web research.', 
 'active',
 '[
    {"id":"trigger-1","type":"v2Node","position":{"x":50,"y":200},"data":{"label":"Webhook Trigger","nodeType":"trigger-webhook","category":"trigger","color":"#F59E0B","config":{"authType":"api_key"},"features":["REST Endpoint","Auth Support"]}},
    {"id":"enrich-company-1","type":"v2Node","position":{"x":300,"y":100},"data":{"label":"Enrich Company","nodeType":"enrich-company-data","category":"enricher","color":"#EC4899","config":{},"features":["Firmographics","Tech Stack"]}},
    {"id":"enrich-web-1","type":"v2Node","position":{"x":300,"y":300},"data":{"label":"Web Research","nodeType":"enrich-web-search","category":"enricher","color":"#EC4899","config":{"maxResults":3},"features":["Live Search"]}},
    {"id":"analyze-1","type":"v2Node","position":{"x":550,"y":200},"data":{"label":"Analyze Intent","nodeType":"analyze-intent","category":"validator","color":"#3B82F6","config":{"minConfidence":0.7},"features":["Intent Classification"]}},
    {"id":"generate-1","type":"v2Node","position":{"x":800,"y":200},"data":{"label":"Generate Content","nodeType":"generate-website-page","category":"generator","color":"#10B981","config":{},"features":["Context-Aware"]}},
    {"id":"output-1","type":"v2Node","position":{"x":1050,"y":200},"data":{"label":"Webhook Response","nodeType":"output-webhook","category":"output","color":"#EF4444","config":{"method":"POST","retries":3},"features":["HTTP POST","Retry Logic"]}}
  ]'::jsonb,
 '[
    {"id":"e1","source":"trigger-1","target":"enrich-company-1","animated":true,"type":"smoothstep"},
    {"id":"e2","source":"trigger-1","target":"enrich-web-1","animated":true,"type":"smoothstep"},
    {"id":"e3","source":"enrich-company-1","target":"analyze-1","animated":true,"type":"smoothstep"},
    {"id":"e4","source":"enrich-web-1","target":"analyze-1","animated":true,"type":"smoothstep"},
    {"id":"e5","source":"analyze-1","target":"generate-1","animated":true,"type":"smoothstep"},
    {"id":"e6","source":"generate-1","target":"output-1","animated":true,"type":"smoothstep"}
  ]'::jsonb);

-- ============================================================
-- COMPLETE!
-- 6 V2-compatible workflow templates added
-- ============================================================
