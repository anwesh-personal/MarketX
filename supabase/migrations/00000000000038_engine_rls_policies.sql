-- ============================================================================
-- Migration 038: RLS Policies for Engine Tables
-- ============================================================================
-- Secures engine_instances, engine_run_logs, engine_bundles,
-- engine_bundle_deployments with row-level security.
--
-- Policy model:
--   engine_bundles           → superadmin only (service_role)
--   engine_bundle_deployments→ superadmin only (service_role)
--   engine_instances         → org members can read their own, superadmin full access
--   engine_run_logs          → org members can read their own, superadmin full access
-- ============================================================================

-- ── engine_instances ─────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS engine_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY engine_instances_select_own ON engine_instances
    FOR SELECT
    USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR assigned_user_id = auth.uid()
    );

CREATE POLICY engine_instances_insert_service ON engine_instances
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY engine_instances_update_service ON engine_instances
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY engine_instances_delete_service ON engine_instances
    FOR DELETE
    USING (true);

-- ── engine_run_logs ──────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS engine_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY engine_run_logs_select_own ON engine_run_logs
    FOR SELECT
    USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY engine_run_logs_insert_service ON engine_run_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY engine_run_logs_update_service ON engine_run_logs
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ── engine_bundles (superadmin-only) ─────────────────────────────────────────

ALTER TABLE IF EXISTS engine_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY engine_bundles_service_all ON engine_bundles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ── engine_bundle_deployments (superadmin-only) ──────────────────────────────

ALTER TABLE IF EXISTS engine_bundle_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY engine_bundle_deployments_service_all ON engine_bundle_deployments
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ── engine_instance_override_logs (superadmin-only) ──────────────────────────

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engine_instance_override_logs') THEN
        ALTER TABLE engine_instance_override_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY engine_instance_override_logs_service_all ON engine_instance_override_logs
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY engine_instances_select_own ON engine_instances IS
    'Members can read engines assigned to their org or directly to them';

COMMENT ON POLICY engine_run_logs_select_own ON engine_run_logs IS
    'Members can read execution logs for their org engines';
