-- ============================================================
-- MIGRATION 029: Drop belief_id FK from brain_memories (optional)
-- Run this if 028 was already applied with REFERENCES belief(id).
-- Makes belief_id a plain UUID so DB works without RS:OS belief table.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'brain_memories'
      AND constraint_name = 'brain_memories_belief_id_fkey'
  ) THEN
    ALTER TABLE brain_memories
      DROP CONSTRAINT brain_memories_belief_id_fkey;
  END IF;
END $$;
