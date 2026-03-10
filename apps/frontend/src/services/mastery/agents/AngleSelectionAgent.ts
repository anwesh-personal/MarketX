import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 3: Angle Selection Agent
 * Decides WHICH belief angle to use for a given ICP + Offer combination.
 * Reads angle performance knowledge from Local KB and Global priors.
 */
export class AngleSelectionAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('angle_selection', context)
    }

    async execute(input: {
        offerId: string
        icpId: string
        availableAngles: Array<{ id: string; angle_key: string; label: string }>
        industry?: string
        seniority?: string
        previousAnglesUsed?: string[]
    }): Promise<DecisionResult> {
        const start = Date.now()

        if (!input.availableAngles?.length) {
            return {
                decision: 'NO_ANGLES_AVAILABLE',
                detail: {},
                confidence: 0,
                reasoning: 'No angles available for selection',
                knowledgeObjectsUsed: [],
            }
        }

        const knowledgeObjects = await this.readKnowledge('angle_performance', {
            minConfidence: 0.2,
            limit: 15,
        })
        const koIds = knowledgeObjects.map(k => k.id)

        const angleScores: Record<string, { score: number; reasons: string[] }> = {}
        for (const angle of input.availableAngles) {
            angleScores[angle.angle_key] = { score: 50, reasons: ['Base score: 50'] }
        }

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            if (!pd.angle_key || !angleScores[pd.angle_key]) continue

            const entry = angleScores[pd.angle_key]

            if (pd.reply_rate) {
                const boost = pd.reply_rate * 100 * ko.confidence
                entry.score += boost
                entry.reasons.push(`KB reply_rate ${(pd.reply_rate * 100).toFixed(1)}% (+"${boost.toFixed(1)}")`)
            }
            if (pd.booking_rate) {
                const boost = pd.booking_rate * 200 * ko.confidence
                entry.score += boost
                entry.reasons.push(`KB booking_rate ${(pd.booking_rate * 100).toFixed(2)}% (+${boost.toFixed(1)})`)
            }
            if (pd.negative_rate) {
                const penalty = pd.negative_rate * 80 * ko.confidence
                entry.score -= penalty
                entry.reasons.push(`KB negative_rate ${(pd.negative_rate * 100).toFixed(1)}% (-${penalty.toFixed(1)})`)
            }

            if (input.industry && ko.applicable_industries?.includes(input.industry)) {
                entry.score += 10
                entry.reasons.push(`Industry match bonus (+10)`)
            }
        }

        if (input.previousAnglesUsed?.length) {
            for (const usedKey of input.previousAnglesUsed) {
                if (angleScores[usedKey]) {
                    angleScores[usedKey].score -= 15
                    angleScores[usedKey].reasons.push('Previously used penalty (-15)')
                }
            }
        }

        const sorted = Object.entries(angleScores)
            .sort(([, a], [, b]) => b.score - a.score)

        const [bestKey, bestEntry] = sorted[0]
        const selectedAngle = input.availableAngles.find(a => a.angle_key === bestKey)!
        const maxScore = sorted[0][1].score
        const confidence = Math.min(1, Math.max(0, maxScore / 150))

        const result: DecisionResult = {
            decision: bestKey,
            detail: {
                selected_angle_id: selectedAngle.id,
                selected_angle_key: bestKey,
                selected_label: selectedAngle.label,
                score: maxScore,
                all_scores: Object.fromEntries(sorted.map(([k, v]) => [k, v.score])),
                offer_id: input.offerId,
                icp_id: input.icpId,
            },
            confidence,
            reasoning: bestEntry.reasons.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'angle_selection',
            entityId: input.offerId,
            entityType: 'offer',
            inputs: input,
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
