import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 6: Buying Role Agent
 * Classifies the persona/role of a contact in the buying process.
 * Determines: Decision Maker, Influencer, Champion, Gatekeeper, End User, Evaluator
 */

const BUYING_ROLES = [
    'Decision Maker', 'Influencer', 'Champion',
    'Gatekeeper', 'End User', 'Evaluator',
] as const

const SENIORITY_ROLE_MAP: Record<string, { primary: string; confidence: number }> = {
    'C-Suite':    { primary: 'Decision Maker', confidence: 0.8 },
    'VP':         { primary: 'Decision Maker', confidence: 0.7 },
    'Director':   { primary: 'Influencer', confidence: 0.65 },
    'Manager':    { primary: 'Evaluator', confidence: 0.6 },
    'Senior':     { primary: 'Evaluator', confidence: 0.5 },
    'Individual': { primary: 'End User', confidence: 0.5 },
}

const TITLE_KEYWORDS: Record<string, { role: string; boost: number }[]> = {
    'ceo':        [{ role: 'Decision Maker', boost: 30 }],
    'cto':        [{ role: 'Decision Maker', boost: 25 }, { role: 'Evaluator', boost: 10 }],
    'cfo':        [{ role: 'Decision Maker', boost: 20 }],
    'cmo':        [{ role: 'Decision Maker', boost: 20 }],
    'head of':    [{ role: 'Decision Maker', boost: 15 }, { role: 'Influencer', boost: 10 }],
    'director':   [{ role: 'Influencer', boost: 15 }],
    'manager':    [{ role: 'Evaluator', boost: 10 }, { role: 'Champion', boost: 5 }],
    'procurement':[{ role: 'Gatekeeper', boost: 25 }],
    'purchasing': [{ role: 'Gatekeeper', boost: 20 }],
    'analyst':    [{ role: 'Evaluator', boost: 15 }],
    'engineer':   [{ role: 'End User', boost: 10 }, { role: 'Evaluator', boost: 5 }],
    'developer':  [{ role: 'End User', boost: 10 }],
    'operations': [{ role: 'End User', boost: 8 }, { role: 'Champion', boost: 5 }],
}

export class BuyingRoleAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('buying_role', context)
    }

    async execute(input: {
        identityId: string
        seniority?: string
        jobTitle?: string
        department?: string
        industry?: string
        engagementHistory?: { clicks: number; replies: number; forwards: number }
    }): Promise<DecisionResult> {
        const start = Date.now()

        const knowledgeObjects = await this.readKnowledge('contact_pattern', {
            minConfidence: 0.2,
            limit: 8,
        })
        const koIds = knowledgeObjects.map(k => k.id)

        const scores: Record<string, number> = {}
        for (const role of BUYING_ROLES) scores[role] = 0
        const reasoning: string[] = []

        if (input.seniority && SENIORITY_ROLE_MAP[input.seniority]) {
            const map = SENIORITY_ROLE_MAP[input.seniority]
            scores[map.primary] += 30
            reasoning.push(`Seniority "${input.seniority}" → ${map.primary} (+30)`)
        }

        if (input.jobTitle) {
            const titleLower = input.jobTitle.toLowerCase()
            for (const [keyword, boosts] of Object.entries(TITLE_KEYWORDS)) {
                if (titleLower.includes(keyword)) {
                    for (const { role, boost } of boosts) {
                        scores[role] += boost
                        reasoning.push(`Title keyword "${keyword}" → ${role} (+${boost})`)
                    }
                }
            }
        }

        if (input.engagementHistory) {
            const { clicks, replies, forwards } = input.engagementHistory
            if (forwards > 0) {
                scores['Influencer'] += forwards * 10
                scores['Champion'] += forwards * 8
                reasoning.push(`${forwards} forwards → Influencer/Champion boost`)
            }
            if (replies > 2) {
                scores['Champion'] += replies * 5
                reasoning.push(`${replies} replies → Champion boost`)
            }
        }

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            if (pd.role_signals && input.department && pd.role_signals[input.department]) {
                const role = pd.role_signals[input.department]
                scores[role] = (scores[role] ?? 0) + 15 * ko.confidence
                reasoning.push(`KB "${ko.title}": dept "${input.department}" → ${role}`)
            }
        }

        const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
        const [bestRole, bestScore] = sorted[0]
        const confidence = Math.min(1, Math.max(0.1, bestScore / 80))

        const result: DecisionResult = {
            decision: bestRole,
            detail: {
                identity_id: input.identityId,
                all_scores: Object.fromEntries(sorted),
                job_title: input.jobTitle,
                seniority: input.seniority,
                department: input.department,
            },
            confidence,
            reasoning: reasoning.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'buying_role_classification',
            entityId: input.identityId,
            entityType: 'identity',
            inputs: input,
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
