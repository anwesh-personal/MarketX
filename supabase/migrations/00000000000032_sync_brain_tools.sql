-- ============================================================
-- MIGRATION 032: Sync brain_tools with MarketXToolExecutor
-- Add get_icp_context and list_active_beliefs so DB matches code.
-- ============================================================

BEGIN;

INSERT INTO brain_tools (name, category, description, parameters, handler_function, min_tier) VALUES
  (
    'get_icp_context',
    'retrieval',
    'Get ICP context including criteria, associated offer, and top beliefs. Use when you need full context for an ICP (Ideal Customer Profile).',
    '{
      "type": "object",
      "properties": {
        "icp_id": {"type": "string", "description": "UUID of the ICP"}
      },
      "required": ["icp_id"]
    }',
    'executeGetIcpContext',
    'basic'
  ),
  (
    'list_active_beliefs',
    'retrieval',
    'List active beliefs for the organization, optionally filtered by ICP or status. Use to discover which beliefs are in test or won lanes.',
    '{
      "type": "object",
      "properties": {
        "limit":   {"type": "integer", "description": "Max results (1-50)", "default": 10},
        "icp_id":  {"type": "string",  "description": "Optional: filter by ICP UUID"},
        "status":  {"type": "string",  "description": "Optional: filter by status (e.g. TEST, SW, IW, RW, GW)"}
      }
    }',
    'executeListActiveBeliefs',
    'basic'
  )
ON CONFLICT (name) DO NOTHING;

COMMIT;
