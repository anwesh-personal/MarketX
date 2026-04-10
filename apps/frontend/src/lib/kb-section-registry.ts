/**
 * KB Section Registry — Single Source of Truth
 *
 * Every piece of code that needs section metadata (titles, passes, types)
 * imports from HERE. Not from hardcoded maps, not from inline objects.
 *
 * Used by:
 *   - apps/frontend/src/app/api/kb/onboarding/generate/route.ts
 *   - apps/workers/src/processors/kb/kb-section-prompts.ts (references same data)
 *   - DB function kb_section_title() mirrors this (SQL can't import TS)
 */

export interface SectionMeta {
    number: number
    title: string
    pass: number
    type: 'ai_generated' | 'template_calibrated' | 'template_universal'
}

/**
 * All 23 sections (0-22) of the Master Knowledge Base.
 * Order in this array matches generation pass order.
 */
export const KB_SECTIONS: SectionMeta[] = [
    // Pass 1: Foundation
    { number: 1,  title: 'Company / Offer Identity',                    pass: 1, type: 'ai_generated' },
    { number: 4,  title: 'Offer Details',                               pass: 1, type: 'ai_generated' },

    // Pass 2: Buyer Intelligence
    { number: 2,  title: 'Buyer, Fit & Adoption Conditions',           pass: 2, type: 'ai_generated' },
    { number: 3,  title: 'InMarket Behavior Intelligence',             pass: 2, type: 'ai_generated' },

    // Pass 3: Positioning
    { number: 5,  title: 'Positioning & Narrative',                     pass: 3, type: 'ai_generated' },
    { number: 0,  title: 'Governing Principles',                       pass: 3, type: 'ai_generated' },

    // Pass 4: Messaging Strategy
    { number: 6,  title: 'Angles',                                     pass: 4, type: 'ai_generated' },
    { number: 7,  title: 'Objections & Friction',                      pass: 4, type: 'ai_generated' },

    // Pass 5: Execution Framework
    { number: 8,  title: 'Compliance & Guardrails',                    pass: 5, type: 'template_calibrated' },
    { number: 9,  title: 'CTA Logic',                                  pass: 5, type: 'ai_generated' },
    { number: 10, title: 'AI Reply System',                             pass: 5, type: 'template_calibrated' },
    { number: 11, title: 'Funnels, Links & Destinations',              pass: 5, type: 'ai_generated' },

    // Pass 6: Operations
    { number: 12, title: 'Campaign Execution Notes',                    pass: 6, type: 'template_universal' },
    { number: 13, title: 'Success Metrics',                             pass: 6, type: 'template_calibrated' },
    { number: 15, title: 'Execution Gates',                             pass: 6, type: 'template_universal' },

    // Pass 7: Economics
    { number: 18, title: 'Economic Model & Performance Advantage',      pass: 7, type: 'ai_generated' },
    { number: 19, title: 'Data-to-Action Decision System',              pass: 7, type: 'template_calibrated' },
    { number: 20, title: 'Deal Conversion System',                      pass: 7, type: 'ai_generated' },

    // Pass 8: System Architecture
    { number: 14, title: 'Future-Proofing',                             pass: 8, type: 'template_universal' },
    { number: 16, title: 'Derivation Rule',                             pass: 8, type: 'template_universal' },
    { number: 17, title: 'Knowledge Evolution Rule',                    pass: 8, type: 'template_universal' },
    { number: 21, title: 'Infrastructure Ownership & Cost Advantage',   pass: 8, type: 'template_calibrated' },
    { number: 22, title: 'Learning Writeback & Promotion Rules',        pass: 8, type: 'template_universal' },
]

// ─── Lookup helpers ─────────────────────────────────────────────

const _byNumber = new Map<number, SectionMeta>()
for (const s of KB_SECTIONS) _byNumber.set(s.number, s)

export function getSectionMeta(sectionNumber: number): SectionMeta | undefined {
    return _byNumber.get(sectionNumber)
}

export function getSectionTitle(sectionNumber: number): string {
    return _byNumber.get(sectionNumber)?.title ?? `Section ${sectionNumber}`
}

export function getSectionPass(sectionNumber: number): number {
    return _byNumber.get(sectionNumber)?.pass ?? 8
}

export function getSectionType(sectionNumber: number): string {
    return _byNumber.get(sectionNumber)?.type ?? 'ai_generated'
}

/** All section numbers, sorted 0-22 */
export const ALL_SECTION_NUMBERS = KB_SECTIONS.map(s => s.number).sort((a, b) => a - b)

/** Total section count */
export const TOTAL_SECTIONS = KB_SECTIONS.length

// ─── Step-to-column mapping (used by both wizard and API) ───────

export const STEP_COLUMNS: Record<number, string[]> = {
    1: [
        'company_name', 'company_website', 'one_sentence_description',
        'full_description', 'business_category', 'core_product_description',
        'problem_solved', 'company_mission', 'pricing_model',
        'typical_deal_size', 'delivery_timeline', 'offer_components',
    ],
    2: [
        'adoption_conditions', 'common_blockers',
        'strongest_environments', 'poorest_fit_environments',
        'client_prerequisites',
    ],
    3: [], // Buying roles stored in kb_icp_segments
    4: [
        'sales_process_steps', 'qualification_criteria',
        'disqualification_criteria', 'sales_cycle_length',
        'stakeholder_count', 'sales_team_capacity',
        'winning_deal_example',
    ],
    5: [
        'real_buy_reason', 'measurable_outcomes', 'top_differentiator',
        'top_rejection_reason', 'direct_competitors', 'indirect_competitors',
        'desired_perception', 'forbidden_claims', 'required_disclosures',
    ],
    6: [
        'top_objections', 'objection_responses', 'switching_worries',
        'economic_concerns', 'trust_concerns', 'category_misconceptions',
        'competitor_claims_to_counter',
    ],
    7: [
        'communication_style', 'tone_examples',
        'words_to_avoid', 'words_to_use',
        'hostile_response_policy',
    ],
    8: [
        'primary_cta_type', 'booking_url', 'meeting_owner',
        'meeting_length', 'landing_page_url', 'secondary_ctas',
        'pre_meeting_info',
    ],
    9: [], // Artifacts stored separately
}

export function getStepColumns(step: number): string[] {
    return STEP_COLUMNS[step] || []
}
