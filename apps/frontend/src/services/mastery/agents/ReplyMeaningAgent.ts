import { MasteryAgentBase, AgentContext, DecisionResult } from '../MasteryAgentBase'

/**
 * Agent 5: Reply Meaning Agent
 * Interprets incoming reply text and classifies intent + recommended action.
 * Goes beyond the 7-label classification to understand nuance.
 * Reads reply_interpretation KB for learned patterns.
 */

const CANONICAL_LABELS = [
    'Interested', 'Clarification', 'Objection', 'Timing',
    'Referral', 'Negative', 'Noise',
] as const

const INTENT_SIGNALS: Record<string, { keywords: string[]; score: number; label: typeof CANONICAL_LABELS[number] }> = {
    strong_interest: {
        keywords: ['yes', 'interested', 'tell me more', 'let\'s talk', 'schedule', 'demo', 'meeting', 'calendar'],
        score: 90,
        label: 'Interested',
    },
    mild_interest: {
        keywords: ['maybe', 'depends', 'send info', 'send details', 'more information', 'pricing'],
        score: 60,
        label: 'Interested',
    },
    clarification: {
        keywords: ['what do you mean', 'how does', 'can you explain', 'what exactly', 'how would', 'clarify'],
        score: 50,
        label: 'Clarification',
    },
    objection: {
        keywords: ['too expensive', 'not in budget', 'already have', 'competitor', 'happy with', 'not a fit'],
        score: 40,
        label: 'Objection',
    },
    timing: {
        keywords: ['not now', 'next quarter', 'reach out later', 'busy right now', 'maybe next', 'circle back'],
        score: 35,
        label: 'Timing',
    },
    referral: {
        keywords: ['talk to', 'contact', 'reach out to', 'better person', 'forward this', 'cc\'d'],
        score: 55,
        label: 'Referral',
    },
    negative: {
        keywords: ['unsubscribe', 'stop', 'remove', 'don\'t contact', 'not interested', 'spam', 'leave me alone'],
        score: 10,
        label: 'Negative',
    },
    noise: {
        keywords: ['out of office', 'ooo', 'automatic reply', 'no longer with', 'left the company', 'vacation'],
        score: 5,
        label: 'Noise',
    },
}

export class ReplyMeaningAgent extends MasteryAgentBase {
    constructor(context: AgentContext) {
        super('reply_meaning', context)
    }

    async execute(input: {
        replyText: string
        beliefId: string
        flowStepId?: string
        senderEmail?: string
        previousReplies?: string[]
    }): Promise<DecisionResult> {
        const start = Date.now()
        const text = input.replyText.toLowerCase().trim()

        const knowledgeObjects = await this.readKnowledge('reply_interpretation', {
            minConfidence: 0.2,
            limit: 10,
        })
        const koIds = knowledgeObjects.map(k => k.id)

        let bestMatch = { label: 'Noise' as string, score: 0, reasons: ['No strong signals detected'] }

        for (const [signalKey, signal] of Object.entries(INTENT_SIGNALS)) {
            let matchCount = 0
            for (const kw of signal.keywords) {
                if (text.includes(kw)) matchCount++
            }
            if (matchCount > 0) {
                const effectiveScore = signal.score + (matchCount - 1) * 5
                if (effectiveScore > bestMatch.score) {
                    bestMatch = {
                        label: signal.label,
                        score: effectiveScore,
                        reasons: [`Matched "${signalKey}" (${matchCount} keyword hits, base score ${signal.score})`],
                    }
                }
            }
        }

        for (const ko of knowledgeObjects) {
            const pd = ko.pattern_data
            if (pd.pattern_regex) {
                try {
                    const re = new RegExp(pd.pattern_regex, 'i')
                    if (re.test(text)) {
                        const kbScore = (pd.score ?? 60) * ko.confidence
                        if (kbScore > bestMatch.score) {
                            bestMatch = {
                                label: pd.label ?? bestMatch.label,
                                score: kbScore,
                                reasons: [`KB pattern "${ko.title}" matched (score ${kbScore.toFixed(1)})`],
                            }
                        }
                    }
                } catch { /* invalid regex in KB, skip */ }
            }
        }

        let recommendedAction: string
        switch (bestMatch.label) {
            case 'Interested': recommendedAction = 'ESCALATE_TO_BOOKING'; break
            case 'Clarification': recommendedAction = 'SEND_FOLLOW_UP'; break
            case 'Objection': recommendedAction = 'ADDRESS_OBJECTION'; break
            case 'Timing': recommendedAction = 'SCHEDULE_RECONTACT'; break
            case 'Referral': recommendedAction = 'ROUTE_TO_REFERRAL'; break
            case 'Negative': recommendedAction = 'SUPPRESS_CONTACT'; break
            default: recommendedAction = 'LOG_AND_SKIP'; break
        }

        const sentimentScore = bestMatch.score / 100
        const confidence = Math.min(1, Math.max(0.1, sentimentScore))

        const wordCount = text.split(/\s+/).length
        const hasQuestion = text.includes('?')
        const hasName = /\b(hi|hello|hey|dear)\b/.test(text)

        const result: DecisionResult = {
            decision: bestMatch.label,
            detail: {
                label: bestMatch.label,
                recommended_action: recommendedAction,
                sentiment_score: sentimentScore,
                belief_id: input.beliefId,
                flow_step_id: input.flowStepId,
                word_count: wordCount,
                has_question: hasQuestion,
                has_greeting: hasName,
                reply_preview: text.slice(0, 200),
            },
            confidence,
            reasoning: bestMatch.reasons.join('; '),
            knowledgeObjectsUsed: koIds,
        }

        await this.logDecision({
            decisionType: 'reply_classification',
            entityId: input.beliefId,
            entityType: 'belief',
            inputs: { reply_length: text.length, belief_id: input.beliefId },
            result,
            executionTimeMs: Date.now() - start,
        })

        return result
    }
}
