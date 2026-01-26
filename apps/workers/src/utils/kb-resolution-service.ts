/**
 * KB RESOLUTION SERVICE (WORKERS VERSION)
 * 
 * Provides functions for resolver nodes to query the Knowledge Base.
 * All resolution is DETERMINISTIC - no AI randomness.
 * 
 * PORTED FROM: apps/backend/src/services/kb/kbResolutionService.ts
 * 
 * IMPORTANT: Every resolver function receives:
 * 1. The KB context (loaded from engine's linked kb_id)
 * 2. Hints/context from previous nodes
 * 3. The ORIGINAL initial input (for traceability, never lost)
 * 
 * SCHEMA REFERENCE: Uses KB types from Supabase knowledge_bases table
 */

// ============================================================================
// TYPES (matching kb.schema.ts structure)
// ============================================================================

export interface AppliesTo {
    icp_id?: string;
    buyer_stage?: string;
    offer_id?: string;
    industry_group_norm?: string;
    revenue_band_norm?: string;
    seniority_norm?: string;
}

export interface ICPSegment {
    icp_id: string;
    segment_name: string;
    industry_group_norm: string;
    revenue_band_norm: string;
    seniority_norm: string;
    firm_size?: { min_employees?: number; max_employees?: number };
    pain_points: string[];
    job_titles: string[];
    buying_triggers: string[];
    decision_criteria: string[];
}

export interface Offer {
    offer_id: string;
    offer_name: string;
    category: string;
    value_proposition: string;
    differentiators: string[];
    pricing_model: string;
    delivery_timeline: string;
    proof_points: string[];
}

export interface Angle {
    angle_id: string;
    angle_name: string;
    axis: 'risk' | 'speed' | 'control' | 'loss' | 'upside' | 'identity';
    narrative: string;
    applies_to?: AppliesTo;
}

export interface CTA {
    cta_id: string;
    cta_type: 'REPLY' | 'CLICK' | 'BOOK_CALL' | 'DOWNLOAD' | 'OTHER';
    label: string;
    destination_type: string;
    destination_slug: string;
    applies_to?: AppliesTo;
}

export interface PageBlueprint {
    blueprint_id: string;
    page_type: string;
    buyer_stage: string;
    required_sections: string[];
    default_cta_type: string;
    recommended_angle_axes?: string[];
    applies_to?: AppliesTo;
}

export interface Layout {
    layout_id: string;
    layout_name: string;
    structure: string[];
    applies_to?: AppliesTo;
}

export interface EmailFlowBlueprint {
    flow_blueprint_id: string;
    flow_name: string;
    goal: 'MEANINGFUL_REPLY' | 'CLICK' | 'BOOK_CALL';
    length_range: { min: number; max: number };
    sequence_structure: string[];
    default_cta_type: string;
    recommended_angle_axes?: string[];
    applies_to?: AppliesTo;
}

export interface ReplyPlaybook {
    playbook_id: string;
    playbook_name: string;
    scenarios: Array<{
        scenario_id: string;
        description: string;
        allowed_strategy_ids: string[];
    }>;
    applies_to?: AppliesTo;
}

export interface ReplyStrategy {
    strategy_id: string;
    strategy_name: string;
    strategy_type: string;
    rules: string[];
    applies_to?: AppliesTo;
}

export interface SocialPostBlueprint {
    post_blueprint_id: string;
    platform: 'LinkedIn' | 'X' | 'YouTube';
    post_type: string;
    structure_rules: string[];
    applies_to?: AppliesTo;
}

export interface KBLearningPreference {
    pref_id: string;
    preference_type: string;
    preferred_ids: string[];
    reason: string;
    applies_to: AppliesTo;
    expires_at?: string;
}

export interface RoutingRule {
    rule_id: string;
    if: {
        entry_page_type?: string;
        buyer_stage?: string;
        icp_id?: string;
    };
    then: {
        next_destination_slug: string;
        preferred_cta_id?: string;
    };
}

export interface KnowledgeBase {
    schema_version: string;
    kb_version: string;
    stage: 'pre-embeddings' | 'embeddings-enabled';
    brand: {
        brand_name_exact: string;
        voice_rules: string[];
        compliance: {
            forbidden_claims: string[];
            required_disclosures: string[];
        };
    };
    icp_library: { segments: ICPSegment[] };
    offer_library: { offers: Offer[] };
    angles_library: { angles: Angle[] };
    ctas_library: { ctas: CTA[] };
    website_library: {
        page_blueprints: PageBlueprint[];
        layouts: Layout[];
    };
    email_library: {
        flow_blueprints: EmailFlowBlueprint[];
        subject_firstline_variants: Array<{
            variant_id: string;
            subject: string;
            first_line: string;
        }>;
        reply_playbooks: ReplyPlaybook[];
        reply_strategies: ReplyStrategy[];
    };
    social_library: {
        pillars: Array<{
            pillar_id: string;
            pillar_name: string;
            description: string;
            applies_to?: AppliesTo;
        }>;
        post_blueprints: SocialPostBlueprint[];
    };
    routing: {
        defaults: Array<{
            context: Record<string, unknown>;
            destination_type: string;
            destination_slug: string;
            cta_type: string;
        }>;
        rules: RoutingRule[];
    };
    testing: Record<string, {
        enabled: boolean;
        max_variants: number;
        evaluation_window_days: number;
        min_sample_size: number;
    }>;
    guardrails: {
        paused_patterns: Array<{
            pattern_type: string;
            pattern_id: string;
            reason: string;
            paused_at: string;
        }>;
    };
    learning: {
        history: Array<{
            update_id: string;
            timestamp: string;
            source: string;
            summary: string;
        }>;
        preferences: KBLearningPreference[];
    };
}

// ============================================================================
// RESOLUTION TYPES
// ============================================================================

export interface ResolutionContext {
    /** The full Knowledge Base loaded from engine config */
    kb: KnowledgeBase;
    /** Original input from trigger (always available, never lost) */
    initialInput: Record<string, unknown>;
    /** Previous node outputs accumulated */
    pipelineContext: Record<string, unknown>;
}

export interface ResolvedICP {
    icpId: string;
    segment: ICPSegment;
    confidence: number;
    matchReason: string;
}

export interface ResolvedOffer {
    offerId: string;
    offer: Offer;
    confidence: number;
    matchReason: string;
}

export interface ResolvedAngle {
    angleId: string;
    angle: Angle;
    selectionReason: string;
    wasKBPreference: boolean;
}

export interface ResolvedBlueprint {
    blueprintId: string;
    blueprintType: 'page' | 'email_flow' | 'reply_playbook' | 'social_post';
    blueprint: PageBlueprint | EmailFlowBlueprint | ReplyPlaybook | SocialPostBlueprint;
    layoutId: string | null;
    layout: Layout | null;
}

export interface ResolvedCTA {
    ctaId: string;
    cta: CTA;
    routingContext: {
        nextPageSlug: string | null;
        condition: string | null;
    } | null;
}

// ============================================================================
// KB RESOLUTION SERVICE
// ============================================================================

class KBResolutionService {

    // =========================================================================
    // RESOLVE ICP
    // Match input signals to an ICP segment
    // =========================================================================

    resolveICP(
        context: ResolutionContext,
        hints: {
            industryHint?: string;
            jobTitleHint?: string;
            companySizeHint?: string;
            icpId?: string; // Direct specification
        }
    ): ResolvedICP {
        const { kb } = context;
        const icps = kb.icp_library.segments;

        // Direct ID match (highest priority)
        if (hints.icpId) {
            const direct = icps.find((s: ICPSegment) => s.icp_id === hints.icpId);
            if (direct) {
                return {
                    icpId: direct.icp_id,
                    segment: direct,
                    confidence: 1.0,
                    matchReason: 'Direct ICP ID match',
                };
            }
        }

        // Score each ICP based on hints
        let bestMatch: ICPSegment | null = null;
        let bestScore = 0;
        let bestReason = '';

        for (const icp of icps) {
            let score = 0;
            const reasons: string[] = [];

            // Industry match
            if (hints.industryHint && icp.industry_group_norm) {
                if (icp.industry_group_norm.toLowerCase().includes(hints.industryHint.toLowerCase())) {
                    score += 0.4;
                    reasons.push(`Industry: ${icp.industry_group_norm}`);
                }
            }

            // Job title match
            if (hints.jobTitleHint && icp.job_titles?.length) {
                const titleMatch = icp.job_titles.find((t: string) =>
                    t.toLowerCase().includes(hints.jobTitleHint!.toLowerCase()) ||
                    hints.jobTitleHint!.toLowerCase().includes(t.toLowerCase())
                );
                if (titleMatch) {
                    score += 0.35;
                    reasons.push(`Job title: ${titleMatch}`);
                }
            }

            // Company size match (using revenue_band_norm as proxy)
            if (hints.companySizeHint && icp.revenue_band_norm) {
                if (icp.revenue_band_norm === hints.companySizeHint) {
                    score += 0.25;
                    reasons.push(`Company size: ${hints.companySizeHint}`);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = icp;
                bestReason = reasons.join(', ');
            }
        }

        // Fallback to first ICP if no match
        if (!bestMatch) {
            bestMatch = icps[0];
            bestScore = 0.2;
            bestReason = 'Default ICP (no match found)';
        }

        return {
            icpId: bestMatch.icp_id,
            segment: bestMatch,
            confidence: Math.min(bestScore, 1.0),
            matchReason: bestReason,
        };
    }

    // =========================================================================
    // RESOLVE OFFER
    // Select appropriate offer from KB
    // =========================================================================

    resolveOffer(
        context: ResolutionContext,
        hints: {
            offerId?: string;
            categoryHint?: string;
            offerNameHint?: string;
        }
    ): ResolvedOffer {
        const { kb } = context;
        const offers = kb.offer_library.offers;

        // Direct ID match
        if (hints.offerId) {
            const direct = offers.find((o: Offer) => o.offer_id === hints.offerId);
            if (direct) {
                return {
                    offerId: direct.offer_id,
                    offer: direct,
                    confidence: 1.0,
                    matchReason: 'Direct Offer ID match',
                };
            }
        }

        // Category match
        if (hints.categoryHint) {
            const categoryMatch = offers.find((o: Offer) =>
                o.category.toLowerCase().includes(hints.categoryHint!.toLowerCase())
            );
            if (categoryMatch) {
                return {
                    offerId: categoryMatch.offer_id,
                    offer: categoryMatch,
                    confidence: 0.8,
                    matchReason: `Category match: ${hints.categoryHint}`,
                };
            }
        }

        // Name match
        if (hints.offerNameHint) {
            const nameMatch = offers.find((o: Offer) =>
                o.offer_name.toLowerCase().includes(hints.offerNameHint!.toLowerCase())
            );
            if (nameMatch) {
                return {
                    offerId: nameMatch.offer_id,
                    offer: nameMatch,
                    confidence: 0.7,
                    matchReason: `Name match: ${hints.offerNameHint}`,
                };
            }
        }

        // Fallback to first offer
        const fallback = offers[0];
        return {
            offerId: fallback.offer_id,
            offer: fallback,
            confidence: 0.3,
            matchReason: 'Default offer (no specific match)',
        };
    }

    // =========================================================================
    // RESOLVE ANGLE
    // Select persuasion angle - respects KB learning preferences
    // =========================================================================

    selectAngle(
        context: ResolutionContext,
        params: {
            icpId: string;
            offerId?: string;
            buyerStage?: string;
            preferredAxis?: string;
        }
    ): ResolvedAngle {
        const { kb } = context;
        const angles = kb.angles_library.angles;

        // Check KB learning preferences first
        const preferences = kb.learning?.preferences || [];
        const anglePreference = preferences.find((p: KBLearningPreference) =>
            p.preference_type === 'PREFER_ANGLE' &&
            (p.applies_to.icp_id === params.icpId || !p.applies_to.icp_id) &&
            (p.applies_to.offer_id === params.offerId || !p.applies_to.offer_id)
        );

        if (anglePreference && anglePreference.preferred_ids.length > 0) {
            const preferredId = anglePreference.preferred_ids[0];
            const preferred = angles.find((a: Angle) => a.angle_id === preferredId);
            if (preferred) {
                return {
                    angleId: preferred.angle_id,
                    angle: preferred,
                    selectionReason: `KB preference: ${anglePreference.reason}`,
                    wasKBPreference: true,
                };
            }
        }

        // Forced axis preference
        if (params.preferredAxis) {
            const axisMatch = angles.find((a: Angle) => a.axis === params.preferredAxis);
            if (axisMatch) {
                return {
                    angleId: axisMatch.angle_id,
                    angle: axisMatch,
                    selectionReason: `Forced axis: ${params.preferredAxis}`,
                    wasKBPreference: false,
                };
            }
        }

        // Filter angles applicable to this ICP
        const applicableAngles = angles.filter((a: Angle) =>
            !a.applies_to?.icp_id || a.applies_to.icp_id === params.icpId
        );

        // Select based on buyer stage mapping
        const stageAxisMap: Record<string, string> = {
            'AWARENESS': 'identity',
            'CONSIDERATION': 'loss',
            'EVALUATION': 'control',
            'RISK_RESOLUTION': 'risk',
            'READY': 'speed',
        };

        if (params.buyerStage && stageAxisMap[params.buyerStage]) {
            const stageMatch = applicableAngles.find((a: Angle) =>
                a.axis === stageAxisMap[params.buyerStage!]
            );
            if (stageMatch) {
                return {
                    angleId: stageMatch.angle_id,
                    angle: stageMatch,
                    selectionReason: `Buyer stage ${params.buyerStage} → ${stageAxisMap[params.buyerStage]} axis`,
                    wasKBPreference: false,
                };
            }
        }

        // Fallback to first applicable angle
        const fallback = applicableAngles[0] || angles[0];
        return {
            angleId: fallback.angle_id,
            angle: fallback,
            selectionReason: 'Default angle (no specific match)',
            wasKBPreference: false,
        };
    }

    // =========================================================================
    // RESOLVE BLUEPRINT
    // Select content blueprint and layout for content type
    // =========================================================================

    selectBlueprint(
        context: ResolutionContext,
        params: {
            contentType: 'website_page' | 'email_flow' | 'email_reply' | 'social_post';
            pageType?: string;
            flowGoal?: 'MEANINGFUL_REPLY' | 'CLICK' | 'BOOK_CALL';
            platform?: 'LinkedIn' | 'X' | 'YouTube';
            buyerStage?: string;
        }
    ): ResolvedBlueprint | null {
        const { kb } = context;

        switch (params.contentType) {
            case 'website_page': {
                const blueprints = kb.website_library.page_blueprints;
                const layouts = kb.website_library.layouts;

                let blueprint = blueprints.find((b: PageBlueprint) =>
                    b.page_type === params.pageType
                );

                if (!blueprint && params.buyerStage) {
                    blueprint = blueprints.find((b: PageBlueprint) =>
                        b.buyer_stage === params.buyerStage
                    );
                }

                if (!blueprint) {
                    blueprint = blueprints[0];
                }

                let layout = layouts.find((l: Layout) =>
                    l.applies_to?.buyer_stage === blueprint.buyer_stage
                );
                if (!layout) {
                    layout = layouts[0];
                }

                return {
                    blueprintId: blueprint.blueprint_id,
                    blueprintType: 'page',
                    blueprint,
                    layoutId: layout?.layout_id || null,
                    layout: layout || null,
                };
            }

            case 'email_flow': {
                const flowBlueprints = kb.email_library.flow_blueprints;

                let blueprint = flowBlueprints.find((f: EmailFlowBlueprint) =>
                    f.goal === params.flowGoal
                );
                if (!blueprint) {
                    blueprint = flowBlueprints[0];
                }

                return {
                    blueprintId: blueprint.flow_blueprint_id,
                    blueprintType: 'email_flow',
                    blueprint,
                    layoutId: null,
                    layout: null,
                };
            }

            case 'email_reply': {
                const playbooks = kb.email_library.reply_playbooks;
                const playbook = playbooks[0];

                return {
                    blueprintId: playbook.playbook_id,
                    blueprintType: 'reply_playbook',
                    blueprint: playbook,
                    layoutId: null,
                    layout: null,
                };
            }

            case 'social_post': {
                const postBlueprints = kb.social_library.post_blueprints;

                let blueprint = postBlueprints.find((p: SocialPostBlueprint) =>
                    p.platform === params.platform
                );
                if (!blueprint) {
                    blueprint = postBlueprints[0];
                }

                return {
                    blueprintId: blueprint.post_blueprint_id,
                    blueprintType: 'social_post',
                    blueprint,
                    layoutId: null,
                    layout: null,
                };
            }

            default:
                return null;
        }
    }

    // =========================================================================
    // RESOLVE REPLY STRATEGY
    // =========================================================================

    selectReplyStrategy(
        context: ResolutionContext,
        params: {
            scenarioId: string;
            playbook: ReplyPlaybook;
        }
    ): ReplyStrategy | null {
        const { kb } = context;
        const strategies = kb.email_library.reply_strategies;

        const scenario = params.playbook.scenarios.find(s => s.scenario_id === params.scenarioId);
        if (!scenario) return null;

        const allowedStrategyId = scenario.allowed_strategy_ids[0];
        const strategy = strategies.find((s: ReplyStrategy) => s.strategy_id === allowedStrategyId);

        return strategy || null;
    }

    // =========================================================================
    // RESOLVE CTA
    // =========================================================================

    selectCTA(
        context: ResolutionContext,
        params: {
            pageType?: string;
            buyerStage?: string;
            icpId?: string;
            preferredType?: 'REPLY' | 'CLICK' | 'BOOK_CALL' | 'DOWNLOAD' | 'OTHER';
        }
    ): ResolvedCTA {
        const { kb } = context;
        const ctas = kb.ctas_library.ctas;
        const routing = kb.routing;

        // Check routing rules
        if (params.pageType && routing?.rules) {
            const matchingRule = routing.rules.find(r =>
                r.if.entry_page_type === params.pageType ||
                (r.if.buyer_stage && r.if.buyer_stage === params.buyerStage) ||
                (r.if.icp_id && r.if.icp_id === params.icpId)
            );

            if (matchingRule?.then.preferred_cta_id) {
                const routedCTA = ctas.find((c: CTA) =>
                    c.cta_id === matchingRule.then.preferred_cta_id
                );
                if (routedCTA) {
                    return {
                        ctaId: routedCTA.cta_id,
                        cta: routedCTA,
                        routingContext: {
                            nextPageSlug: matchingRule.then.next_destination_slug,
                            condition: `Routing rule matched: ${matchingRule.rule_id}`,
                        },
                    };
                }
            }
        }

        // Match by preferred type
        if (params.preferredType) {
            const typeMatch = ctas.find((c: CTA) => c.cta_type === params.preferredType);
            if (typeMatch) {
                return {
                    ctaId: typeMatch.cta_id,
                    cta: typeMatch,
                    routingContext: null,
                };
            }
        }

        // Match by applies_to context
        const contextMatch = ctas.find((c: CTA) =>
            c.applies_to?.buyer_stage === params.buyerStage ||
            c.applies_to?.icp_id === params.icpId
        );
        if (contextMatch) {
            return {
                ctaId: contextMatch.cta_id,
                cta: contextMatch,
                routingContext: null,
            };
        }

        // Fallback to first CTA
        const fallback = ctas[0];
        return {
            ctaId: fallback.cta_id,
            cta: fallback,
            routingContext: null,
        };
    }

    // =========================================================================
    // GET ROUTING SUGGESTIONS
    // =========================================================================

    getRoutingSuggestions(
        context: ResolutionContext,
        params: {
            currentPageType: string;
            buyerStage?: string;
            icpId?: string;
        }
    ): Array<{ nextPageSlug: string; condition: string; ruleId: string }> {
        const { kb } = context;
        const routing = kb.routing;

        if (!routing?.rules) return [];

        return routing.rules
            .filter(r =>
                r.if.entry_page_type === params.currentPageType ||
                r.if.buyer_stage === params.buyerStage ||
                r.if.icp_id === params.icpId
            )
            .map(r => ({
                nextPageSlug: r.then.next_destination_slug,
                condition: `From ${r.if.entry_page_type || r.if.buyer_stage || r.if.icp_id}`,
                ruleId: r.rule_id,
            }));
    }
}

// Singleton export
export const kbResolutionService = new KBResolutionService();
export default kbResolutionService;
