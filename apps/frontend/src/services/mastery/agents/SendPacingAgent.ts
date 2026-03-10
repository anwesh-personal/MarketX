import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 4: Send Pacing Agent
 * Decides HOW FAST to scale delivery for a satellite.
 * Reads deliverability_insight and pacing_rule knowledge.
 * Respects config_table limits as locked constraints.
 */
export class SendPacingAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('send_pacing', context)
    }

    async execute(input: {
        satelliteId: string
        currentDailySent: number
        dailySendCap: number
        warmupDay: number
        warmupTargetDays: number
        status: string
        reputationScore: number
        bounceRate: number
        complaintRate: number
        globalDailyCap: number
        warmupMinVolume: number
    }): Promise<DecisionResult> {
        const start = Date.now()

        const [pacingKO, delivKO] = await Promise.all([
            this.readKnowledge('pacing_rule', { minConfidence: 0.2, limit: 5 }),
            this.readKnowledge('deliverability_insight', { minConfidence: 0.2, limit: 5 }),
        ])
        const koIds = [...pacingKO, ...delivKO].map(k => k.id)

        let reasoning: string[] = []
        let recommendedCap = input.dailySendCap
        let rampAction: 'hold' | 'increase' | 'decrease' | 'pause' = 'hold'

        const effectiveCap = Math.min(input.dailySendCap, input.globalDailyCap)
        reasoning.push(`Effective cap: min(${input.dailySendCap}, ${input.globalDailyCap}) = ${effectiveCap}`)

        if (input.reputationScore < 40) {
            rampAction = 'pause'
            recommendedCap = 0
            reasoning.push(`CRITICAL: Reputation ${input.reputationScore} < 40 → PAUSE all sends`)
        } else if (input.reputationScore < 60) {
            rampAction = 'decrease'
            recommendedCap = Math.round(effectiveCap * 0.5)
            reasoning.push(`WARNING: Reputation ${input.reputationScore} < 60 → reduce to 50% capacity`)
        } else if (input.bounceRate > 0.05) {
            rampAction = 'decrease'
            recommendedCap = Math.round(effectiveCap * 0.7)
            reasoning.push(`High bounce rate ${(input.bounceRate * 100).toFixed(1)}% → reduce to 70% capacity`)
        } else if (input.complaintRate > 0.003) {
            rampAction = 'decrease'
            recommendedCap = Math.round(effectiveCap * 0.6)
            reasoning.push(`High complaint rate ${(input.complaintRate * 100).toFixed(3)}% → reduce to 60% capacity`)
        } else if (input.status === 'warming' || input.warmupDay < input.warmupTargetDays) {
            const rampFraction = Math.min(1, (input.warmupDay + 1) / input.warmupTargetDays)
            recommendedCap = Math.max(input.warmupMinVolume, Math.round(effectiveCap * rampFraction))

            if (input.reputationScore > 80 && input.bounceRate < 0.02 && input.warmupDay > 3) {
                recommendedCap = Math.round(recommendedCap * 1.15)
                rampAction = 'increase'
                reasoning.push(`Warmup day ${input.warmupDay}: healthy metrics → accelerated ramp (+15%)`)
            } else {
                rampAction = 'hold'
                reasoning.push(`Warmup day ${input.warmupDay}/${input.warmupTargetDays}: standard ramp to ${recommendedCap}`)
            }
        } else {
            if (input.reputationScore > 85 && input.bounceRate < 0.015) {
                rampAction = 'increase'
                recommendedCap = effectiveCap
                reasoning.push(`Fully warmed, healthy metrics → full capacity ${effectiveCap}`)
            } else {
                rampAction = 'hold'
                recommendedCap = Math.round(effectiveCap * 0.9)
                reasoning.push(`Fully warmed, stable metrics → 90% capacity`)
            }
        }

        for (const ko of pacingKO) {
            const pd = ko.pattern_data
            if (pd.cap_multiplier && ko.confidence > 0.5) {
                const prev = recommendedCap
                recommendedCap = Math.round(recommendedCap * pd.cap_multiplier)
                reasoning.push(`KB pacing rule "${ko.title}": ×${pd.cap_multiplier} (${prev}→${recommendedCap})`)
            }
        }

        recommendedCap = Math.max(0, Math.min(effectiveCap, recommendedCap))
        const confidence = Math.min(1, Math.max(0.2, input.reputationScore / 100))

        const result: DecisionResult = {
            decision: rampAction,
            detail: {
                satellite_id: input.satelliteId,
                recommended_daily_cap: recommendedCap,
                effective_cap: effectiveCap,
                ramp_action: rampAction,
                warmup_day: input.warmupDay,
                reputation_score: input.reputationScore,
                bounce_rate: input.bounceRate,
                complaint_rate: input.complaintRate,
            },
            confidence,
            reasoning: reasoning.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'send_pacing',
            entityId: input.satelliteId,
            entityType: 'satellite',
            inputs: input,
            result,
            lockedConstraints: {
                global_daily_cap: input.globalDailyCap,
                warmup_min_volume: input.warmupMinVolume,
            },
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
