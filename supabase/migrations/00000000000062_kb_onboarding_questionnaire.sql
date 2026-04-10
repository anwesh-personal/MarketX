-- ============================================================
-- KB Onboarding Questionnaire & Master Knowledge Base Generator
-- 
-- This migration creates the 4 core tables for the KB Generator pipeline:
--   1. kb_questionnaire_responses — structured partner intake (9 steps)
--   2. kb_icp_segments — repeatable ICP segments with per-segment buying roles
--   3. kb_artifact_uploads — mandatory supporting materials (sales decks, case studies, etc.)
--   4. kb_master_sections — 22-section generated KB with section-by-section review
--
-- Pipeline flow:
--   Phase 1:   Questionnaire intake (9 steps) → saved per-step
--   Phase 1.5: Constraint enforcement (hard gate)
--   Phase 2:   Sequential AI generation (8 passes, 22 sections)
--   Phase 2.5: Human review & lock (section-by-section approval)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. KB Questionnaire Responses
-- One row per organization. Stores all structured answers.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kb_questionnaire_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Step tracking
    current_step    INTEGER NOT NULL DEFAULT 1,
    total_steps     INTEGER NOT NULL DEFAULT 9,
    status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN (
                        'in_progress',              -- partner filling out steps
                        'submitted',                -- all steps completed
                        'needs_revision',           -- constraint enforcement failed
                        'ready_for_generation',     -- constraints passed
                        'generating',               -- AI pipeline running
                        'generation_partial_failure', -- some sections failed (failure report in constraint_results)
                        'generation_failed',        -- entire generation crashed (fatal error in constraint_results)
                        'review',                   -- ALL sections generated, ready for human review
                        'locked'                    -- KB approved and locked
                    )),

    -- ============================================================
    -- Step 1: Company & Offer Identity
    -- Maps to: KB Section 1 (Company/Offer), Section 4 (Offer Details)
    -- ============================================================
    company_name              TEXT,
    company_website           TEXT,
    one_sentence_description  TEXT,
    full_description          TEXT,
    business_category         TEXT,
    core_product_description  TEXT,
    problem_solved            TEXT,
    company_mission           TEXT,
    pricing_model             TEXT,
    typical_deal_size         TEXT,
    delivery_timeline         TEXT,
    offer_components          TEXT,

    -- ============================================================
    -- Step 4: Sales Process & Qualification
    -- Maps to: KB Section 9 (CTA Logic), Section 20 (Deal Conversion)
    -- ============================================================
    sales_process_steps       TEXT,
    qualification_criteria    TEXT,
    disqualification_criteria TEXT,
    sales_cycle_length        TEXT,
    stakeholder_count         TEXT,
    sales_team_capacity       TEXT,
    winning_deal_example      TEXT,

    -- ============================================================
    -- Step 5: Value Proposition & Proof
    -- Maps to: KB Section 5 (Positioning), Section 1 (Differentiation)
    -- ============================================================
    real_buy_reason           TEXT,
    measurable_outcomes       TEXT,
    top_differentiator        TEXT,
    top_rejection_reason      TEXT,
    direct_competitors        TEXT,
    indirect_competitors      TEXT,
    desired_perception        TEXT,
    forbidden_claims          TEXT,
    required_disclosures      TEXT,

    -- ============================================================
    -- Step 6: Objections & Friction
    -- Maps to: KB Section 7 (Objections & Friction)
    -- ============================================================
    top_objections            TEXT,
    objection_responses       TEXT,
    switching_worries         TEXT,
    economic_concerns         TEXT,
    trust_concerns            TEXT,
    category_misconceptions   TEXT,
    competitor_claims_to_counter TEXT,

    -- ============================================================
    -- Step 7: Voice, Tone & Communication Style
    -- Maps to: KB Section 5 (Narrative), Section 8 (Compliance), Section 10 (AI Reply)
    -- ============================================================
    communication_style       JSONB DEFAULT '[]',   -- array of selected styles
    tone_examples             TEXT,
    words_to_avoid            TEXT,
    words_to_use              TEXT,
    hostile_response_policy   TEXT,

    -- ============================================================
    -- Step 8: Conversion Infrastructure
    -- Maps to: KB Section 9 (CTA Logic), Section 11 (Funnels)
    -- ============================================================
    primary_cta_type          TEXT,
    booking_url               TEXT,
    meeting_owner             TEXT,
    meeting_length            TEXT,
    landing_page_url          TEXT,
    secondary_ctas            TEXT,
    pre_meeting_info          TEXT,

    -- ============================================================
    -- Step 2 Global Fields (after all segments)
    -- Maps to: KB Section 2 (Buyer/Fit/Adoption Conditions)
    -- ============================================================
    adoption_conditions       TEXT,
    common_blockers           TEXT,
    strongest_environments    TEXT,
    poorest_fit_environments  TEXT,
    client_prerequisites      TEXT,

    -- ============================================================
    -- Constraint Enforcement Results (Phase 1.5)
    -- ============================================================
    constraint_results        JSONB DEFAULT '{}',
    -- Example shape:
    -- {
    --   "CE-1": { "passed": true },
    --   "CE-2": { "passed": false, "reason": "Economic buyer title missing for segment 'Enterprise'" },
    --   ...
    -- }

    -- ============================================================
    -- Timestamps
    -- ============================================================
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at  TIMESTAMPTZ,
    locked_at     TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_questionnaire_org ON kb_questionnaire_responses(org_id);
CREATE INDEX IF NOT EXISTS idx_kb_questionnaire_status ON kb_questionnaire_responses(status);
CREATE INDEX IF NOT EXISTS idx_kb_questionnaire_created_by ON kb_questionnaire_responses(created_by);

-- Updated-at trigger
DROP TRIGGER IF EXISTS kb_questionnaire_responses_updated_at ON kb_questionnaire_responses;
CREATE TRIGGER kb_questionnaire_responses_updated_at
    BEFORE UPDATE ON kb_questionnaire_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE kb_questionnaire_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_questionnaire_select ON kb_questionnaire_responses;
CREATE POLICY kb_questionnaire_select ON kb_questionnaire_responses
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

DROP POLICY IF EXISTS kb_questionnaire_write ON kb_questionnaire_responses;
CREATE POLICY kb_questionnaire_write ON kb_questionnaire_responses
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

-- ============================================================
-- 2. KB ICP Segments
-- One row per ICP segment per questionnaire.
-- Supports multi-segment ICP with per-segment buying roles.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kb_icp_segments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id    UUID NOT NULL REFERENCES kb_questionnaire_responses(id) ON DELETE CASCADE,
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Segment definition
    segment_name        TEXT NOT NULL,
    target_industries   JSONB NOT NULL DEFAULT '[]',   -- ["SaaS", "Healthcare", ...]
    company_size        JSONB NOT NULL DEFAULT '[]',   -- ["51-200", "201-500", ...]
    revenue_range       JSONB NOT NULL DEFAULT '[]',   -- ["$10M-$100M", ...]
    geographies         JSONB NOT NULL DEFAULT '[]',   -- ["US", "EU", ...]
    pain_points         TEXT NOT NULL DEFAULT '',
    buying_triggers     TEXT NOT NULL DEFAULT '',
    decision_criteria   TEXT NOT NULL DEFAULT '',
    exclusions          TEXT,

    -- Buying roles for THIS specific segment
    -- (Different segments may have completely different buying committees)
    economic_buyer_title     TEXT,
    economic_buyer_concerns  TEXT,
    champion_title           TEXT,
    champion_motivations     TEXT,
    operational_owner_title  TEXT,
    operational_owner_concerns TEXT,
    technical_evaluator_title  TEXT,
    technical_evaluator_focus  TEXT,
    resistor_description     TEXT,

    -- Ordering
    sort_order          INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_icp_segments_questionnaire ON kb_icp_segments(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_kb_icp_segments_org ON kb_icp_segments(org_id);

-- Updated-at trigger
DROP TRIGGER IF EXISTS kb_icp_segments_updated_at ON kb_icp_segments;
CREATE TRIGGER kb_icp_segments_updated_at
    BEFORE UPDATE ON kb_icp_segments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE kb_icp_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_icp_segments_select ON kb_icp_segments;
CREATE POLICY kb_icp_segments_select ON kb_icp_segments
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

DROP POLICY IF EXISTS kb_icp_segments_write ON kb_icp_segments;
CREATE POLICY kb_icp_segments_write ON kb_icp_segments
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

-- ============================================================
-- 3. KB Artifact Uploads
-- Tracks uploaded supporting materials (sales decks, case studies, etc.)
-- At least 1 artifact is MANDATORY before KB generation can proceed.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kb_artifact_uploads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id    UUID NOT NULL REFERENCES kb_questionnaire_responses(id) ON DELETE CASCADE,
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- File metadata
    category            TEXT NOT NULL CHECK (category IN (
                            'sales_deck',
                            'case_study',
                            'objection_handling',
                            'competitive_positioning',
                            'call_recording',
                            'email_campaigns',
                            'website_content',
                            'internal_docs',
                            'crm_data'
                        )),
    file_name           TEXT NOT NULL,
    file_size           INTEGER NOT NULL DEFAULT 0,
    file_type           TEXT NOT NULL,
    storage_path        TEXT NOT NULL,

    -- Extraction status (uses existing chunked extraction pipeline)
    extraction_status   TEXT NOT NULL DEFAULT 'pending'
                        CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    extraction_job_id   UUID REFERENCES kb_extraction_jobs(id) ON DELETE SET NULL,
    extracted_text      TEXT,           -- raw extracted text
    extraction_result   JSONB,          -- structured extraction output

    -- Timestamps
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_artifact_questionnaire ON kb_artifact_uploads(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_kb_artifact_org ON kb_artifact_uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_kb_artifact_category ON kb_artifact_uploads(category);
CREATE INDEX IF NOT EXISTS idx_kb_artifact_extraction ON kb_artifact_uploads(extraction_status)
    WHERE extraction_status IN ('pending', 'processing');

-- RLS
ALTER TABLE kb_artifact_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_artifact_select ON kb_artifact_uploads;
CREATE POLICY kb_artifact_select ON kb_artifact_uploads
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

DROP POLICY IF EXISTS kb_artifact_write ON kb_artifact_uploads;
CREATE POLICY kb_artifact_write ON kb_artifact_uploads
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

-- ============================================================
-- 4. KB Master Sections
-- Stores each of the 22 generated KB sections independently.
-- Supports section-by-section review, editing, and approval.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kb_master_sections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    questionnaire_id    UUID NOT NULL REFERENCES kb_questionnaire_responses(id) ON DELETE CASCADE,

    -- Section identity
    section_number      INTEGER NOT NULL,           -- 0-22 (Section 0 = Governing Principles)
    section_title       TEXT NOT NULL,
    content             TEXT NOT NULL DEFAULT '',    -- full markdown content

    -- Status workflow
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                            'pending',      -- not yet generated
                            'generating',   -- AI pipeline in progress
                            'draft',        -- generated, awaiting review
                            'failed',       -- generation failed (error in reviewer_notes)
                            'approved',     -- reviewer approved
                            'rejected',     -- reviewer rejected, needs regen
                            'locked'        -- final, KB is locked
                        )),

    -- Generation metadata
    generation_pass     INTEGER,                    -- which pass generated this (1-8)
    generation_type     TEXT CHECK (generation_type IN (
                            'ai_generated',         -- fully generated from questionnaire + artifacts
                            'template_calibrated',  -- universal template with partner-specific calibration
                            'template_universal'    -- universal template, no calibration needed
                        )),
    provider_used       TEXT,
    model_used          TEXT,
    generation_duration_ms INTEGER,                 -- how long generation took

    -- Review tracking
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    reviewer_notes      TEXT,                       -- feedback note if rejected
    edit_history        JSONB DEFAULT '[]',         -- [{ edited_by, edited_at, diff_summary }]

    -- Version tracking (supports regeneration)
    version             INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each org can have one version of each section per questionnaire
    UNIQUE(org_id, questionnaire_id, section_number, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_master_sections_org ON kb_master_sections(org_id);
CREATE INDEX IF NOT EXISTS idx_kb_master_sections_questionnaire ON kb_master_sections(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_kb_master_sections_status ON kb_master_sections(status);
CREATE INDEX IF NOT EXISTS idx_kb_master_sections_section ON kb_master_sections(org_id, section_number, version DESC);

-- Updated-at trigger
DROP TRIGGER IF EXISTS kb_master_sections_updated_at ON kb_master_sections;
CREATE TRIGGER kb_master_sections_updated_at
    BEFORE UPDATE ON kb_master_sections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE kb_master_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_master_sections_select ON kb_master_sections;
CREATE POLICY kb_master_sections_select ON kb_master_sections
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

DROP POLICY IF EXISTS kb_master_sections_write ON kb_master_sections;
CREATE POLICY kb_master_sections_write ON kb_master_sections
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
    );

-- ============================================================
-- Helper: Section title lookup (used by generation orchestrator)
-- ============================================================

CREATE OR REPLACE FUNCTION kb_section_title(section_num INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE section_num
        WHEN 0  THEN 'Governing Principles'
        WHEN 1  THEN 'Company / Offer Identity'
        WHEN 2  THEN 'Buyer, Fit & Adoption Conditions'
        WHEN 3  THEN 'InMarket Behavior Intelligence'
        WHEN 4  THEN 'Offer Details'
        WHEN 5  THEN 'Positioning & Narrative'
        WHEN 6  THEN 'Angles'
        WHEN 7  THEN 'Objections & Friction'
        WHEN 8  THEN 'Compliance & Guardrails'
        WHEN 9  THEN 'CTA Logic'
        WHEN 10 THEN 'AI Reply System'
        WHEN 11 THEN 'Funnels, Links & Destinations'
        WHEN 12 THEN 'Campaign Execution Notes'
        WHEN 13 THEN 'Success Metrics'
        WHEN 14 THEN 'Future-Proofing'
        WHEN 15 THEN 'Execution Gates'
        WHEN 16 THEN 'Derivation Rule'
        WHEN 17 THEN 'Knowledge Evolution Rule'
        WHEN 18 THEN 'Economic Model & Performance Advantage'
        WHEN 19 THEN 'Data-to-Action Decision System'
        WHEN 20 THEN 'Deal Conversion System'
        WHEN 21 THEN 'Infrastructure Ownership & Cost Advantage'
        WHEN 22 THEN 'Learning Writeback & Promotion Rules'
        ELSE 'Unknown Section'
    END;
$$;

COMMIT;
