-- ============================================================================
-- MIGRATION 47: Brain Learning Events
-- ============================================================================
-- Explicit event log for the self-healing learning loop.
-- Each row records a discrete learning event that flows from:
--   MailWizz stats → signal_event → coach_analysis → brain_learning_events
--
-- This gives us:
--   1. Full audit trail of what the brain learned and when
--   2. Aggregatable data for dashboards (learning velocity, improvement rate)
--   3. Explicit link between campaign performance and brain knowledge updates
-- ============================================================================

-- brain_learning_events: discrete learning events
CREATE TABLE IF NOT EXISTS brain_learning_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_agent_id  UUID REFERENCES brain_agents(id) ON DELETE SET NULL,
    org_agent_id    UUID REFERENCES org_agents(id) ON DELETE SET NULL,

    -- What type of learning event
    event_type      TEXT NOT NULL CHECK (event_type IN (
        'insight',           -- Positive pattern discovered
        'warning',           -- Underperformance detected
        'adjustment',        -- Belief score adjusted
        'kb_update',         -- Knowledge base updated from feedback
        'reflection',        -- Coach generated a performance summary
        'user_feedback',     -- Direct user feedback integrated
        'campaign_result'    -- Campaign outcome recorded
    )),

    -- Human-readable title and description
    title           TEXT NOT NULL,
    description     TEXT,

    -- Source of the learning
    source          TEXT NOT NULL DEFAULT 'coach_analysis' CHECK (source IN (
        'coach_analysis',    -- Marketing Coach processor
        'user_feedback',     -- User manually corrected/rated output
        'webhook_signal',    -- Direct from webhook event
        'workflow_result',   -- From workflow execution result
        'agent_reflection',  -- Agent self-reflection
        'manual'             -- Superadmin manual entry
    )),

    -- Linked entities (for tracing back to what generated this learning)
    belief_id       UUID,
    campaign_id     TEXT,
    workflow_id     UUID,
    execution_id    UUID,

    -- Metrics snapshot at time of learning
    metrics         JSONB DEFAULT '{}',
    -- e.g. { open_rate: 45.2, click_rate: 12.1, booking_rate: 3.4, sends: 150 }

    -- Impact tracking
    importance      REAL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
    applied         BOOLEAN DEFAULT FALSE,  -- Was this learning applied to KB/prompts?
    applied_at      TIMESTAMPTZ,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ble_org_id ON brain_learning_events(org_id);
CREATE INDEX IF NOT EXISTS idx_ble_brain_agent ON brain_learning_events(brain_agent_id);
CREATE INDEX IF NOT EXISTS idx_ble_org_agent ON brain_learning_events(org_agent_id);
CREATE INDEX IF NOT EXISTS idx_ble_event_type ON brain_learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ble_created_at ON brain_learning_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ble_source ON brain_learning_events(source);
CREATE INDEX IF NOT EXISTS idx_ble_importance ON brain_learning_events(importance DESC);

-- RLS
ALTER TABLE brain_learning_events ENABLE ROW LEVEL SECURITY;

-- Service role gets full access (workers use service key)
CREATE POLICY brain_learning_events_service ON brain_learning_events
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER set_ble_updated_at
    BEFORE UPDATE ON brain_learning_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
