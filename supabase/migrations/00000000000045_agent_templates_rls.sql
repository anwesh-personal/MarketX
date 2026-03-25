-- ============================================================
-- MIGRATION 045: Enable RLS on agent_templates and related tables
-- These tables were created without RLS, making them invisible
-- to the Supabase PostgREST client (schema cache).
-- ============================================================

BEGIN;

-- 1. agent_templates
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_templates_service_all ON agent_templates;
CREATE POLICY agent_templates_service_all ON agent_templates
  FOR ALL USING (true) WITH CHECK (true);

-- 2. agent_template_skills
ALTER TABLE agent_template_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_template_skills_service_all ON agent_template_skills;
CREATE POLICY agent_template_skills_service_all ON agent_template_skills
  FOR ALL USING (true) WITH CHECK (true);

-- 3. agent_template_kb
ALTER TABLE agent_template_kb ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_template_kb_service_all ON agent_template_kb;
CREATE POLICY agent_template_kb_service_all ON agent_template_kb
  FOR ALL USING (true) WITH CHECK (true);

-- 4. brain_agent_assignments
ALTER TABLE brain_agent_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_agent_assignments_service_all ON brain_agent_assignments;
CREATE POLICY brain_agent_assignments_service_all ON brain_agent_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
