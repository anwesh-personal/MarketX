-- 00000000000026_mastery_agent_configs.sql
-- Dynamic mastery agent configuration: fully UI-editable agent definitions

CREATE TABLE IF NOT EXISTS public.mastery_agent_configs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id          uuid REFERENCES public.partner(id),
    scope               text NOT NULL DEFAULT 'organization' CHECK (scope IN ('global', 'organization')),

    -- Identity
    agent_key           text NOT NULL,
    display_name        text NOT NULL,
    description         text,
    agent_category      text NOT NULL DEFAULT 'custom' CHECK (agent_category IN (
        'contact', 'timing', 'angle', 'pacing', 'reply',
        'buying_role', 'buyer_stage', 'uncertainty', 'sequence', 'custom'
    )),
    version             text NOT NULL DEFAULT '1.0',
    is_active           boolean NOT NULL DEFAULT true,
    is_system           boolean NOT NULL DEFAULT false,

    -- Decision configuration
    decision_type       text NOT NULL,
    decision_outputs    text[] NOT NULL DEFAULT '{}',
    input_schema        jsonb NOT NULL DEFAULT '{}'::jsonb,
    output_schema       jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Scoring rules (dynamic rule engine)
    scoring_rules       jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [{ "name": "rule_name", "condition": {...}, "action": "boost|penalize|set", "target": "output_key", "value": 10, "reasoning_template": "..." }]

    -- Keyword matching rules
    keyword_rules       jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [{ "keywords": ["word1", "word2"], "target_output": "Interested", "score": 90, "category": "strong_interest" }]

    -- Field mapping rules (for structured input scoring)
    field_rules         jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Format: [{ "input_field": "seniority", "mapping": { "C-Suite": { "output": "Decision Maker", "score": 30 }, ... } }]

    -- KB integration
    kb_object_types     text[] NOT NULL DEFAULT '{}',
    kb_min_confidence   numeric(5,4) NOT NULL DEFAULT 0.2,
    kb_max_objects      int NOT NULL DEFAULT 10,
    kb_write_enabled    boolean NOT NULL DEFAULT false,
    kb_write_type       text,

    -- Locked constraints (cannot be overridden by rules)
    locked_constraints  jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Execution settings
    max_execution_ms    int NOT NULL DEFAULT 5000,
    fallback_output     text,
    confidence_formula  text NOT NULL DEFAULT 'score_based',
    confidence_divisor  numeric(8,2) NOT NULL DEFAULT 100.00,

    -- Pipeline position
    pipeline_stage      text CHECK (pipeline_stage IS NULL OR pipeline_stage IN (
        'pre_send', 'post_reply', 'pre_extension', 'periodic', 'on_demand'
    )),
    pipeline_order      int NOT NULL DEFAULT 0,

    -- Metadata
    created_by          uuid REFERENCES auth.users(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mac_partner ON public.mastery_agent_configs(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX idx_mac_scope_active ON public.mastery_agent_configs(scope, is_active);
CREATE INDEX idx_mac_category ON public.mastery_agent_configs(agent_category);
CREATE INDEX idx_mac_pipeline ON public.mastery_agent_configs(pipeline_stage, pipeline_order);
CREATE UNIQUE INDEX idx_mac_unique_key ON public.mastery_agent_configs(agent_key, partner_id) WHERE partner_id IS NOT NULL;
CREATE UNIQUE INDEX idx_mac_unique_key_global ON public.mastery_agent_configs(agent_key) WHERE scope = 'global' AND partner_id IS NULL;

CREATE TRIGGER mastery_agent_configs_updated_at
    BEFORE UPDATE ON public.mastery_agent_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed the 9 system agents as global configs
INSERT INTO mastery_agent_configs (scope, agent_key, display_name, description, agent_category, is_system, decision_type, decision_outputs, kb_object_types, pipeline_stage, pipeline_order, scoring_rules, field_rules, keyword_rules)
VALUES
    ('global', 'contact_decision', 'Contact Decision Agent', 'Decides WHO to contact from the identity pool', 'contact', true, 'contact_eligibility', ARRAY['CONTACT_NOW','DELAY','SUPPRESS'], ARRAY['contact_pattern'], 'pre_send', 1,
     '[{"name":"identity_confidence_high","condition":{"field":"identityData.confidence","op":">=","value":0.8},"action":"boost","target":"CONTACT_NOW","value":30,"reasoning_template":"High identity confidence (+30)"},{"name":"identity_confidence_med","condition":{"field":"identityData.confidence","op":">=","value":0.5},"action":"boost","target":"CONTACT_NOW","value":15,"reasoning_template":"Medium identity confidence (+15)"},{"name":"verified_email","condition":{"field":"identityData.verification_status","op":"==","value":"verified"},"action":"boost","target":"CONTACT_NOW","value":20,"reasoning_template":"Email verified (+20)"},{"name":"previous_negative","condition":{"field":"identityData.previous_outcomes","op":"contains","value":"Negative"},"action":"penalize","target":"CONTACT_NOW","value":30,"reasoning_template":"Previous negative outcome (-30)"}]'::jsonb,
     '[]'::jsonb, '[]'::jsonb),

    ('global', 'timing_window', 'Timing Window Agent', 'Decides WHEN to reach out to a contact', 'timing', true, 'optimal_send_time', ARRAY['SEND_AT'], ARRAY['timing_pattern'], 'pre_send', 2, '[]'::jsonb,
     '[{"input_field":"seniority","mapping":{"C-Suite":{"output":"early_shift","score":10},"VP":{"output":"early_shift","score":8}}}]'::jsonb, '[]'::jsonb),

    ('global', 'angle_selection', 'Angle Selection Agent', 'Decides WHICH belief angle to use', 'angle', true, 'angle_selection', ARRAY['selected_angle'], ARRAY['angle_performance'], 'pre_send', 3, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),

    ('global', 'send_pacing', 'Send Pacing Agent', 'Decides HOW FAST to scale satellite delivery', 'pacing', true, 'send_pacing', ARRAY['hold','increase','decrease','pause'], ARRAY['pacing_rule','deliverability_insight'], 'pre_send', 4,
     '[{"name":"reputation_critical","condition":{"field":"reputationScore","op":"<","value":40},"action":"set","target":"pause","value":100,"reasoning_template":"CRITICAL: Reputation {value} < 40 → PAUSE"},{"name":"reputation_warning","condition":{"field":"reputationScore","op":"<","value":60},"action":"boost","target":"decrease","value":40,"reasoning_template":"WARNING: Reputation {value} < 60 → reduce capacity"},{"name":"high_bounce","condition":{"field":"bounceRate","op":">","value":0.05},"action":"boost","target":"decrease","value":30,"reasoning_template":"High bounce rate → reduce capacity"}]'::jsonb,
     '[]'::jsonb, '[]'::jsonb),

    ('global', 'reply_meaning', 'Reply Meaning Agent', 'Interprets incoming reply text and classifies intent', 'reply', true, 'reply_classification', ARRAY['Interested','Clarification','Objection','Timing','Referral','Negative','Noise'], ARRAY['reply_interpretation'], 'post_reply', 1,
     '[]'::jsonb, '[]'::jsonb,
     '[{"keywords":["yes","interested","tell me more","schedule","demo","meeting","calendar"],"target_output":"Interested","score":90,"category":"strong_interest"},{"keywords":["maybe","depends","send info","pricing"],"target_output":"Interested","score":60,"category":"mild_interest"},{"keywords":["what do you mean","how does","can you explain"],"target_output":"Clarification","score":50,"category":"clarification"},{"keywords":["too expensive","not in budget","already have","competitor"],"target_output":"Objection","score":40,"category":"objection"},{"keywords":["not now","next quarter","reach out later"],"target_output":"Timing","score":35,"category":"timing"},{"keywords":["talk to","contact","reach out to","better person"],"target_output":"Referral","score":55,"category":"referral"},{"keywords":["unsubscribe","stop","remove","not interested","spam"],"target_output":"Negative","score":10,"category":"negative"},{"keywords":["out of office","automatic reply","no longer with"],"target_output":"Noise","score":5,"category":"noise"}]'::jsonb),

    ('global', 'buying_role', 'Buying Role Agent', 'Classifies the persona/role in the buying process', 'buying_role', true, 'buying_role_classification', ARRAY['Decision Maker','Influencer','Champion','Gatekeeper','End User','Evaluator'], ARRAY['contact_pattern'], 'on_demand', 0,
     '[]'::jsonb,
     '[{"input_field":"seniority","mapping":{"C-Suite":{"output":"Decision Maker","score":30},"VP":{"output":"Decision Maker","score":25},"Director":{"output":"Influencer","score":20},"Manager":{"output":"Evaluator","score":15},"Individual":{"output":"End User","score":10}}}]'::jsonb,
     '[]'::jsonb),

    ('global', 'buyer_stage', 'Buyer Stage Agent', 'Determines where in the buying journey', 'buyer_stage', true, 'buyer_stage_classification', ARRAY['Unaware','Problem Aware','Solution Aware','Product Aware','Most Aware','Evaluating','Decided'], ARRAY['engagement_pattern'], 'on_demand', 0, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),

    ('global', 'uncertainty_resolution', 'Uncertainty Resolution Agent', 'Identifies what to address next in messaging', 'uncertainty', true, 'uncertainty_resolution', ARRAY['problem_fit','solution_credibility','pricing_value','implementation_risk','timing_urgency','authority_alignment','competitive_comparison','social_proof','technical_feasibility'], ARRAY['engagement_pattern'], 'pre_extension', 1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),

    ('global', 'sequence_progression', 'Sequence Progression Agent', 'Decides what message comes next', 'sequence', true, 'sequence_progression', ARRAY['next_step','skip_to_cta','repeat_with_variation','escalate_channel','pause_sequence','end_sequence','extend_block'], ARRAY['engagement_pattern'], 'pre_extension', 2, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT DO NOTHING;

COMMIT;
