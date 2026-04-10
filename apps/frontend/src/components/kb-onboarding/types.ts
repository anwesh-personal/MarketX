/**
 * Shared types for the KB Onboarding Wizard
 */

// ─── ICP Segment ────────────────────────────────────────────────
export interface ICPSegment {
    id?: string
    segment_name: string
    target_industries: string[]
    company_size: string[]
    revenue_range: string[]
    geographies: string[]
    pain_points: string
    buying_triggers: string
    decision_criteria: string
    exclusions: string
    // Buying roles for THIS segment
    economic_buyer_title: string
    economic_buyer_concerns: string
    champion_title: string
    champion_motivations: string
    operational_owner_title: string
    operational_owner_concerns: string
    technical_evaluator_title: string
    technical_evaluator_focus: string
    resistor_description: string
}

// ─── Questionnaire Response (matches DB columns) ────────────────
export interface QuestionnaireData {
    id?: string
    current_step: number
    status: string
    // Step 1
    company_name: string
    company_website: string
    one_sentence_description: string
    full_description: string
    business_category: string
    core_product_description: string
    problem_solved: string
    company_mission: string
    pricing_model: string
    typical_deal_size: string
    delivery_timeline: string
    offer_components: string
    // Step 2 globals
    adoption_conditions: string
    common_blockers: string
    strongest_environments: string
    poorest_fit_environments: string
    client_prerequisites: string
    // Step 4
    sales_process_steps: string
    qualification_criteria: string
    disqualification_criteria: string
    sales_cycle_length: string
    stakeholder_count: string
    sales_team_capacity: string
    winning_deal_example: string
    // Step 5
    real_buy_reason: string
    measurable_outcomes: string
    top_differentiator: string
    top_rejection_reason: string
    direct_competitors: string
    indirect_competitors: string
    desired_perception: string
    forbidden_claims: string
    required_disclosures: string
    // Step 6
    top_objections: string
    objection_responses: string
    switching_worries: string
    economic_concerns: string
    trust_concerns: string
    category_misconceptions: string
    competitor_claims_to_counter: string
    // Step 7
    communication_style: string[]
    tone_examples: string
    words_to_avoid: string
    words_to_use: string
    hostile_response_policy: string
    // Step 8
    primary_cta_type: string
    booking_url: string
    meeting_owner: string
    meeting_length: string
    landing_page_url: string
    secondary_ctas: string
    pre_meeting_info: string
    // Constraint results
    constraint_results: Record<string, { passed: boolean; reason?: string; fields?: string[] }>
}

// ─── Artifact ───────────────────────────────────────────────────
export interface ArtifactUpload {
    id: string
    category: string
    file_name: string
    file_size: number
    file_type: string
    extraction_status: string
    created_at: string
}

// ─── Step Definition ────────────────────────────────────────────
export interface StepDef {
    num: number
    title: string
    subtitle: string
    icon: any
}

// ─── Constants ──────────────────────────────────────────────────
export const INDUSTRIES = [
    'SaaS / Software', 'FinTech', 'HealthTech', 'EdTech', 'E-Commerce',
    'Agency / Consulting', 'Real Estate', 'Manufacturing', 'Professional Services',
    'Cybersecurity', 'AI / ML', 'MarTech', 'HRTech', 'LegalTech',
    'Insurance', 'Logistics / Supply Chain', 'Construction', 'Hospitality',
    'Nonprofit', 'Government', 'Retail', 'Energy', 'Other',
]

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000-5000', '5000+']

export const REVENUE_RANGES = [
    '<$1M', '$1M-$10M (SMB)', '$10M-$100M (LMM)', '$100M-$1B (MM)', '>$1B (ENT)',
]

export const GEOGRAPHIES = ['US', 'Canada', 'UK', 'EU', 'APAC', 'LATAM', 'MEA', 'Global']

export const PRICING_MODELS = [
    'Subscription', 'One-time', 'Usage-based', 'Performance-based', 'Retainer', 'Custom/Hybrid',
]

export const COMMUNICATION_STYLES = [
    'Professional', 'Conversational', 'Technical', 'Bold/Direct', 'Consultative', 'Friendly', 'Formal',
]

export const CTA_TYPES = [
    'Book a call', 'Request a demo', 'Download a resource', 'Reply to email', 'Fill out a form', 'Other',
]

export const MEETING_LENGTHS = ['15 min', '30 min', '45 min', '60 min']

export const SALES_CYCLE_OPTIONS = [
    '<1 week', '1-4 weeks', '1-3 months', '3-6 months', '6-12 months', '12+ months',
]

export const STAKEHOLDER_OPTIONS = ['1', '2-3', '4-6', '7+']

export const ARTIFACT_CATEGORIES = [
    { value: 'sales_deck', label: 'Sales Decks / Pitch Decks', accept: '.pdf,.pptx,.docx,.doc' },
    { value: 'case_study', label: 'Case Studies / Success Stories', accept: '.pdf,.docx,.doc,.txt,.md' },
    { value: 'objection_handling', label: 'Objection Handling / Battlecards', accept: '.pdf,.docx,.doc,.txt,.md' },
    { value: 'competitive_positioning', label: 'Competitive Positioning Docs', accept: '.pdf,.docx,.doc,.txt,.md' },
    { value: 'call_recording', label: 'Call Recordings / Transcripts', accept: '.mp3,.wav,.m4a,.txt,.md' },
    { value: 'email_campaigns', label: 'Historical Email Campaigns', accept: '.pdf,.docx,.txt,.csv,.md' },
    { value: 'website_content', label: 'Website Content Export', accept: '.pdf,.html,.txt,.md' },
    { value: 'internal_docs', label: 'Internal Process Docs / Playbooks', accept: '.pdf,.docx,.doc,.txt,.md' },
    { value: 'crm_data', label: 'CRM Export / Pipeline Data', accept: '.csv,.xlsx,.xls' },
]

// ─── Empty defaults ─────────────────────────────────────────────
export function emptyQuestionnaire(): QuestionnaireData {
    return {
        current_step: 1, status: 'in_progress',
        company_name: '', company_website: '', one_sentence_description: '',
        full_description: '', business_category: '', core_product_description: '',
        problem_solved: '', company_mission: '', pricing_model: '',
        typical_deal_size: '', delivery_timeline: '', offer_components: '',
        adoption_conditions: '', common_blockers: '', strongest_environments: '',
        poorest_fit_environments: '', client_prerequisites: '',
        sales_process_steps: '', qualification_criteria: '', disqualification_criteria: '',
        sales_cycle_length: '', stakeholder_count: '', sales_team_capacity: '',
        winning_deal_example: '',
        real_buy_reason: '', measurable_outcomes: '', top_differentiator: '',
        top_rejection_reason: '', direct_competitors: '', indirect_competitors: '',
        desired_perception: '', forbidden_claims: '', required_disclosures: '',
        top_objections: '', objection_responses: '', switching_worries: '',
        economic_concerns: '', trust_concerns: '', category_misconceptions: '',
        competitor_claims_to_counter: '',
        communication_style: [], tone_examples: '', words_to_avoid: '',
        words_to_use: '', hostile_response_policy: '',
        primary_cta_type: '', booking_url: '', meeting_owner: '',
        meeting_length: '', landing_page_url: '', secondary_ctas: '',
        pre_meeting_info: '',
        constraint_results: {},
    }
}

export function emptySegment(): ICPSegment {
    return {
        segment_name: '', target_industries: [], company_size: [],
        revenue_range: [], geographies: [], pain_points: '',
        buying_triggers: '', decision_criteria: '', exclusions: '',
        economic_buyer_title: '', economic_buyer_concerns: '',
        champion_title: '', champion_motivations: '',
        operational_owner_title: '', operational_owner_concerns: '',
        technical_evaluator_title: '', technical_evaluator_focus: '',
        resistor_description: '',
    }
}
