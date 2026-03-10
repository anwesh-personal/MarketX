-- 00000000000025_mastery_agents_schema.sql
-- Knowledge Object + Decision Log for Mastery Agent system

-- Knowledge Object: canonical 30-field model with 3 scopes
CREATE TABLE IF NOT EXISTS public.knowledge_object (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id          uuid REFERENCES public.partner(id),
    scope               text NOT NULL DEFAULT 'local' CHECK (scope IN ('local', 'candidate_global', 'global')),

    -- Identity
    object_type         text NOT NULL CHECK (object_type IN (
        'contact_pattern', 'timing_pattern', 'angle_performance',
        'pacing_rule', 'reply_interpretation', 'engagement_pattern',
        'deliverability_insight', 'icp_signal', 'offer_signal', 'general'
    )),
    title               text NOT NULL,
    description         text,

    -- Evidence basis
    evidence_count      int NOT NULL DEFAULT 0,
    evidence_sources    jsonb NOT NULL DEFAULT '[]'::jsonb,
    confidence          numeric(5,4) NOT NULL DEFAULT 0.0,
    sample_size         int NOT NULL DEFAULT 0,

    -- Temporal
    first_observed_at   timestamptz NOT NULL DEFAULT now(),
    last_observed_at    timestamptz NOT NULL DEFAULT now(),
    stability_score     numeric(5,4) NOT NULL DEFAULT 0.0,
    observation_window_days int NOT NULL DEFAULT 0,

    -- Scope & applicability
    applicable_industries   text[] NOT NULL DEFAULT '{}',
    applicable_geographies  text[] NOT NULL DEFAULT '{}',
    applicable_seniorities  text[] NOT NULL DEFAULT '{}',
    applicable_offer_types  text[] NOT NULL DEFAULT '{}',

    -- Content
    pattern_data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    recommendation      text,
    constraints         jsonb NOT NULL DEFAULT '{}'::jsonb,
    locked_fields       text[] NOT NULL DEFAULT '{}',

    -- Governance
    promoted_from_id    uuid REFERENCES public.knowledge_object(id),
    promotion_status    text NOT NULL DEFAULT 'active' CHECK (promotion_status IN (
        'active', 'candidate', 'under_review', 'promoted', 'demoted', 'suspended', 'retired'
    )),
    review_notes        text,
    reviewed_by         uuid REFERENCES auth.users(id),
    reviewed_at         timestamptz,

    -- Cross-partner evidence (for candidate_global / global)
    cross_partner_count int NOT NULL DEFAULT 0,
    harmful_side_effects boolean NOT NULL DEFAULT false,

    -- Lifecycle
    revalidation_cycle  text NOT NULL DEFAULT 'medium' CHECK (revalidation_cycle IN ('fast', 'medium', 'slow')),
    next_revalidation_at timestamptz,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ko_partner_scope ON public.knowledge_object(partner_id, scope);
CREATE INDEX idx_ko_type ON public.knowledge_object(object_type, scope);
CREATE INDEX idx_ko_confidence ON public.knowledge_object(confidence DESC);
CREATE INDEX idx_ko_global ON public.knowledge_object(scope) WHERE scope = 'global';

CREATE TRIGGER knowledge_object_updated_at
    BEFORE UPDATE ON public.knowledge_object
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Decision Log: every agent decision recorded with full audit trail
CREATE TABLE IF NOT EXISTS public.agent_decision_log (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id          uuid NOT NULL REFERENCES public.partner(id),

    -- Agent identity
    agent_type          text NOT NULL CHECK (agent_type IN (
        'contact_decision', 'timing_window', 'angle_selection',
        'send_pacing', 'reply_meaning',
        'buying_role', 'buyer_stage', 'uncertainty_resolution', 'sequence_progression'
    )),
    agent_version       text NOT NULL DEFAULT '1.0',

    -- Decision context
    decision_type       text NOT NULL,
    entity_id           uuid,
    entity_type         text,

    -- Inputs
    inputs              jsonb NOT NULL DEFAULT '{}'::jsonb,
    knowledge_objects_used uuid[] NOT NULL DEFAULT '{}',

    -- Output
    decision            text NOT NULL,
    decision_detail     jsonb NOT NULL DEFAULT '{}'::jsonb,
    confidence          numeric(5,4) NOT NULL DEFAULT 0.0,
    reasoning           text,

    -- Constraints applied
    locked_constraints  jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Outcome (filled later)
    outcome             text,
    outcome_metadata    jsonb,
    outcome_recorded_at timestamptz,

    -- Timing
    execution_time_ms   int,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_adl_partner_agent ON public.agent_decision_log(partner_id, agent_type, created_at DESC);
CREATE INDEX idx_adl_entity ON public.agent_decision_log(entity_id, entity_type);
CREATE INDEX idx_adl_agent_type ON public.agent_decision_log(agent_type, created_at DESC);

COMMIT;
