import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 1: Contact Decision Agent
 * Decides WHO to contact from the identity pool.
 * Reads: Local KB contact_pattern + global priors
 * Writes: Local KB with observed patterns
 */
export class ContactDecisionAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('contact_decision', context)
    }

    async execute(input: {
        identityId: string
        icpId: string
        identityData: {
            confidence: number
            verification_status: string
            industry?: string
            seniority?: string
            geography?: string
            in_market_signals?: number
            last_contacted_at?: string
            previous_outcomes?: string[]
        }
    }): Promise<DecisionResult> {
        const start = Date.now()
        const { identityId, icpId, identityData } = input

        const knowledgeObjects = await this.readKnowledge('contact_pattern', {
            minConfidence: 0.3,
            limit: 10,
        })

        const koIds = knowledgeObjects.map(k => k.id)

        let score = 0
        let reasoning: string[] = []

        if (identityData.confidence >= 0.8) { score += 30; reasoning.push('High identity confidence (+30)') }
        else if (identityData.confidence >= 0.5) { score += 15; reasoning.push('Medium identity confidence (+15)') }
        else { score -= 10; reasoning.push('Low identity confidence (-10)') }

        if (identityData.verification_status === 'verified') { score += 20; reasoning.push('Email verified (+20)') }
        else if (identityData.verification_status === 'catch_all') { score -= 5; reasoning.push('Catch-all domain (-5)') }

        if (identityData.in_market_signals && identityData.in_market_signals > 0) {
            const bonus = Math.min(25, identityData.in_market_signals * 5)
            score += bonus
            reasoning.push(`In-market signals: ${identityData.in_market_signals} (+${bonus})`)
        }

        if (identityData.last_contacted_at) {
            const daysSince = (Date.now() - new Date(identityData.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
            if (daysSince < 30) { score -= 20; reasoning.push(`Recently contacted ${Math.round(daysSince)}d ago (-20)`) }
            else if (daysSince < 90) { score += 5; reasoning.push(`Last contact ${Math.round(daysSince)}d ago (+5)`) }
        }

        if (identityData.previous_outcomes?.includes('Negative')) {
            score -= 30; reasoning.push('Previous negative outcome (-30)')
        }

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            if (pd.industry_boost && identityData.industry && pd.industry_boost[identityData.industry]) {
                const boost = pd.industry_boost[identityData.industry] * ko.confidence
                score += boost
                reasoning.push(`KB industry pattern "${ko.title}" (+${boost.toFixed(1)})`)
            }
            if (pd.seniority_boost && identityData.seniority && pd.seniority_boost[identityData.seniority]) {
                const boost = pd.seniority_boost[identityData.seniority] * ko.confidence
                score += boost
                reasoning.push(`KB seniority pattern "${ko.title}" (+${boost.toFixed(1)})`)
            }
        }

        let decision: 'CONTACT_NOW' | 'DELAY' | 'SUPPRESS'
        if (score >= 50) decision = 'CONTACT_NOW'
        else if (score >= 20) decision = 'DELAY'
        else decision = 'SUPPRESS'

        const confidence = Math.min(1, Math.max(0, score / 100))

        const result: DecisionResult = {
            decision,
            detail: { score, identity_id: identityId, icp_id: icpId, factors: reasoning },
            confidence,
            reasoning: reasoning.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'contact_eligibility',
            entityId: identityId,
            entityType: 'identity',
            inputs: input,
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
