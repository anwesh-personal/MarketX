-- ============================================================
-- Brain Hydrator Agent Template
--
-- Deploys locked KB content into the brain system:
--   kb_icp_segments → icp
--   questionnaire  → offer
--   questionnaire  → belief (AI-generated)
--   kb_master_sections → kb_sections + kb_documents
--   triggers embedding pipeline
--   sets brain_agents.domain_prompt
--
-- All field mappings stored in metadata JSONB — editable from UI.
-- AI prompts for belief generation + domain_prompt stored in prompt layers.
-- ============================================================

BEGIN;

-- Add metadata column if it doesn't exist
ALTER TABLE public.agent_templates
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN public.agent_templates.metadata IS
    'Flexible JSONB for agent-specific configuration (hydration mappings, etc.)';

INSERT INTO public.agent_templates (
    slug, name, description,
    avatar_emoji, avatar_color, category, product_target,
    system_prompt, persona_prompt, instruction_prompt, guardrails_prompt,
    preferred_provider, preferred_model,
    temperature, max_tokens,
    tools_enabled, skills,
    has_own_kb, kb_object_types, kb_min_confidence,
    input_schema, output_schema,
    max_turns, requires_approval,
    can_access_brain, can_write_to_brain,
    is_active, is_system, tier, version,
    metadata
) VALUES (
    'brain-hydrator',
    'Brain Hydrator',
    'Deploys locked Knowledge Base content into the brain system. Populates ICP, Offer, Belief tables and deploys KB sections as brain documents for RAG retrieval. All field mappings are configurable via metadata.',
    '🧠',
    'accent',
    'general',
    'all',

    -- SYSTEM PROMPT
    E'You are the Brain Hydrator for Axiom. Your role is to transform raw questionnaire data into structured, production-ready brain objects.\n\nYou perform two AI-assisted tasks during deployment:\n\n1. BELIEF GENERATION: From the client''s questionnaire responses (value propositions, differentiators, pain points, objections), generate structured belief statements that the outbound engine uses for angle selection. Each belief should be a testable hypothesis about what resonates with the target audience.\n\n2. DOMAIN PROMPT GENERATION: From the full KB context, generate a concise domain prompt that gives any brain agent instant context about this client''s business, product, market, and position. This becomes the Layer 3 (BUSINESS CONTEXT) in the PromptAssembler.\n\nYou always output structured JSON.',

    -- PERSONA PROMPT
    E'You are precise and systematic. Every belief you generate must be grounded in the questionnaire data — no fabrication. Every domain prompt must be dense with specific, actionable intelligence, not generic filler.\n\nYou think like a senior strategist who needs to brief an AI writer in 500 words or less about everything it needs to know to write compelling emails for this client.',

    -- INSTRUCTION PROMPT
    E'## Task 1: Generate Beliefs\n\nFrom the questionnaire data, generate 5-15 belief statements per ICP segment.\n\nEach belief must follow this structure:\n```json\n{\n  "statement": "Specific, testable belief about what resonates",\n  "angle": "pain | gain | logic | fear | authority | social_proof | urgency | curiosity",\n  "lane": "primary | secondary | experimental",\n  "confidence_score": 0.7,\n  "allocation_weight": 0.1,\n  "source_fields": ["questionnaire field(s) this was derived from"]\n}\n```\n\nAngle distribution: Aim for 2-3 beliefs per angle type. Primary lane = proven angles from questionnaire data. Secondary = reasonable inferences. Experimental = creative hypotheses worth testing.\n\n## Task 2: Generate Domain Prompt\n\nCreate a 300-500 word business context summary structured as:\n- WHO: Company name, what they do, who they serve\n- WHAT: Core product/offer, key differentiators, pricing model\n- WHY: Why buyers choose them, measurable outcomes\n- HOW: Sales process, typical deal, conversion path\n- VOICE: Communication style, words to use/avoid\n- COMPETE: Key competitors, positioning\n\n## Output Format\n\n```json\n{\n  "beliefs": [...],\n  "domain_prompt": "...",\n  "deployment_notes": "Any observations about data quality or gaps"\n}\n```',

    -- GUARDRAILS PROMPT
    E'1. NEVER fabricate beliefs not grounded in questionnaire data. If data is thin, generate fewer beliefs with lower confidence scores.\n2. NEVER include competitor names in belief statements — those go in domain_prompt only.\n3. Every belief MUST have a source_fields array linking back to questionnaire data.\n4. Domain prompt must be factual and specific — no marketing fluff.\n5. Output valid JSON only. No markdown wrapping.',

    NULL, NULL,  -- provider/model: use platform default
    0.4, 8192,  -- temperature, max_tokens
    '{}'::text[], '[]'::jsonb,  -- tools (text[]), skills (jsonb)
    false, '{}'::text[], 0.6,   -- has_own_kb, kb_object_types, kb_min_confidence

    -- INPUT SCHEMA — documents what the API sends to the agent
    '{
        "questionnaire": "Full kb_questionnaire_responses row",
        "segments": "Array of kb_icp_segments",
        "sections": "Array of locked kb_master_sections (titles + content)",
        "existing_offer": "Current offer row if any (for update vs insert)"
    }'::jsonb,

    -- OUTPUT SCHEMA — documents what the agent returns
    '{
        "beliefs": "Array of belief objects per ICP",
        "domain_prompt": "300-500 word business context for PromptAssembler Layer 3",
        "deployment_notes": "AI observations about data quality"
    }'::jsonb,

    1, false,      -- max_turns, requires_approval
    true, true,    -- can_access_brain, can_write_to_brain
    true, true,    -- is_active, is_system
    'enterprise', '1.0',

    -- METADATA — contains the structural field mappings (editable from UI)
    '{
        "hydration_config": {
            "offer_mapping": {
                "name": "company_name",
                "category": "business_category",
                "primary_promise": "one_sentence_description"
            },
            "icp_mapping": {
                "source_table": "kb_icp_segments",
                "name": "segment_name",
                "criteria_fields": [
                    "target_industries", "company_size", "revenue_range",
                    "geographies", "pain_points", "buying_triggers",
                    "decision_criteria", "exclusions"
                ]
            },
            "kb_deployment": {
                "section_namespace_template": "{icp_slug}/{section_slug}",
                "shared_section_namespace": "shared",
                "shared_sections": [0, 1, 4, 5, 8, 12, 13, 14, 15, 16, 17, 18, 19, 21],
                "icp_specific_sections": [2, 3, 6, 7, 9, 10, 11, 20, 22]
            },
            "embedding_config": {
                "trigger_on_deploy": true,
                "chunk_size": 1000,
                "chunk_overlap": 200
            }
        }
    }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    system_prompt = EXCLUDED.system_prompt,
    persona_prompt = EXCLUDED.persona_prompt,
    instruction_prompt = EXCLUDED.instruction_prompt,
    guardrails_prompt = EXCLUDED.guardrails_prompt,
    description = EXCLUDED.description,
    input_schema = EXCLUDED.input_schema,
    output_schema = EXCLUDED.output_schema,
    metadata = EXCLUDED.metadata,
    updated_at = now();

COMMIT;
