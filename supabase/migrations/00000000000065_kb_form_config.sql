-- ============================================================
-- KB Form Config — DB-driven questionnaire configuration
--
-- Stores all dropdown options, field metadata, and step
-- definitions that were previously hardcoded in types.ts.
-- Editable from superadmin UI. Client wizard reads from API.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.kb_form_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key      TEXT NOT NULL UNIQUE,
    config_value    JSONB NOT NULL DEFAULT '[]',
    description     TEXT,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_form_config_key ON kb_form_config(config_key);

DROP TRIGGER IF EXISTS kb_form_config_updated_at ON kb_form_config;
CREATE TRIGGER kb_form_config_updated_at
    BEFORE UPDATE ON kb_form_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE kb_form_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read (clients need this to render the form)
DROP POLICY IF EXISTS kb_form_config_select ON kb_form_config;
CREATE POLICY kb_form_config_select ON kb_form_config
    FOR SELECT USING (true);

-- Only superadmins can write
DROP POLICY IF EXISTS kb_form_config_write ON kb_form_config;
CREATE POLICY kb_form_config_write ON kb_form_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

-- ============================================================
-- Seed: Dropdown options (migrated from hardcoded types.ts)
-- ============================================================

INSERT INTO kb_form_config (config_key, config_value, description) VALUES
('dropdown_industries', '["SaaS / Software","FinTech","HealthTech","EdTech","E-Commerce","Agency / Consulting","Real Estate","Manufacturing","Professional Services","Cybersecurity","AI / ML","MarTech","HRTech","LegalTech","Insurance","Logistics / Supply Chain","Construction","Hospitality","Nonprofit","Government","Retail","Energy","Other"]'::jsonb, 'Industries for ICP segment targeting'),

('dropdown_company_sizes', '["1-10","11-50","51-200","201-500","501-1000","1000-5000","5000+"]'::jsonb, 'Company size ranges for ICP segments'),

('dropdown_revenue_ranges', '["<$1M","$1M-$10M (SMB)","$10M-$100M (LMM)","$100M-$1B (MM)",">$1B (ENT)"]'::jsonb, 'Revenue ranges for ICP segments'),

('dropdown_geographies', '["US","Canada","UK","EU","APAC","LATAM","MEA","Global"]'::jsonb, 'Geographic regions for ICP targeting'),

('dropdown_pricing_models', '["Subscription","One-time","Usage-based","Performance-based","Retainer","Custom/Hybrid"]'::jsonb, 'Pricing model options for Step 1'),

('dropdown_communication_styles', '["Professional","Conversational","Technical","Bold/Direct","Consultative","Friendly","Formal"]'::jsonb, 'Communication style options for Step 7'),

('dropdown_cta_types', '["Book a call","Request a demo","Download a resource","Reply to email","Fill out a form","Other"]'::jsonb, 'Primary CTA type options for Step 8'),

('dropdown_meeting_lengths', '["15 min","30 min","45 min","60 min"]'::jsonb, 'Meeting length options for Step 8'),

('dropdown_sales_cycle', '["<1 week","1-4 weeks","1-3 months","3-6 months","6-12 months","12+ months"]'::jsonb, 'Sales cycle length options for Step 4'),

('dropdown_stakeholder_count', '["1","2-3","4-6","7+"]'::jsonb, 'Stakeholder count options for Step 4'),

('dropdown_artifact_categories', '[{"value":"sales_deck","label":"Sales Decks / Pitch Decks","accept":".pdf,.pptx,.docx,.doc"},{"value":"case_study","label":"Case Studies / Success Stories","accept":".pdf,.docx,.doc,.txt,.md"},{"value":"objection_handling","label":"Objection Handling / Battlecards","accept":".pdf,.docx,.doc,.txt,.md"},{"value":"competitive_positioning","label":"Competitive Positioning Docs","accept":".pdf,.docx,.doc,.txt,.md"},{"value":"call_recording","label":"Call Recordings / Transcripts","accept":".mp3,.wav,.m4a,.txt,.md"},{"value":"email_campaigns","label":"Historical Email Campaigns","accept":".pdf,.docx,.txt,.csv,.md"},{"value":"website_content","label":"Website Content Export","accept":".pdf,.html,.txt,.md"},{"value":"internal_docs","label":"Internal Process Docs / Playbooks","accept":".pdf,.docx,.doc,.txt,.md"},{"value":"crm_data","label":"CRM Export / Pipeline Data","accept":".csv,.xlsx,.xls"}]'::jsonb, 'Artifact upload categories for Step 9')

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- Seed: Step definitions
-- ============================================================

INSERT INTO kb_form_config (config_key, config_value, description) VALUES
('steps', '[{"num":1,"title":"Company & Offer","subtitle":"Who you are and what you sell","icon":"Building2"},{"num":2,"title":"ICP Segments","subtitle":"Who you target","icon":"Target"},{"num":3,"title":"Buying Roles","subtitle":"Who makes the decision","icon":"Users"},{"num":4,"title":"Sales Process","subtitle":"How you close deals","icon":"Briefcase"},{"num":5,"title":"Value & Proof","subtitle":"Why they buy and proof it works","icon":"TrendingUp"},{"num":6,"title":"Objections","subtitle":"What stops them from buying","icon":"Shield"},{"num":7,"title":"Voice & Tone","subtitle":"How we should sound","icon":"MessageSquare"},{"num":8,"title":"Conversion","subtitle":"Where conversations convert","icon":"Link2"},{"num":9,"title":"Materials","subtitle":"Supporting documents","icon":"Upload"}]'::jsonb, 'Wizard step definitions — title, subtitle, icon name')
ON CONFLICT (config_key) DO NOTHING;

COMMIT;
