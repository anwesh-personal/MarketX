import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 9: Sequence Progression Agent
 * Decides WHAT message comes next in the sequence.
 * Determines: next step, skip step, repeat with variation, escalate, pause sequence, end sequence.
 * Uses buyer stage, uncertainty, engagement data, and KB learned patterns.
 */

const PROGRESSION_ACTIONS = [
    'next_step',
    'skip_to_cta',
    'repeat_with_variation',
    'escalate_channel',
    'pause_sequence',
    'end_sequence',
    'extend_block',
] as const

export class SequenceProgressionAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('sequence_progression', context)
    }

    async execute(input: {
        flowId: string
        beliefId: string
        identityId: string
        currentStepNumber: number
        totalSteps: number
        buyerStage: string
        primaryUncertainty: string
        engagement: {
            opens: number
            clicks: number
            replies: number
            bookings: number
            lastOpenDaysAgo: number | null
            consecutiveNoOpens: number
        }
        lastReplyClassification?: string
    }): Promise<DecisionResult> {
        const start = Date.now()

        const knowledgeObjects = await this.readKnowledge('engagement_pattern', {
            minConfidence: 0.2,
            limit: 10,
        })
        const koIds = knowledgeObjects.map(k => k.id)

        const scores: Record<string, number> = {}
        for (const a of PROGRESSION_ACTIONS) scores[a] = 0
        const reasoning: string[] = []
        const { engagement: eng } = input

        scores['next_step'] = 30
        reasoning.push('Default: advance to next step (base 30)')

        if (eng.bookings > 0) {
            scores['end_sequence'] += 40
            reasoning.push('Has booking → end sequence')
        }

        if (input.lastReplyClassification === 'Interested') {
            scores['skip_to_cta'] += 35
            scores['next_step'] -= 10
            reasoning.push('Interested reply → skip to CTA')
        }

        if (input.lastReplyClassification === 'Negative') {
            scores['end_sequence'] += 30
            scores['pause_sequence'] += 20
            reasoning.push('Negative reply → end or pause')
        }

        if (input.lastReplyClassification === 'Timing') {
            scores['pause_sequence'] += 30
            reasoning.push('Timing reply → pause for recontact')
        }

        if (input.lastReplyClassification === 'Objection') {
            scores['repeat_with_variation'] += 25
            reasoning.push('Objection → repeat with variation addressing uncertainty')
        }

        if (eng.consecutiveNoOpens >= 3) {
            scores['pause_sequence'] += 20
            scores['escalate_channel'] += 15
            reasoning.push(`${eng.consecutiveNoOpens} consecutive no-opens → consider pause or channel escalation`)
        }

        if (eng.consecutiveNoOpens >= 5) {
            scores['end_sequence'] += 20
            reasoning.push('5+ no-opens → likely disengaged, end sequence')
        }

        if (input.currentStepNumber >= input.totalSteps && input.totalSteps <= 4) {
            scores['extend_block'] += 25
            reasoning.push('End of Block 1 with engagement → extend to Block 2')
        } else if (input.currentStepNumber >= input.totalSteps && input.totalSteps <= 8) {
            scores['extend_block'] += 20
            reasoning.push('End of Block 2 → consider Block 3 extension')
        }

        if (input.buyerStage === 'Evaluating' || input.buyerStage === 'Most Aware') {
            scores['skip_to_cta'] += 15
            reasoning.push('Late buyer stage → accelerate to CTA')
        }

        if (input.buyerStage === 'Unaware' && eng.opens === 0 && input.currentStepNumber > 2) {
            scores['escalate_channel'] += 20
            reasoning.push('Unaware + no opens after step 2 → try different channel')
        }

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            if (pd.progression_action && pd.trigger_condition) {
                const tc = pd.trigger_condition
                let match = true
                if (tc.min_step && input.currentStepNumber < tc.min_step) match = false
                if (tc.buyer_stage && tc.buyer_stage !== input.buyerStage) match = false
                if (tc.min_opens && eng.opens < tc.min_opens) match = false

                if (match) {
                    scores[pd.progression_action] = (scores[pd.progression_action] ?? 0) + 20 * ko.confidence
                    reasoning.push(`KB "${ko.title}": condition matched → ${pd.progression_action}`)
                }
            }
        }

        const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
        const [bestAction, bestScore] = sorted[0]
        const confidence = Math.min(1, Math.max(0.1, bestScore / 60))

        let targetStep: number | null = null
        switch (bestAction) {
            case 'next_step': targetStep = input.currentStepNumber + 1; break
            case 'skip_to_cta': targetStep = Math.min(input.totalSteps, input.currentStepNumber + 2); break
            case 'repeat_with_variation': targetStep = input.currentStepNumber; break
            case 'extend_block': targetStep = input.totalSteps + 1; break
        }

        const result: DecisionResult = {
            decision: bestAction,
            detail: {
                action: bestAction,
                target_step: targetStep,
                flow_id: input.flowId,
                belief_id: input.beliefId,
                identity_id: input.identityId,
                current_step: input.currentStepNumber,
                total_steps: input.totalSteps,
                buyer_stage: input.buyerStage,
                primary_uncertainty: input.primaryUncertainty,
                all_scores: Object.fromEntries(sorted.filter(([, s]) => s > 0)),
            },
            confidence,
            reasoning: reasoning.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'sequence_progression',
            entityId: input.flowId,
            entityType: 'flow',
            inputs: input,
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
