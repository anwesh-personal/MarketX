-- ============================================================================
-- Migration 039: Add execution_data column to engine_run_logs
-- ============================================================================
-- The checkpoint/resume system writes execution state (nodeOutputs, tokenUsage,
-- failedNodeId) to this column. Without it, checkpoint saves silently fail.
-- ============================================================================

ALTER TABLE engine_run_logs
    ADD COLUMN IF NOT EXISTS execution_data JSONB DEFAULT NULL;

COMMENT ON COLUMN engine_run_logs.execution_data IS
    'Checkpoint state for resume-from-failure: { checkpoint, failedNodeId, nodeOutputs, tokenUsage, userInput }';

CREATE INDEX IF NOT EXISTS idx_erl_execution_data_checkpoint
    ON engine_run_logs ((execution_data->>'checkpoint'))
    WHERE execution_data IS NOT NULL;
