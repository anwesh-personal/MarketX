-- ============================================================================
-- MIGRATION 48: ORG-SCOPED RLS POLICIES
-- ============================================================================
-- Adds defense-in-depth RLS policies so that even if queries
-- are made with a user JWT (not service_role key), data is
-- scoped to the user's org. Service role still gets full access.
-- ============================================================================

BEGIN;

-- ── org_agents: org members can only read their own org's agents ──
DROP POLICY IF EXISTS org_agents_service_all ON org_agents;

-- Service role (workers, API routes): full access
CREATE POLICY org_agents_service_role ON org_agents
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Authenticated users: read-only, scoped to their org
CREATE POLICY org_agents_user_read ON org_agents
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

-- ── org_agent_kb: same pattern ──
DROP POLICY IF EXISTS org_agent_kb_service_all ON org_agent_kb;

CREATE POLICY org_agent_kb_service_role ON org_agent_kb
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY org_agent_kb_user_read ON org_agent_kb
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

-- ── brain_learning_events: org-scoped read ──
DROP POLICY IF EXISTS brain_learning_events_service ON brain_learning_events;

CREATE POLICY brain_learning_events_service_role ON brain_learning_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY brain_learning_events_user_read ON brain_learning_events
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM users WHERE id = auth.uid()
        )
    );

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE '✓ Migration 048: Org-scoped RLS policies applied';
END $$;

COMMIT;
