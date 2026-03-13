-- ============================================================
-- Add execution_id to runs for Writer Studio <> workflow linkage
-- ============================================================
BEGIN;

-- Add column if not present (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'runs' AND column_name = 'execution_id'
  ) THEN
    ALTER TABLE runs ADD COLUMN execution_id UUID REFERENCES engine_run_logs(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_runs_execution_id ON runs(execution_id);
  END IF;
END $$;

COMMIT;
