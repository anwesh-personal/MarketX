-- ============================================================
-- MIGRATION 058: RUNS ↔ ENGINE_RUN_LOGS BRIDGE
-- ============================================================
-- The `runs` table was missing execution_id, so Writer Studio
-- could never link a run to its engine output.
-- Also adds a display label and the settings snapshot.
-- ============================================================

BEGIN;

-- 1. Link runs → engine_run_logs (the output)
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS execution_id UUID REFERENCES engine_run_logs(id) ON DELETE SET NULL;

-- 2. Human-readable label for the run list ("Problem Reframe · 5 emails · Get a Reply")
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS label TEXT;

-- 3. The settings the user chose at run time (angle, goal, count)
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::JSONB;

-- 4. The engine instance that produced this run
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS engine_instance_id UUID REFERENCES engine_instances(id) ON DELETE SET NULL;

-- Index for execution lookups
CREATE INDEX IF NOT EXISTS idx_runs_execution_id ON runs(execution_id) WHERE execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_runs_engine_instance ON runs(engine_instance_id) WHERE engine_instance_id IS NOT NULL;

COMMIT;
