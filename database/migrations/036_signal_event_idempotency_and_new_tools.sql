-- ============================================================
-- MIGRATION 036: signal_event idempotency + 4 new brain tools
-- ============================================================

BEGIN;

-- ============================================================
-- 1. signal_event — add UNIQUE constraint for webhook idempotency
-- ============================================================
-- The unified webhook handler upserts with onConflict on this composite.
-- Without this constraint the upsert throws a Supabase runtime error.

-- Create a stable idempotency_key column if it doesn't exist
ALTER TABLE signal_event
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT GENERATED ALWAYS AS (
        COALESCE(partner_id::text, 'global') || ':' ||
        event_type || ':' ||
        COALESCE(metadata->>'message_id', id::text)
    ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS signal_event_idempotency_idx
    ON signal_event (idempotency_key);

-- ============================================================
-- 2. brain_tools — register 4 new tools
-- ============================================================
-- These are used by brain chat when user asks about performance,
-- learning, knowledge gaps, or brain health.

INSERT INTO brain_tools (name, description, parameters, is_enabled, min_tier, category) VALUES

(
    'get_campaign_insights',
    'Retrieve aggregated email campaign performance metrics for this organization. Returns open rate, click rate, reply rate, bounce rate, total sends, and top-performing beliefs. Use when user asks about campaign performance, email stats, or "how are my emails doing".',
    '{
        "type": "object",
        "properties": {
            "days": {
                "type": "integer",
                "description": "Number of days to look back (default 30, max 90)",
                "default": 30
            }
        },
        "required": []
    }'::jsonb,
    true,
    'basic',
    'analytics'
),

(
    'get_self_reflection',
    'Retrieve the brain''s recent self-reflection logs and dream cycle narratives. Use when user asks what the brain has been learning, how it is improving, or what insights it has gained recently.',
    '{
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Number of recent reflections to retrieve (default 3)",
                "default": 3
            }
        },
        "required": []
    }'::jsonb,
    true,
    'basic',
    'learning'
),

(
    'get_knowledge_gaps',
    'Retrieve open knowledge gaps that the brain has identified — areas where it lacks information to answer queries well. Use when user asks what they should add to the knowledge base, or what the brain doesn''t know.',
    '{
        "type": "object",
        "properties": {},
        "required": []
    }'::jsonb,
    true,
    'basic',
    'learning'
),

(
    'get_brain_health',
    'Get an overall health summary of the brain: memory count, belief count, average belief confidence score, open knowledge gaps, and a computed health score 0-100. Use for status reports or when user asks "how healthy is my brain?".',
    '{
        "type": "object",
        "properties": {},
        "required": []
    }'::jsonb,
    true,
    'basic',
    'diagnostics'
)

ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    parameters  = EXCLUDED.parameters,
    is_enabled  = EXCLUDED.is_enabled,
    min_tier    = EXCLUDED.min_tier,
    category    = EXCLUDED.category;

COMMIT;
