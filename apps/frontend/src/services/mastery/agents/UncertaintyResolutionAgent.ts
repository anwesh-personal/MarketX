import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 8: Uncertainty Resolution Agent
 * Identifies what the prospect is uncertain about and recommends what to address next.
 * Reads reply content, engagement patterns, and KB to determine the highest-leverage
 * uncertainty to resolve in the next touchpoint.
 */

const UNCERTAINTY_TYPES = [
    'problem_fit',
    'solution_credibility',
    'pricing_value',
    'implementation_risk',
    'timing_urgency',
    'authority_alignment',
    'competitive_comparison',
    'social_proof',
    'technical_feasibility',
] as const

export class UncertaintyResolutionAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('uncertainty_resolution', context)
    }

    async execute(input: {
        beliefId: string
        identityId: string
        buyerStage: string
        lastReplyText?: string
        lastReplyClassification?: string
        engagementPattern: { opens: number; clicks: number; replies: number; objections: number }
        flowStepNumber: number
    }): Promise<DecisionResult> {
        const start = Date.now()

        const knowledgeObjects = await this.readKnowledge('engagement_pattern', {
            minConfidence: 0.2,
            limit: 10,
        })
        const koIds = knowledgeObjects.map(k => k.id)

        const scores: Record<string, number> = {}
        for (const u of UNCERTAINTY_TYPES) scores[u] = 0
        const reasoning: string[] = []

        switch (input.buyerStage) {
            case 'Unaware':
            case 'Problem Aware':
                scores['problem_fit'] += 30
                reasoning.push('Early stage → problem_fit is primary uncertainty')
                break
            case 'Solution Aware':
                scores['solution_credibility'] += 25
                scores['competitive_comparison'] += 15
                reasoning.push('Solution Aware → credibility + comparison needed')
                break
            case 'Product Aware':
                scores['pricing_value'] += 20
                scores['implementation_risk'] += 15
                scores['technical_feasibility'] += 10
                reasoning.push('Product Aware → value, risk, and feasibility questions')
                break
            case 'Most Aware':
            case 'Evaluating':
                scores['pricing_value'] += 20
                scores['authority_alignment'] += 15
                scores['timing_urgency'] += 15
                reasoning.push('Late stage → pricing, authority, urgency')
                break
        }

        if (input.lastReplyClassification === 'Objection') {
            if (input.lastReplyText) {
                const text = input.lastReplyText.toLowerCase()
                if (text.includes('expensiv') || text.includes('cost') || text.includes('budget') || text.includes('price')) {
                    scores['pricing_value'] += 25
                    reasoning.push('Objection about pricing detected')
                }
                if (text.includes('already') || text.includes('competitor') || text.includes('using')) {
                    scores['competitive_comparison'] += 25
                    reasoning.push('Competitive objection detected')
                }
                if (text.includes('implement') || text.includes('integrat') || text.includes('complex')) {
                    scores['implementation_risk'] += 25
                    reasoning.push('Implementation concern detected')
                }
                if (text.includes('not now') || text.includes('timing') || text.includes('later')) {
                    scores['timing_urgency'] += 20
                    reasoning.push('Timing objection detected')
                }
            }
        }

        if (input.lastReplyClassification === 'Clarification') {
            scores['solution_credibility'] += 15
            scores['technical_feasibility'] += 10
            reasoning.push('Clarification request → credibility and feasibility gaps')
        }

        if (input.engagementPattern.objections > 1) {
            scores['social_proof'] += 15
            reasoning.push('Multiple objections → social proof needed')
        }

        if (input.flowStepNumber > 6 && input.engagementPattern.clicks > 0 && input.engagementPattern.replies === 0) {
            scores['timing_urgency'] += 15
            scores['authority_alignment'] += 10
            reasoning.push('Deep in sequence, clicks but no reply → urgency or authority gap')
        }

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            if (pd.uncertainty_boost && pd.stage === input.buyerStage) {
                for (const [uType, boost] of Object.entries(pd.uncertainty_boost)) {
                    scores[uType] = (scores[uType] ?? 0) + (boost as number) * ko.confidence
                }
                reasoning.push(`KB "${ko.title}": stage-matched uncertainty boost`)
            }
        }

        const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
        const [topUncertainty, topScore] = sorted[0]
        const secondUncertainty = sorted[1]?.[0]
        const confidence = Math.min(1, Math.max(0.1, topScore / 50))

        const result: DecisionResult = {
            decision: topUncertainty,
            detail: {
                primary_uncertainty: topUncertainty,
                secondary_uncertainty: secondUncertainty,
                all_scores: Object.fromEntries(sorted.filter(([, s]) => s > 0)),
                belief_id: input.beliefId,
                identity_id: input.identityId,
                buyer_stage: input.buyerStage,
                step_number: input.flowStepNumber,
            },
            confidence,
            reasoning: reasoning.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'uncertainty_resolution',
            entityId: input.beliefId,
            entityType: 'belief',
            inputs: input,
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
