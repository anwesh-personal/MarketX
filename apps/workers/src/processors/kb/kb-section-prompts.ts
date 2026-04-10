/**
 * KB Section Prompt Templates
 *
 * Each section of the 22-section Master Knowledge Base has a specific
 * system prompt and input context mapping.
 *
 * Section types:
 *   A = ai_generated — built from questionnaire + artifacts + prior sections
 *   B = template_calibrated — universal template with partner-specific variables
 *   C = template_universal — universal template, no calibration
 */

// ─── Types ──────────────────────────────────────────────────────

export interface SectionPromptConfig {
    sectionNumber: number
    sectionTitle: string
    generationPass: number
    type: 'ai_generated' | 'template_calibrated' | 'template_universal'
    /** Which prior section numbers this section depends on */
    dependsOn: number[]
    /** System prompt for AI generation */
    systemPrompt: string
    /** How to build the user message from questionnaire data */
    buildUserMessage: (ctx: PromptContext) => string
}

export interface PromptContext {
    /** Questionnaire data (all fields) */
    q: Record<string, any>
    /** ICP segments */
    segments: Record<string, any>[]
    /** Artifact extracted texts (concatenated, truncated) */
    artifactText: string
    /** Previously generated section contents (keyed by section number) */
    priorSections: Record<number, string>
    /** Company name for substitution */
    companyName: string
}

// ─── Helper ─────────────────────────────────────────────────────

function priorContext(ctx: PromptContext, sectionNums: number[]): string {
    const parts: string[] = []
    for (const num of sectionNums) {
        if (ctx.priorSections[num]) {
            parts.push(`--- SECTION ${num} (previously generated) ---\n${ctx.priorSections[num].slice(0, 3000)}`)
        }
    }
    return parts.length > 0 ? `\n\nPREVIOUSLY GENERATED SECTIONS FOR CONTEXT:\n${parts.join('\n\n')}` : ''
}

function segmentSummary(segments: Record<string, any>[]): string {
    return segments.map((s, i) => {
        const industries = Array.isArray(s.target_industries) ? s.target_industries.join(', ') : ''
        const sizes = Array.isArray(s.company_size) ? s.company_size.join(', ') : ''
        return `Segment ${i + 1}: "${s.segment_name}" | Industries: ${industries} | Sizes: ${sizes} | Pain: ${(s.pain_points || '').slice(0, 200)} | Econ Buyer: ${s.economic_buyer_title || 'N/A'} | Champion: ${s.champion_title || 'N/A'} | Ops Owner: ${s.operational_owner_title || 'N/A'}`
    }).join('\n')
}

// ─── Section Configs ────────────────────────────────────────────

export const SECTION_CONFIGS: SectionPromptConfig[] = [
    // ═══ PASS 1: Foundation ═══════════════════════════════════

    {
        sectionNumber: 1,
        sectionTitle: 'Company / Offer Identity',
        generationPass: 1,
        type: 'ai_generated',
        dependsOn: [],
        systemPrompt: `You are writing Section 1 (Company / Offer Identity) of a Master Knowledge Base for a B2B outbound system.

This section defines WHO the company is, WHAT they sell, HOW they deliver it, and WHY it matters. It must be specific enough that an AI agent can write accurate outbound emails using only this section.

Output format: detailed markdown with clear subsections. Include:
- Company Name, Website, Business Category
- Problem Statement (specific, quantified)
- Mission (beyond revenue)
- Product/Service Description (exhaustive)
- Offer Components (line-by-line)
- Pricing Model & Typical ACV
- Delivery Timeline
- Key Differentiators (the things that make them unchosen if missing)

Write in third person. Be exhaustive, not generic.`,
        buildUserMessage: (ctx) => `Build the Company / Offer Identity section for ${ctx.companyName}.

QUESTIONNAIRE DATA:
- One-sentence: ${ctx.q.one_sentence_description || 'N/A'}
- Full description: ${ctx.q.full_description || 'N/A'}
- Business category: ${ctx.q.business_category || 'N/A'}
- Core product: ${ctx.q.core_product_description || 'N/A'}
- Problem solved: ${ctx.q.problem_solved || 'N/A'}
- Mission: ${ctx.q.company_mission || 'N/A'}
- Pricing: ${ctx.q.pricing_model || 'N/A'}
- Deal size: ${ctx.q.typical_deal_size || 'N/A'}
- Delivery timeline: ${ctx.q.delivery_timeline || 'N/A'}
- Offer components: ${ctx.q.offer_components || 'N/A'}
- Top differentiator: ${ctx.q.top_differentiator || 'N/A'}
- Website: ${ctx.q.company_website || 'N/A'}

ARTIFACT INTELLIGENCE:
${ctx.artifactText.slice(0, 4000) || 'No artifacts provided.'}`,
    },

    {
        sectionNumber: 4,
        sectionTitle: 'Offer Details',
        generationPass: 1,
        type: 'ai_generated',
        dependsOn: [1],
        systemPrompt: `You are writing Section 4 (Offer Details) of a Master Knowledge Base.

This section provides the COMPLETE specification of every offer, package, and deliverable. An AI agent reading this section must know exactly what to promise, what NOT to promise, and the precise value stack.

Output format: detailed markdown. Include per offer:
- Offer Name
- Category & Positioning
- Value Proposition (specific, quantified)
- Feature/Deliverable Breakdown (line by line)
- Pricing Structure
- Delivery Timeline & Milestones
- Proof Points (case study references, metrics)
- Differentiation vs. Alternatives`,
        buildUserMessage: (ctx) => `Build the Offer Details section for ${ctx.companyName}.

QUESTIONNAIRE DATA:
- Core product: ${ctx.q.core_product_description || 'N/A'}
- Offer components: ${ctx.q.offer_components || 'N/A'}
- Pricing: ${ctx.q.pricing_model || 'N/A'}
- Deal size: ${ctx.q.typical_deal_size || 'N/A'}
- Delivery: ${ctx.q.delivery_timeline || 'N/A'}
- Measurable outcomes: ${ctx.q.measurable_outcomes || 'N/A'}
- Differentiator: ${ctx.q.top_differentiator || 'N/A'}

${priorContext(ctx, [1])}

ARTIFACT INTELLIGENCE:
${ctx.artifactText.slice(0, 4000) || 'No artifacts.'}`,
    },

    // ═══ PASS 2: Buyer Intelligence ══════════════════════════

    {
        sectionNumber: 2,
        sectionTitle: 'Buyer, Fit & Adoption Conditions',
        generationPass: 2,
        type: 'ai_generated',
        dependsOn: [1, 4],
        systemPrompt: `You are writing Section 2 (Buyer, Fit & Adoption Conditions) of a Master Knowledge Base.

This is the TARGETING BIBLE. It must define exactly who to reach, who to avoid, what conditions must be true for a deal to happen, and the complete buying committee architecture PER SEGMENT.

Output format: detailed markdown. Include for EACH ICP segment:
- Segment Name & Definition
- Industry/Size/Revenue/Geography targeting
- Pain Points (specific, not generic)
- Buying Triggers (events that create urgency)
- Decision Criteria
- Exclusion Criteria
- Buying Committee (Economic Buyer, Champion, Operational Owner, Technical Evaluator, Resistor)
- Adoption Conditions (what must be true)
- Common Blockers`,
        buildUserMessage: (ctx) => `Build the Buyer, Fit & Adoption Conditions section for ${ctx.companyName}.

ICP SEGMENTS:
${segmentSummary(ctx.segments)}

GLOBAL ADOPTION DATA:
- Adoption conditions: ${ctx.q.adoption_conditions || 'N/A'}
- Common blockers: ${ctx.q.common_blockers || 'N/A'}
- Strongest environments: ${ctx.q.strongest_environments || 'N/A'}
- Poor fit environments: ${ctx.q.poorest_fit_environments || 'N/A'}
- Client prerequisites: ${ctx.q.client_prerequisites || 'N/A'}

${priorContext(ctx, [1, 4])}`,
    },

    {
        sectionNumber: 3,
        sectionTitle: 'InMarket Behavior Intelligence',
        generationPass: 2,
        type: 'ai_generated',
        dependsOn: [1, 2],
        systemPrompt: `You are writing Section 3 (InMarket Behavior Intelligence) of a Master Knowledge Base.

This section defines HOW to detect buyer readiness signals, engagement scoring, and signal-to-action mapping. It bridges ICP definitions with outbound execution.

Output: detailed markdown covering:
- Signal taxonomy (intent signals, engagement signals, trigger events)
- Signal scoring framework (how to weight each signal type)
- Signal-to-action mapping (what to DO when a signal fires)
- Timing intelligence (best days/times, pacing rules)
- Multi-signal stacking (how combined signals increase priority)`,
        buildUserMessage: (ctx) => `Build the InMarket Behavior Intelligence section for ${ctx.companyName}.

BUYING TRIGGERS FROM ICP SEGMENTS:
${ctx.segments.map(s => `${s.segment_name}: ${s.buying_triggers || 'N/A'}`).join('\n')}

DECISION CRITERIA:
${ctx.segments.map(s => `${s.segment_name}: ${s.decision_criteria || 'N/A'}`).join('\n')}

SALES CYCLE: ${ctx.q.sales_cycle_length || 'N/A'}

${priorContext(ctx, [1, 2])}`,
    },

    // ═══ PASS 3: Positioning ═════════════════════════════════

    {
        sectionNumber: 5,
        sectionTitle: 'Positioning & Narrative',
        generationPass: 3,
        type: 'ai_generated',
        dependsOn: [1, 2, 4],
        systemPrompt: `You are writing Section 5 (Positioning & Narrative) of a Master Knowledge Base.

This section defines the STORY the company tells — how it positions itself against the market. This drives all messaging angles, email copy, and content.

Output: detailed markdown covering:
- Market Position Statement
- Category Definition (how the company defines its category)
- Competitive Positioning Matrix (vs. direct + indirect competitors)
- Narrative Framework (transformation story: before → after)
- Desired Market Perception
- Proof Architecture (how proof points map to claims)
- Voice & Tone Anchor (connects to Section 7 but defines the WHY)`,
        buildUserMessage: (ctx) => `Build the Positioning & Narrative section for ${ctx.companyName}.

QUESTIONNAIRE DATA:
- Real buy reason: ${ctx.q.real_buy_reason || 'N/A'}
- Top differentiator: ${ctx.q.top_differentiator || 'N/A'}
- Direct competitors: ${ctx.q.direct_competitors || 'N/A'}
- Indirect competitors: ${ctx.q.indirect_competitors || 'N/A'}
- Desired perception: ${ctx.q.desired_perception || 'N/A'}
- Measurable outcomes: ${ctx.q.measurable_outcomes || 'N/A'}

${priorContext(ctx, [1, 2, 4])}

ARTIFACT INTELLIGENCE:
${ctx.artifactText.slice(0, 3000) || 'No artifacts.'}`,
    },

    {
        sectionNumber: 0,
        sectionTitle: 'Governing Principles',
        generationPass: 3,
        type: 'ai_generated',
        dependsOn: [1, 2, 5],
        systemPrompt: `You are writing Section 0 (Governing Principles) of a Master Knowledge Base.

This is the CONSTITUTION of the Knowledge Base. Every other section is subordinate to these rules. They define the absolute constraints that NO AI agent can violate.

Output: detailed markdown defining:
- Primary Directive (what the system exists to do)
- Non-negotiable rules (5-7 hard rules that AI must always follow)
- Hierarchy of trust (which data sources override which)
- Safety constraints
- Performance mandate (ROI-first principle)
- Compliance boundary (what the system must never do)
- Economic alignment (how the system serves owner economics)`,
        buildUserMessage: (ctx) => `Build the Governing Principles section for ${ctx.companyName}.

This should be specific to this company, not generic. Use their positioning, compliance requirements, and values.

COMPLIANCE DATA:
- Forbidden claims: ${ctx.q.forbidden_claims || 'N/A'}
- Required disclosures: ${ctx.q.required_disclosures || 'N/A'}
- Hostile response policy: ${ctx.q.hostile_response_policy || 'N/A'}

COMPANY MISSION: ${ctx.q.company_mission || 'N/A'}

${priorContext(ctx, [1, 2, 5])}`,
    },

    // ═══ PASS 4: Messaging Strategy ═════════════════════════

    {
        sectionNumber: 6,
        sectionTitle: 'Angles',
        generationPass: 4,
        type: 'ai_generated',
        dependsOn: [1, 2, 4, 5],
        systemPrompt: `You are writing Section 6 (Angles) of a Master Knowledge Base.

Angles are the SPECIFIC messaging strategies the AI uses to write outbound emails. Each angle approaches the prospect from a different motivational vector.

Output: detailed markdown with 6-10 angles, each containing:
- Angle Name
- Axis (risk, speed, control, loss, upside, identity, efficiency, authority)
- Narrative (2-3 sentences explaining the angle's core argument)
- Best for (which ICP segments, buying roles, and buyer stages)
- Example hook (a single opening line that demonstrates the angle)
- Forbidden pairings (angles that contradict this one)`,
        buildUserMessage: (ctx) => `Build the Angles section for ${ctx.companyName}.

ICP PAIN POINTS:
${ctx.segments.map(s => `${s.segment_name}: ${s.pain_points || 'N/A'}`).join('\n')}

VALUE/PROOF:
- Real buy reason: ${ctx.q.real_buy_reason || 'N/A'}
- Measurable outcomes: ${ctx.q.measurable_outcomes || 'N/A'}
- Top differentiator: ${ctx.q.top_differentiator || 'N/A'}

OBJECTIONS:
${ctx.q.top_objections || 'N/A'}

${priorContext(ctx, [1, 2, 4, 5])}`,
    },

    {
        sectionNumber: 7,
        sectionTitle: 'Objections & Friction',
        generationPass: 4,
        type: 'ai_generated',
        dependsOn: [1, 2, 5, 6],
        systemPrompt: `You are writing Section 7 (Objections & Friction) of a Master Knowledge Base.

This is the DEFENSE PLAYBOOK. It catalogs every reason a deal stalls or dies and provides the exact response strategy. AI agents use this to handle replies.

Output: detailed markdown with:
- Objection Matrix (objection → category → response strategy → proof point to cite)
- Categories: Price, Timing, Trust, Switching, Competition, Internal Politics, Technical
- For each objection: the actual words the prospect uses, the underlying concern, and the response framework
- Friction Points (non-objection blockers like slow legal, no champion)
- De-escalation Rules (how to handle hostile/negative replies)`,
        buildUserMessage: (ctx) => `Build the Objections & Friction section for ${ctx.companyName}.

QUESTIONNAIRE DATA:
- Top objections: ${ctx.q.top_objections || 'N/A'}
- Objection responses: ${ctx.q.objection_responses || 'N/A'}
- Switching worries: ${ctx.q.switching_worries || 'N/A'}
- Economic concerns: ${ctx.q.economic_concerns || 'N/A'}
- Trust concerns: ${ctx.q.trust_concerns || 'N/A'}
- Category misconceptions: ${ctx.q.category_misconceptions || 'N/A'}
- Competitor claims to counter: ${ctx.q.competitor_claims_to_counter || 'N/A'}
- Top rejection reason: ${ctx.q.top_rejection_reason || 'N/A'}
- Hostile response policy: ${ctx.q.hostile_response_policy || 'N/A'}

${priorContext(ctx, [1, 2, 5, 6])}`,
    },

    // ═══ PASS 5: Execution Framework ════════════════════════

    {
        sectionNumber: 8,
        sectionTitle: 'Compliance & Guardrails',
        generationPass: 5,
        type: 'template_calibrated',
        dependsOn: [0, 1],
        systemPrompt: `You are writing Section 8 (Compliance & Guardrails) of a Master Knowledge Base.

This is the SAFETY LAYER. It defines what the AI system can and cannot say, claim, or imply. This section is legally significant.

Output: detailed markdown covering:
- Forbidden Claims (list, with explanation of WHY each is forbidden)
- Required Disclosures (when and how they must appear)
- Regulatory Compliance (CAN-SPAM, GDPR, industry-specific)
- Tone Guardrails (what emotional territory is off-limits)
- Competitor Mention Policy
- Data Handling Rules
- Escalation Triggers (when to stop AI and route to human)`,
        buildUserMessage: (ctx) => `Build the Compliance & Guardrails section for ${ctx.companyName}.

PARTNER-SPECIFIC CALIBRATION:
- Forbidden claims: ${ctx.q.forbidden_claims || 'None specified'}
- Required disclosures: ${ctx.q.required_disclosures || 'None specified'}
- Words to avoid: ${ctx.q.words_to_avoid || 'None specified'}
- Hostile response policy: ${ctx.q.hostile_response_policy || 'Standard de-escalation'}

${priorContext(ctx, [0, 1])}`,
    },

    {
        sectionNumber: 9,
        sectionTitle: 'CTA Logic',
        generationPass: 5,
        type: 'ai_generated',
        dependsOn: [1, 2, 6],
        systemPrompt: `You are writing Section 9 (CTA Logic) of a Master Knowledge Base.

This section defines the DECISION TREE for which CTA to use in which context. AI agents follow these rules to select the right call-to-action.

Output: detailed markdown covering:
- Primary CTA (type, URL, owner, length)
- Secondary CTAs (for different stages/situations)
- CTA Selection Rules (by buyer stage, by engagement level, by response type)
- CTA Rotation Logic (preventing repetition)
- Meeting Preparation (what the prospect should know/bring)
- Fallback CTAs (when primary isn't appropriate)`,
        buildUserMessage: (ctx) => `Build the CTA Logic section for ${ctx.companyName}.

QUESTIONNAIRE DATA:
- Primary CTA: ${ctx.q.primary_cta_type || 'N/A'}
- Booking URL: ${ctx.q.booking_url || 'N/A'}
- Meeting owner: ${ctx.q.meeting_owner || 'N/A'}
- Meeting length: ${ctx.q.meeting_length || 'N/A'}
- Landing page: ${ctx.q.landing_page_url || 'N/A'}
- Secondary CTAs: ${ctx.q.secondary_ctas || 'N/A'}
- Pre-meeting info: ${ctx.q.pre_meeting_info || 'N/A'}
- Sales cycle: ${ctx.q.sales_cycle_length || 'N/A'}

${priorContext(ctx, [1, 2, 6])}`,
    },

    {
        sectionNumber: 10,
        sectionTitle: 'AI Reply System',
        generationPass: 5,
        type: 'template_calibrated',
        dependsOn: [0, 7, 8],
        systemPrompt: `You are writing Section 10 (AI Reply System) of a Master Knowledge Base.

This section governs how the AI handles INBOUND replies from prospects. It defines response strategies, tone matching, de-escalation, and routing rules.

Output: detailed markdown covering:
- Reply Classification (positive, neutral, objection, negative, hostile, OOO, wrong person)
- Response Strategy per Classification
- Tone Matching Rules (mirror the prospect's formality level)
- De-escalation Protocol
- Routing Rules (when to stop AI and hand to human)
- Reply Timing (when to respond, delay rules)
- Thread Context Rules (how to reference previous messages)`,
        buildUserMessage: (ctx) => `Build the AI Reply System section for ${ctx.companyName}.

PARTNER CALIBRATION:
- Communication style: ${JSON.stringify(ctx.q.communication_style || [])}
- Tone examples: ${ctx.q.tone_examples || 'N/A'}
- Words to use: ${ctx.q.words_to_use || 'N/A'}
- Words to avoid: ${ctx.q.words_to_avoid || 'N/A'}
- Hostile response policy: ${ctx.q.hostile_response_policy || 'N/A'}

${priorContext(ctx, [0, 7, 8])}`,
    },

    {
        sectionNumber: 11,
        sectionTitle: 'Funnels, Links & Destinations',
        generationPass: 5,
        type: 'ai_generated',
        dependsOn: [1, 9],
        systemPrompt: `You are writing Section 11 (Funnels, Links & Destinations) of a Master Knowledge Base.

This section maps every URL, landing page, and conversion destination the system can reference.

Output: detailed markdown covering:
- Primary Funnel (CTA → Landing → Booking)
- Alternative Funnels (content → nurture, webinar, etc.)
- URL Registry (every link the AI can use)
- Link Selection Rules (which link for which context)
- UTM Parameter Standards`,
        buildUserMessage: (ctx) => `Build the Funnels section for ${ctx.companyName}.

- Booking URL: ${ctx.q.booking_url || 'N/A'}
- Landing page: ${ctx.q.landing_page_url || 'N/A'}
- Secondary CTAs: ${ctx.q.secondary_ctas || 'N/A'}
- Website: ${ctx.q.company_website || 'N/A'}

${priorContext(ctx, [1, 9])}`,
    },

    // ═══ PASS 6: Operations ═════════════════════════════════

    {
        sectionNumber: 12,
        sectionTitle: 'Campaign Execution Notes',
        generationPass: 6,
        type: 'template_universal',
        dependsOn: [],
        systemPrompt: `You are writing Section 12 (Campaign Execution Notes) of a Master Knowledge Base.

This is a universal template section that defines campaign execution standards. Calibrate with the company name but use standard best practices.

Output: markdown covering sequence structures, email spacing, A/B testing methodology, warm-up protocols, and deliverability standards.`,
        buildUserMessage: (ctx) => `Generate Campaign Execution Notes for ${ctx.companyName}. Use industry-standard cold email campaign best practices.

Sales team capacity: ${ctx.q.sales_team_capacity || 'Standard'}
Sales cycle: ${ctx.q.sales_cycle_length || 'N/A'}`,
    },

    {
        sectionNumber: 13,
        sectionTitle: 'Success Metrics',
        generationPass: 6,
        type: 'template_calibrated',
        dependsOn: [1, 9],
        systemPrompt: `You are writing Section 13 (Success Metrics) of a Master Knowledge Base.

This section defines KPIs, benchmarks, and measurement frameworks. Calibrate targets based on the partner's deal size and sales cycle.

Output: markdown with benchmark tables for open rates, reply rates, conversion rates, pipeline value, and ROI calculations.`,
        buildUserMessage: (ctx) => `Generate Success Metrics for ${ctx.companyName}.

CALIBRATION DATA:
- Typical deal size: ${ctx.q.typical_deal_size || 'N/A'}
- Sales cycle: ${ctx.q.sales_cycle_length || 'N/A'}
- Sales team capacity: ${ctx.q.sales_team_capacity || 'N/A'}

${priorContext(ctx, [1, 9])}`,
    },

    {
        sectionNumber: 15,
        sectionTitle: 'Execution Gates',
        generationPass: 6,
        type: 'template_universal',
        dependsOn: [],
        systemPrompt: `You are writing Section 15 (Execution Gates) of a Master Knowledge Base.

Execution Gates define the quality checkpoints that must pass before any content goes live. This is a universal framework.

Output: markdown defining pre-send gates, quality scoring, compliance checks, and approval workflows.`,
        buildUserMessage: (ctx) => `Generate Execution Gates for ${ctx.companyName}. Use standard quality-gate best practices for B2B outbound.`,
    },

    // ═══ PASS 7: Economics ══════════════════════════════════

    {
        sectionNumber: 18,
        sectionTitle: 'Economic Model & Performance Advantage',
        generationPass: 7,
        type: 'ai_generated',
        dependsOn: [1, 4, 13],
        systemPrompt: `You are writing Section 18 (Economic Model & Performance Advantage) of a Master Knowledge Base.

This section proves the ECONOMIC CASE for the system. It calculates ROI, cost-per-meeting, infrastructure savings, and performance projections.

Output: markdown with economic calculations, cost comparisons (human SDR vs. AI), ROI models, and performance projections calibrated to the partner's deal size.`,
        buildUserMessage: (ctx) => `Build the Economic Model for ${ctx.companyName}.

- Deal size: ${ctx.q.typical_deal_size || 'N/A'}
- Sales cycle: ${ctx.q.sales_cycle_length || 'N/A'}
- Sales capacity: ${ctx.q.sales_team_capacity || 'N/A'}
- Pricing: ${ctx.q.pricing_model || 'N/A'}

${priorContext(ctx, [1, 4, 13])}`,
    },

    {
        sectionNumber: 19,
        sectionTitle: 'Data-to-Action Decision System',
        generationPass: 7,
        type: 'template_calibrated',
        dependsOn: [3, 13],
        systemPrompt: `You are writing Section 19 (Data-to-Action Decision System) of a Master Knowledge Base.

This section defines how raw signals and data get converted into outbound actions. It's the decision engine's playbook.

Output: markdown with signal-to-action mapping, decision trees, priority scoring, and escalation rules.`,
        buildUserMessage: (ctx) => `Build the Data-to-Action system for ${ctx.companyName}.

${priorContext(ctx, [3, 13])}`,
    },

    {
        sectionNumber: 20,
        sectionTitle: 'Deal Conversion System',
        generationPass: 7,
        type: 'ai_generated',
        dependsOn: [1, 2, 9],
        systemPrompt: `You are writing Section 20 (Deal Conversion System) of a Master Knowledge Base.

This section defines how outbound-generated leads convert through the sales process. It bridges marketing-qualified meetings to closed-won deals.

Output: markdown covering meeting preparation, handoff protocols, follow-up sequences, pipeline acceleration tactics, and closed-deal celebration/learning.`,
        buildUserMessage: (ctx) => `Build the Deal Conversion System for ${ctx.companyName}.

SALES PROCESS:
- Steps: ${ctx.q.sales_process_steps || 'N/A'}
- Qualification: ${ctx.q.qualification_criteria || 'N/A'}
- Disqualification: ${ctx.q.disqualification_criteria || 'N/A'}
- Best deal example: ${ctx.q.winning_deal_example || 'N/A'}
- Stakeholders: ${ctx.q.stakeholder_count || 'N/A'}

${priorContext(ctx, [1, 2, 9])}`,
    },

    // ═══ PASS 8: System Architecture ════════════════════════

    {
        sectionNumber: 14,
        sectionTitle: 'Future-Proofing',
        generationPass: 8,
        type: 'template_universal',
        dependsOn: [],
        systemPrompt: `You are writing Section 14 (Future-Proofing) of a Master Knowledge Base.

This is a universal section defining how the KB evolves over time: version control, update cadence, deprecation rules, and expansion planning.

Output: markdown with KB versioning rules, update triggers, review cadence, and expansion roadmap.`,
        buildUserMessage: (ctx) => `Generate Future-Proofing section for ${ctx.companyName}.`,
    },

    {
        sectionNumber: 16,
        sectionTitle: 'Derivation Rule',
        generationPass: 8,
        type: 'template_universal',
        dependsOn: [],
        systemPrompt: `You are writing Section 16 (Derivation Rule) of a Master Knowledge Base.

The Derivation Rule governs how ANY content generated by AI must trace back to KB-sourced data. No hallucination, no invention.

Output: markdown defining the derivation chain, source citation requirements, and validation rules.`,
        buildUserMessage: (ctx) => `Generate the Derivation Rule for ${ctx.companyName}. This ensures all AI output can be traced to KB evidence.`,
    },

    {
        sectionNumber: 17,
        sectionTitle: 'Knowledge Evolution Rule',
        generationPass: 8,
        type: 'template_universal',
        dependsOn: [],
        systemPrompt: `You are writing Section 17 (Knowledge Evolution Rule) of a Master Knowledge Base.

This defines how the KB learns from real-world performance data and incorporates new intelligence over time.

Output: markdown with learning triggers, promotion rules (when a pattern becomes a rule), and feedback incorporation protocols.`,
        buildUserMessage: (ctx) => `Generate the Knowledge Evolution Rule for ${ctx.companyName}.`,
    },

    {
        sectionNumber: 21,
        sectionTitle: 'Infrastructure Ownership & Cost Advantage',
        generationPass: 8,
        type: 'template_calibrated',
        dependsOn: [18],
        systemPrompt: `You are writing Section 21 (Infrastructure Ownership & Cost Advantage) of a Master Knowledge Base.

This section details the infrastructure stack and its economic advantages. Calibrate with the partner's specific cost profile.

Output: markdown covering owned infrastructure components, cost breakdown, scaling economics, and vendor independence.`,
        buildUserMessage: (ctx) => `Generate Infrastructure Ownership section for ${ctx.companyName}.

${priorContext(ctx, [18])}`,
    },

    {
        sectionNumber: 22,
        sectionTitle: 'Learning Writeback & Promotion Rules',
        generationPass: 8,
        type: 'template_universal',
        dependsOn: [],
        systemPrompt: `You are writing Section 22 (Learning Writeback & Promotion Rules) of a Master Knowledge Base.

This defines how performance data gets written back into the KB as permanent intelligence.

Output: markdown with writeback triggers, promotion thresholds, override hierarchy, and audit trail requirements.`,
        buildUserMessage: (ctx) => `Generate Learning Writeback & Promotion Rules for ${ctx.companyName}.`,
    },
]

// ─── Lookup helpers ─────────────────────────────────────────────

/** Sections grouped by generation pass, sorted for sequential processing */
export function getSectionsByPass(): Map<number, SectionPromptConfig[]> {
    const map = new Map<number, SectionPromptConfig[]>()
    for (const config of SECTION_CONFIGS) {
        const existing = map.get(config.generationPass) || []
        existing.push(config)
        map.set(config.generationPass, existing)
    }
    return map
}

/** Get config for a specific section number */
export function getSectionConfig(sectionNumber: number): SectionPromptConfig | undefined {
    return SECTION_CONFIGS.find(c => c.sectionNumber === sectionNumber)
}
