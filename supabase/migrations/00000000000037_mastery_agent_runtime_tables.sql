-- ============================================================
-- MIGRATION 037: Mastery Agent runtime tables
-- ============================================================
-- brain_decisions  — every agent decision with full audit trail
-- brain_beliefs    — org-level belief confidence (learning loop uses this)
-- brain_knowledge_items — KB context for agent decision-making
--
-- These are referenced by:
--   mastery-agent-worker, MarketingCoachProcessor, get_brain_health tool

BEGIN;

-- ── brain_decisions ──────────────────────────────────────────
-- Written by mastery-agent-worker after each decision.
-- Read by superadmin for audit, and learning-loop for analysis.

CREATE TABLE IF NOT EXISTS public.brain_decisions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    user_id             UUID,
    conversation_id     UUID,
    execution_id        UUID,
    agent_type          TEXT NOT NULL,
    decision            TEXT NOT NULL,
    confidence          NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    reasoning           TEXT,
    input_snapshot      JSONB NOT NULL DEFAULT '{}'::jsonb,
    duration_ms         INT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_decisions_org
    ON public.brain_decisions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_decisions_agent
    ON public.brain_decisions(agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_decisions_execution
    ON public.brain_decisions(execution_id) WHERE execution_id IS NOT NULL;

-- ── brain_beliefs ────────────────────────────────────────────
-- Org-level belief tracking. MarketingCoachProcessor updates
-- confidence_score based on signal_event analysis.
-- get_brain_health tool reads aggregate stats from here.

CREATE TABLE IF NOT EXISTS public.brain_beliefs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    belief_key          TEXT NOT NULL,
    statement           TEXT,
    confidence_score    NUMERIC(5,4) NOT NULL DEFAULT 0.5,
    source              TEXT NOT NULL DEFAULT 'system',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, belief_key)
);

CREATE INDEX IF NOT EXISTS idx_brain_beliefs_org
    ON public.brain_beliefs(org_id, is_active, confidence_score DESC);

-- ── brain_knowledge_items ────────────────────────────────────
-- KB context used by mastery-agent-worker for weighted decisions.
-- Each item has an object_type that maps to an agent type.

CREATE TABLE IF NOT EXISTS public.brain_knowledge_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    object_type         TEXT NOT NULL,
    content             TEXT NOT NULL,
    confidence          NUMERIC(5,4) NOT NULL DEFAULT 0.5,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brain_knowledge_items_org_type
    ON public.brain_knowledge_items(org_id, object_type, confidence DESC);

-- ── RPC: update_belief_confidence ────────────────────────────
-- Called by mastery-agent-worker when a decision affects belief confidence.

CREATE OR REPLACE FUNCTION update_belief_confidence(
    p_belief_id UUID,
    p_org_id UUID,
    p_confidence_delta NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE brain_beliefs
    SET confidence_score = GREATEST(0, LEAST(1, confidence_score + p_confidence_delta)),
        updated_at = NOW()
    WHERE id = p_belief_id AND org_id = p_org_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
