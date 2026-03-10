import { SupabaseClient } from '@supabase/supabase-js'

export interface AgentConfig {
    id: string
    agent_key: string
    display_name: string
    decision_type: string
    decision_outputs: string[]
    scoring_rules: ScoringRule[]
    keyword_rules: KeywordRule[]
    field_rules: FieldRule[]
    kb_object_types: string[]
    kb_min_confidence: number
    kb_max_objects: number
    kb_write_enabled: boolean
    kb_write_type: string | null
    locked_constraints: Record<string, any>
    fallback_output: string | null
    confidence_divisor: number
    max_execution_ms: number
}

interface ScoringRule {
    name: string
    condition: { field: string; op: string; value: any }
    action: 'boost' | 'penalize' | 'set'
    target: string
    value: number
    reasoning_template?: string
}

interface KeywordRule {
    keywords: string[]
    target_output: string
    score: number
    category?: string
}

interface FieldRule {
    input_field: string
    mapping: Record<string, { output: string; score: number }>
}

export interface DynamicDecisionResult {
    decision: string
    detail: Record<string, any>
    confidence: number
    reasoning: string
    knowledgeObjectsUsed: string[]
    agent_config_id: string
}

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj)
}

function evaluateCondition(input: Record<string, any>, condition: { field: string; op: string; value: any }): boolean {
    const actual = getNestedValue(input, condition.field)
    if (actual === undefined || actual === null) return false

    switch (condition.op) {
        case '==': return actual === condition.value
        case '!=': return actual !== condition.value
        case '>': return Number(actual) > Number(condition.value)
        case '>=': return Number(actual) >= Number(condition.value)
        case '<': return Number(actual) < Number(condition.value)
        case '<=': return Number(actual) <= Number(condition.value)
        case 'contains':
            if (Array.isArray(actual)) return actual.includes(condition.value)
            if (typeof actual === 'string') return actual.includes(condition.value)
            return false
        case 'not_contains':
            if (Array.isArray(actual)) return !actual.includes(condition.value)
            if (typeof actual === 'string') return !actual.includes(condition.value)
            return true
        case 'in': return Array.isArray(condition.value) && condition.value.includes(actual)
        case 'exists': return actual !== undefined && actual !== null
        default: return false
    }
}

export class DynamicAgentExecutor {
    private supabase: SupabaseClient
    private partnerId: string

    constructor(supabase: SupabaseClient, partnerId: string) {
        this.supabase = supabase
        this.partnerId = partnerId
    }

    async loadConfig(agentKey: string): Promise<AgentConfig | null> {
        const { data: orgConfig } = await this.supabase
            .from('mastery_agent_configs')
            .select('*')
            .eq('agent_key', agentKey)
            .eq('partner_id', this.partnerId)
            .eq('is_active', true)
            .limit(1)
            .single()

        if (orgConfig) return orgConfig as AgentConfig

        const { data: globalConfig } = await this.supabase
            .from('mastery_agent_configs')
            .select('*')
            .eq('agent_key', agentKey)
            .eq('scope', 'global')
            .eq('is_active', true)
            .limit(1)
            .single()

        return globalConfig as AgentConfig | null
    }

    async execute(agentKey: string, input: Record<string, any>): Promise<DynamicDecisionResult> {
        const config = await this.loadConfig(agentKey)
        if (!config) throw new Error(`No active config found for agent "${agentKey}"`)

        const start = Date.now()
        const scores: Record<string, number> = {}
        for (const output of config.decision_outputs) scores[output] = 0
        const reasoning: string[] = []

        for (const rule of config.scoring_rules) {
            if (evaluateCondition(input, rule.condition)) {
                const template = rule.reasoning_template ?? `Rule "${rule.name}" fired`
                const msg = template.replace(/{(\w+)}/g, (_, key) => {
                    if (key === 'value') return String(getNestedValue(input, rule.condition.field) ?? rule.value)
                    return String(getNestedValue(input, key) ?? key)
                })

                switch (rule.action) {
                    case 'boost':
                        scores[rule.target] = (scores[rule.target] ?? 0) + rule.value
                        reasoning.push(msg)
                        break
                    case 'penalize':
                        scores[rule.target] = (scores[rule.target] ?? 0) - rule.value
                        reasoning.push(msg)
                        break
                    case 'set':
                        scores[rule.target] = rule.value
                        reasoning.push(msg)
                        break
                }
            }
        }

        for (const rule of config.field_rules) {
            const fieldValue = getNestedValue(input, rule.input_field)
            if (fieldValue && rule.mapping[fieldValue]) {
                const { output, score } = rule.mapping[fieldValue]
                scores[output] = (scores[output] ?? 0) + score
                reasoning.push(`Field "${rule.input_field}"="${fieldValue}" → ${output} (+${score})`)
            }
        }

        if (config.keyword_rules.length > 0) {
            const textFields = ['replyText', 'reply_text', 'text', 'body', 'message']
            let text = ''
            for (const f of textFields) {
                if (input[f] && typeof input[f] === 'string') { text = input[f].toLowerCase(); break }
            }

            if (text) {
                for (const rule of config.keyword_rules) {
                    let matchCount = 0
                    for (const kw of rule.keywords) {
                        if (text.includes(kw.toLowerCase())) matchCount++
                    }
                    if (matchCount > 0) {
                        const effectiveScore = rule.score + (matchCount - 1) * 5
                        scores[rule.target_output] = (scores[rule.target_output] ?? 0) + effectiveScore
                        reasoning.push(`Keywords "${rule.category ?? 'match'}" (${matchCount} hits) → ${rule.target_output} (+${effectiveScore})`)
                    }
                }
            }
        }

        let koIds: string[] = []
        if (config.kb_object_types.length > 0) {
            const { data: localKB } = await this.supabase
                .from('knowledge_object')
                .select('id, pattern_data, confidence, applicable_industries')
                .eq('partner_id', this.partnerId)
                .eq('scope', 'local')
                .in('object_type', config.kb_object_types)
                .gte('confidence', config.kb_min_confidence)
                .eq('promotion_status', 'active')
                .order('confidence', { ascending: false })
                .limit(config.kb_max_objects)

            const { data: globalKB } = await this.supabase
                .from('knowledge_object')
                .select('id, pattern_data, confidence, applicable_industries')
                .eq('scope', 'global')
                .in('object_type', config.kb_object_types)
                .gte('confidence', config.kb_min_confidence)
                .eq('promotion_status', 'active')
                .order('confidence', { ascending: false })
                .limit(config.kb_max_objects)

            const allKO = [...(localKB ?? []), ...(globalKB ?? [])]
            koIds = allKO.map(k => k.id)

            for (const ko of allKO) {
                const pd = ko.pattern_data as Record<string, any>
                for (const [key, val] of Object.entries(pd)) {
                    if (typeof val === 'number' && scores[key] !== undefined) {
                        const boost = val * Number(ko.confidence)
                        scores[key] += boost
                        reasoning.push(`KB pattern (${key}: ${val}) × conf ${ko.confidence} → +${boost.toFixed(1)}`)
                    }
                }
            }
        }

        const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
        const [bestOutput, bestScore] = sorted.length > 0 ? sorted[0] : [config.fallback_output ?? 'unknown', 0]
        const confidence = Math.min(1, Math.max(0, bestScore / config.confidence_divisor))

        const result: DynamicDecisionResult = {
            decision: bestOutput,
            detail: {
                all_scores: Object.fromEntries(sorted),
                agent_key: agentKey,
                agent_config_id: config.id,
            },
            confidence,
            reasoning: reasoning.join('; ') || 'No rules matched',
            knowledgeObjectsUsed: koIds,
            agent_config_id: config.id,
        }

        await this.supabase.from('agent_decision_log').insert({
            partner_id: this.partnerId,
            agent_type: agentKey,
            agent_version: (config as any).version ?? '1.0',
            decision_type: config.decision_type,
            inputs: input,
            knowledge_objects_used: koIds,
            decision: result.decision,
            decision_detail: result.detail,
            confidence: result.confidence,
            reasoning: result.reasoning,
            locked_constraints: config.locked_constraints,
            execution_time_ms: Date.now() - start,
        })

        return result
    }
}
