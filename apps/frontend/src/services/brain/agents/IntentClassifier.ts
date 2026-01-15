import { createClient } from '@/lib/supabase/server'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type Intent = 'writer' | 'analyst' | 'coach' | 'generalist'

export interface IntentClassificationResult {
    intent: Intent
    confidence: number
    method: 'pattern' | 'llm'
    matchedPattern?: string
}

// ============================================================
// INTENT CLASSIFIER SERVICE
// ============================================================

export class IntentClassifier {
    private supabase = createClient()

    /**
     * Classify user intent to route to appropriate agent
     * Uses pattern matching first (fast), falls back to LLM (accurate)
     */
    async classify(input: string, providerId?: string): Promise<IntentClassificationResult> {
        // Try pattern matching first (fast, no API cost)
        const patternMatch = await this.patternMatching(input)

        if (patternMatch) {
            return {
                intent: patternMatch.intent,
                confidence: patternMatch.confidence,
                method: 'pattern',
                matchedPattern: patternMatch.pattern
            }
        }

        // Fall back to LLM classification (accurate but slower)
        if (providerId) {
            const llmResult = await this.llmClassification(input, providerId)
            return {
                ...llmResult,
                method: 'llm'
            }
        }

        // Ultimate fallback to generalist
        return {
            intent: 'generalist',
            confidence: 0.5,
            method: 'pattern'
        }
    }

    /**
     * Fast pattern-based classification using database patterns
     */
    private async patternMatching(input: string): Promise<{
        intent: Intent
        confidence: number
        pattern: string
    } | null> {
        const { data: patterns, error } = await this.supabase
            .from('intent_patterns')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false })

        if (error || !patterns) {
            return null
        }

        const lowerInput = input.toLowerCase()

        // Score each agent type
        const scores: Record<string, { score: number, patterns: string[] }> = {}

        for (const pattern of patterns) {
            const agentType = pattern.agent_type

            if (!scores[agentType]) {
                scores[agentType] = { score: 0, patterns: [] }
            }

            // Check keywords
            let matchedKeywords = 0
            for (const keyword of pattern.keywords) {
                if (lowerInput.includes(keyword.toLowerCase())) {
                    matchedKeywords++
                    scores[agentType].patterns.push(keyword)
                }
            }

            // Add score based on matched keywords and priority
            scores[agentType].score += matchedKeywords * pattern.priority

            // Check regex if present
            if (pattern.regex_pattern) {
                try {
                    const regex = new RegExp(pattern.regex_pattern, 'i')
                    if (regex.test(input)) {
                        scores[agentType].score += pattern.priority * 2
                        scores[agentType].patterns.push('regex')
                    }
                } catch (e) {
                    // Invalid regex, skip
                }
            }
        }

        // Find highest scoring agent
        let maxScore = 0
        let bestIntent: Intent = 'generalist'
        let bestPatterns: string[] = []

        for (const [agentType, { score, patterns: matchedPatterns }] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score
                bestIntent = agentType as Intent
                bestPatterns = matchedPatterns
            }
        }

        // Require minimum score to avoid false positives
        if (maxScore < 5) {
            return null
        }

        // Calculate confidence based on score
        const confidence = Math.min(maxScore / 50, 1.0)

        return {
            intent: bestIntent,
            confidence,
            pattern: bestPatterns.join(', ')
        }
    }

    /**
     * LLM-based classification for complex queries
     */
    private async llmClassification(
        input: string,
        providerId: string
    ): Promise<{ intent: Intent, confidence: number }> {
        try {
            // Get provider config
            const { data: provider } = await this.supabase
                .from('ai_providers')
                .select('*')
                .eq('id', providerId)
                .single()

            if (!provider) {
                return { intent: 'generalist', confidence: 0.5 }
            }

            // Call LLM for classification
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.api_key}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{
                        role: 'system',
                        content: `Classify the user's intent into one of these categories:

**writer**: Content creation, writing, drafting, editing, blog posts, articles, copy
**analyst**: Data analysis, metrics, statistics, SQL queries, reports, trends
**coach**: Goal setting, habits, productivity, motivation, personal growth, planning
**generalist**: General questions, explanations, chat, Q&A

Respond with ONLY a JSON object in this format:
{"intent": "writer|analyst|coach|generalist", "confidence": 0.0-1.0}`
                    }, {
                        role: 'user',
                        content: input
                    }],
                    temperature: 0.0,
                    max_tokens: 50
                })
            })

            if (!response.ok) {
                throw new Error('LLM classification failed')
            }

            const result = await response.json()
            const content = result.choices[0].message.content?.trim()

            // Parse JSON response
            const parsed = JSON.parse(content || '{"intent": "generalist", "confidence": 0.5}')

            // Validate intent
            const validIntents: Intent[] = ['writer', 'analyst', 'coach', 'generalist']
            const intent = validIntents.includes(parsed.intent) ? parsed.intent : 'generalist'
            const confidence = typeof parsed.confidence === 'number'
                ? Math.max(0, Math.min(1, parsed.confidence))
                : 0.5

            return { intent, confidence }
        } catch (error) {
            console.error('LLM classification failed:', error)
            return { intent: 'generalist', confidence: 0.5 }
        }
    }

    /**
     * Batch classify multiple queries (for analytics)
     */
    async batchClassify(
        inputs: string[],
        providerId?: string
    ): Promise<IntentClassificationResult[]> {
        const results = await Promise.all(
            inputs.map(input => this.classify(input, providerId))
        )

        return results
    }

    /**
     * Get classification statistics for learning loop
     */
    async getClassificationStats(
        orgId: string,
        days: number = 30
    ): Promise<any> {
        // This would query actual classification logs
        // For now, return structure
        return {
            totalClassifications: 0,
            byIntent: {
                writer: 0,
                analyst: 0,
                coach: 0,
                generalist: 0
            },
            avgConfidence: 0,
            patternMatchRate: 0,
            llmFallbackRate: 0
        }
    }

    /**
     * Add custom intent pattern (for org-specific routing)
     */
    async addPattern(
        agentType: Intent,
        keywords: string[],
        regexPattern?: string,
        priority: number = 10
    ): Promise<void> {
        const { error } = await this.supabase
            .from('intent_patterns')
            .insert({
                agent_type: agentType,
                keywords,
                regex_pattern: regexPattern,
                priority,
                is_active: true
            })

        if (error) {
            console.error('Failed to add intent pattern:', error)
            throw new Error(`Failed to add pattern: ${error.message}`)
        }
    }

    /**
     * Update pattern priority based on performance
     * (Called by learning loop)
     */
    async updatePatternPriority(
        patternId: string,
        newPriority: number
    ): Promise<void> {
        const { error } = await this.supabase
            .from('intent_patterns')
            .update({ priority: newPriority })
            .eq('id', patternId)

        if (error) {
            console.error('Failed to update pattern priority:', error)
        }
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const intentClassifier = new IntentClassifier()
