import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 7: Buyer Stage Agent
 * Determines where a contact is in the buying journey.
 * Stages: Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware, Evaluating, Decided
 */

const BUYER_STAGES = [
    'Unaware', 'Problem Aware', 'Solution Aware',
    'Product Aware', 'Most Aware', 'Evaluating', 'Decided',
] as const

export class BuyerStageAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('buyer_stage', context)
    }

    async execute(input: {
        identityId: string
        beliefId?: string
        signalHistory: {
            sends: number
            opens: number
            clicks: number
            replies: number
            bookings: number
            lastReplyClassification?: string
            daysInSequence: number
        }
        inMarketSignals?: number
        previousStage?: string
    }): Promise<DecisionResult> {
        const start = Date.now()
        const { signalHistory: sh } = input

        const knowledgeObjects = await this.readKnowledge('engagement_pattern', {
            minConfidence: 0.2,
            limit: 8,
        })
        const koIds = knowledgeObjects.map(k => k.id)

        const scores: Record<string, number> = {}
        for (const stage of BUYER_STAGES) scores[stage] = 0
        const reasoning: string[] = []

        if (sh.sends === 0) {
            scores['Unaware'] += 50
            reasoning.push('No sends yet → Unaware')
        } else if (sh.opens === 0) {
            scores['Unaware'] += 30
            scores['Problem Aware'] += 10
            reasoning.push('Sent but no opens → likely Unaware')
        } else if (sh.clicks === 0 && sh.replies === 0) {
            scores['Problem Aware'] += 30
            reasoning.push('Opens but no engagement → Problem Aware')
        } else if (sh.clicks > 0 && sh.replies === 0) {
            scores['Solution Aware'] += 30
            reasoning.push('Clicks without replies → Solution Aware')
        } else if (sh.replies > 0 && sh.bookings === 0) {
            scores['Product Aware'] += 25
            if (sh.lastReplyClassification === 'Interested') {
                scores['Most Aware'] += 20
                reasoning.push('Interested reply → Most Aware boost')
            } else if (sh.lastReplyClassification === 'Clarification') {
                scores['Solution Aware'] += 15
                reasoning.push('Clarification reply → still Solution Aware')
            } else if (sh.lastReplyClassification === 'Objection') {
                scores['Evaluating'] += 20
                reasoning.push('Objection → actively Evaluating')
            }
            reasoning.push('Replies but no booking → Product Aware')
        } else if (sh.bookings > 0) {
            scores['Evaluating'] += 35
            scores['Decided'] += 15
            reasoning.push('Has booking → Evaluating/Decided')
        }

        if (input.inMarketSignals && input.inMarketSignals > 2) {
            scores['Solution Aware'] += 10
            scores['Product Aware'] += 5
            reasoning.push(`In-market signals (${input.inMarketSignals}) → awareness boost`)
        }

        if (sh.daysInSequence > 30) {
            scores['Most Aware'] += 10
            reasoning.push('Long sequence exposure → awareness deepened')
        }

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            if (pd.stage_signal && pd.engagement_threshold) {
                const engagementLevel = (sh.opens + sh.clicks * 2 + sh.replies * 5 + sh.bookings * 20) / Math.max(1, sh.sends)
                if (engagementLevel >= pd.engagement_threshold) {
                    scores[pd.stage_signal] = (scores[pd.stage_signal] ?? 0) + 15 * ko.confidence
                    reasoning.push(`KB "${ko.title}": engagement ${engagementLevel.toFixed(2)} → ${pd.stage_signal}`)
                }
            }
        }

        const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
        const [bestStage, bestScore] = sorted[0]
        const confidence = Math.min(1, Math.max(0.1, bestScore / 60))

        const result: DecisionResult = {
            decision: bestStage,
            detail: {
                identity_id: input.identityId,
                belief_id: input.beliefId,
                all_scores: Object.fromEntries(sorted),
                signal_summary: sh,
            },
            confidence,
            reasoning: reasoning.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'buyer_stage_classification',
            entityId: input.identityId,
            entityType: 'identity',
            inputs: { ...input, signalHistory: sh },
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
