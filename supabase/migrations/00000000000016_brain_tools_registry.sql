-- MIGRATION 026 (ported): brain_tools registry + seed
BEGIN;

CREATE TABLE IF NOT EXISTS brain_tools (
  name              TEXT PRIMARY KEY,
  category          TEXT NOT NULL CHECK (category IN ('generation', 'retrieval', 'analysis', 'action')),
  description       TEXT NOT NULL,
  parameters        JSONB NOT NULL DEFAULT '{}',
  handler_function  TEXT NOT NULL,
  min_tier          TEXT NOT NULL DEFAULT 'basic' CHECK (min_tier IN ('basic', 'medium', 'enterprise')),
  requires_confirm  BOOLEAN NOT NULL DEFAULT false,
  is_enabled        BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS brain_tools_updated_at ON brain_tools;
CREATE TRIGGER brain_tools_updated_at
  BEFORE UPDATE ON brain_tools
  FOR EACH ROW EXECUTE FUNCTION brain_agents_set_updated_at();

ALTER TABLE brain_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_tools_read ON brain_tools;
CREATE POLICY brain_tools_read ON brain_tools FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS brain_tools_write ON brain_tools;
CREATE POLICY brain_tools_write ON brain_tools FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );

INSERT INTO brain_tools (name, category, description, parameters, handler_function, min_tier) VALUES
(
  'search_kb',
  'retrieval',
  'Search the agent knowledge base for relevant context. Use this before generating any content to ground your response in the client''s specific information.',
  '{"type":"object","properties":{"query":{"type":"string","description":"What to search for"},"top_k":{"type":"integer","description":"Number of results (1-10)","default":5},"section":{"type":"string","description":"Optional: restrict to a KB section name (brand_voice, icp, offer, angles, examples)"}},"required":["query"]}',
  'executeSearchKb',
  'basic'
),
(
  'generate_email',
  'generation',
  'Generate a belief-bound email for a specific position in a flow. Always call search_kb first to ground the email in the client''s KB.',
  '{"type":"object","properties":{"belief_id":{"type":"string","description":"UUID of the belief this email expresses"},"angle_class":{"type":"string","description":"One of: problem_reframe, hidden_constraint, false_solution, economic_inefficiency, market_shift, opportunity_gap, risk_exposure"},"flow_position":{"type":"integer","description":"Email number in sequence (1-12)"},"recipient_context":{"type":"object","description":"Optional: known facts about the recipient"}},"required":["belief_id","angle_class"]}',
  'executeGenerateEmail',
  'basic'
),
(
  'analyze_signals',
  'analysis',
  'Get performance data (replies, bookings, clicks) for a belief over a time window.',
  '{"type":"object","properties":{"belief_id":{"type":"string","description":"UUID of the belief to analyze"},"days":{"type":"integer","description":"Lookback window in days (1-90)","default":7}},"required":["belief_id"]}',
  'executeAnalyzeSignals',
  'basic'
),
(
  'check_belief_status',
  'analysis',
  'Get the current promotion state and confidence score for a belief (HYP, TEST, SW, IW, RW, or GW).',
  '{"type":"object","properties":{"belief_id":{"type":"string","description":"UUID of the belief"}},"required":["belief_id"]}',
  'executeCheckBeliefStatus',
  'basic'
),
(
  'record_gap',
  'action',
  'Record that the knowledge base is missing information needed to answer a question. Call this when search_kb returns no confident results.',
  '{"type":"object","properties":{"domain":{"type":"string","description":"Subject area of the gap (e.g. icp_seniority, offer_pricing, competitor_landscape)"},"description":{"type":"string","description":"What specific information is missing"},"impact":{"type":"string","description":"Severity","enum":["low","medium","high","critical"]}},"required":["domain","description"]}',
  'executeRecordGap',
  'basic'
),
(
  'get_brief_context',
  'retrieval',
  'Retrieve the full brief, belief competition details, and ICP definition for a given brief.',
  '{"type":"object","properties":{"brief_id":{"type":"string","description":"UUID of the brief"}},"required":["brief_id"]}',
  'executeGetBriefContext',
  'medium'
),
(
  'suggest_angle',
  'analysis',
  'Recommend which of the 7 canonical angles to use given the ICP and recent signal data.',
  '{"type":"object","properties":{"icp_id":{"type":"string","description":"UUID of the ICP"},"context":{"type":"string","description":"Optional: additional context about the situation"}},"required":["icp_id"]}',
  'executeSuggestAngle',
  'medium'
),
(
  'search_leads',
  'action',
  'Search for qualified leads matching the ICP definition.',
  '{"type":"object","properties":{"icp_id":{"type":"string","description":"UUID of the ICP to match against"},"limit":{"type":"integer","description":"Max results to return (1-50)","default":20}},"required":["icp_id"]}',
  'executeSearchLeads',
  'enterprise'
),
(
  'update_domain_prompt',
  'action',
  'Update the domain layer of the prompt stack with new business context. Use only when instructed.',
  '{"type":"object","properties":{"content":{"type":"string","description":"New domain context content"},"section":{"type":"string","description":"Section to update (e.g. offer, icp, goals)"}},"required":["content","section"]}',
  'executeUpdateDomainPrompt',
  'enterprise'
)
ON CONFLICT (name) DO NOTHING;

COMMIT;
