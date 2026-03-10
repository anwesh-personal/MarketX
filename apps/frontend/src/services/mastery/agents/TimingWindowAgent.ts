import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 2: Timing Window Agent
 * Decides WHEN to reach out to a contact.
 * Learns optimal send windows per industry, geography, seniority.
 */
export class TimingWindowAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('timing_window', context)
    }

    async execute(input: {
        identityId: string
        industry?: string
        geography?: string
        seniority?: string
        timezone?: string
        previousSendTimes?: string[]
    }): Promise<DecisionResult> {
        const start = Date.now()

        const knowledgeObjects = await this.readKnowledge('timing_pattern', {
            minConfidence: 0.2,
            limit: 10,
        })
        const koIds = knowledgeObjects.map(k => k.id)

        let bestDay = 'Tuesday'
        let bestHour = 9
        let confidence = 0.3
        let reasoning: string[] = ['Default: Tuesday 9AM local time']

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            const matchScore = this.computeApplicability(ko, input)
            if (matchScore < 0.3) continue

            if (pd.best_day && ko.confidence > confidence) {
                bestDay = pd.best_day
                bestHour = pd.best_hour ?? bestHour
                confidence = ko.confidence * matchScore
                reasoning = [`KB pattern "${ko.title}": ${bestDay} @ ${bestHour}:00 (conf: ${confidence.toFixed(2)})`]
            }

            if (pd.avoid_days?.includes(bestDay)) {
                const alternatives = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                    .filter(d => !pd.avoid_days.includes(d))
                if (alternatives.length > 0) {
                    bestDay = alternatives[0]
                    reasoning.push(`Avoided ${pd.avoid_days.join(',')} per KB "${ko.title}"`)
                }
            }
        }

        if (input.seniority === 'C-Suite' || input.seniority === 'VP') {
            bestHour = Math.max(7, bestHour - 1)
            reasoning.push(`Senior exec: shifted 1hr earlier to ${bestHour}:00`)
        }

        const tz = input.timezone ?? 'UTC'
        const sendAt = this.computeNextSlot(bestDay, bestHour, tz)

        const result: DecisionResult = {
            decision: `SEND_AT:${sendAt}`,
            detail: {
                day: bestDay,
                hour: bestHour,
                timezone: tz,
                send_at: sendAt,
                identity_id: input.identityId,
            },
            confidence: Math.min(1, confidence),
            reasoning: reasoning.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'optimal_send_time',
            entityId: input.identityId,
            entityType: 'identity',
            inputs: input,
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }

    private computeApplicability(ko: any, input: Record<string, any>): number {
        let score = 0.5
        if (input.industry && ko.applicable_industries?.includes(input.industry)) score += 0.3
        if (input.geography && ko.applicable_geographies?.includes(input.geography)) score += 0.2
        return Math.min(1, score)
    }

    private computeNextSlot(dayName: string, hour: number, _tz: string): string {
        const dayMap: Record<string, number> = {
            Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
        }
        const target = dayMap[dayName] ?? 2
        const now = new Date()
        const current = now.getUTCDay()
        let daysUntil = (target - current + 7) % 7
        if (daysUntil === 0 && now.getUTCHours() >= hour) daysUntil = 7

        const sendDate = new Date(now)
        sendDate.setUTCDate(sendDate.getUTCDate() + daysUntil)
        sendDate.setUTCHours(hour, 0, 0, 0)
        return sendDate.toISOString()
    }
}
