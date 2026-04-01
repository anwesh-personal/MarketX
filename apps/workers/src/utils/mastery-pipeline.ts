/**
 * MASTERY PIPELINE — INLINE EXECUTION
 * ====================================
 * Runs mastery agent scoring INLINE during engine execution.
 * NOT queued — these are rule-based, sub-100ms per agent.
 *
 * For pre_send and post_reply stages that must run synchronously
 * as part of the workflow execution pipeline.
 *
 * Reuses the exact same loadAgentConfig + scoring logic from
 * mastery-agent-worker.ts — just called inline instead of async.
 *
 * Phase 6 of Engine Unification Plan.
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export type PipelineStage = 'pre_send' | 'post_reply'

export interface MasteryDecision {
    agentKey: string
    decisionType: string
    decision: string
    confidence: number
    reasoning: string
    metadata: Record<string, unknown>
    durationMs: number
}

export interface MasteryPipelineResult {
    stage: PipelineStage
    decisions: MasteryDecision[]
    enrichedInput: Record<string, any>
    totalDurationMs: number
}

// ============================================================================
// SUPABASE
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null

// ============================================================================
// PIPELINE EXECUTOR
// ============================================================================

/**
 * Run all active mastery agents for a pipeline stage.
 * Results are merged into the input as _mastery_{agent_key} fields.
 */
export async function runMasteryPipeline(
    stage: PipelineStage,
    orgId: string,
    input: Record<string, any>
): Promise<MasteryPipelineResult> {
    const pipelineStart = Date.now()

    if (!supabase) {
        return { stage, decisions: [], enrichedInput: input, totalDurationMs: 0 }
    }

    // Load mastery configs for this stage — org-specific first, then global
    const { data: configs } = await supabase
        .from('mastery_agent_configs')
        .select('*')
        .or(`partner_id.eq.${orgId},scope.eq.global`)
        .eq('pipeline_stage', stage)
        .eq('is_active', true)
        .order('pipeline_order', { ascending: true })

    if (!configs?.length) {
        return { stage, decisions: [], enrichedInput: input, totalDurationMs: Date.now() - pipelineStart }
    }

    // Deduplicate: prefer org-specific over global for the same agent_key
    const dedupedConfigs = deduplicateConfigs(configs, orgId)

    const decisions: MasteryDecision[] = []
    let enrichedInput = { ...input }

    for (const config of dedupedConfigs) {
        const agentStart = Date.now()

        try {
            const result = executeScoring(config, enrichedInput)
            const decision: MasteryDecision = {
                agentKey: config.agent_key,
                decisionType: config.decision_type,
                decision: result.decision,
                confidence: result.confidence,
                reasoning: result.reasoning,
                metadata: result.metadata || {},
                durationMs: Date.now() - agentStart,
            }

            decisions.push(decision)

            // Enrich input for downstream agents/nodes
            enrichedInput[`_mastery_${config.agent_key}`] = decision
        } catch (err: any) {
            console.warn(`[MasteryPipeline] ${config.agent_key} failed: ${err.message}`)
            // Don't block pipeline on individual agent failure
        }
    }

    const totalDurationMs = Date.now() - pipelineStart
    console.log(`🎯 [MasteryPipeline] ${stage}: ${decisions.length} agents, ${totalDurationMs}ms`)

    return { stage, decisions, enrichedInput, totalDurationMs }
}

// ============================================================================
// SCORING ENGINE (rule-based — same logic as mastery-agent-worker)
// ============================================================================

function executeScoring(
    config: any,
    input: Record<string, any>
): { decision: string; confidence: number; reasoning: string; metadata?: Record<string, unknown> } {

    const rules = config.scoring_rules || {}
    const keywordRules = config.keyword_rules || {}
    const fieldRules = config.field_rules || {}

    switch (config.decision_type) {
        case 'angle':
            return scoreAngle(input, rules, keywordRules)
        case 'timing':
            return scoreTiming(input, rules)
        case 'contact':
            return scoreContact(input, rules, fieldRules)
        case 'pacing':
            return scorePacing(input, rules)
        case 'reply':
            return scoreReply(input, keywordRules)
        case 'buying_role':
            return scoreBuyingRole(input, fieldRules)
        case 'buyer_stage':
            return scoreBuyerStage(input, rules)
        case 'sequence':
            return scoreSequence(input, rules)
        case 'uncertainty':
            return scoreUncertainty(input, rules)
        default:
            // Custom decision types — use field_rules for simple scoring
            return scoreGeneric(input, rules, fieldRules)
    }
}

function scoreAngle(input: any, rules: any, keywords: any) {
    const angles = input.writer_input?.angle_class
        ? [input.writer_input.angle_class]
        : (input.availableAngles || []).map((a: any) => a.value || a.angle_key || a)
    const icpPains = String(input.brain_context?.icp?.pain_points || '').toLowerCase()

    // Match keywords against ICP pain points
    let bestAngle = angles[0] || 'direct_value'
    let bestScore = 0.5

    for (const [angleKey, angleKeywords] of Object.entries(keywords)) {
        if (!Array.isArray(angleKeywords)) continue
        const matches = angleKeywords.filter((kw: string) => icpPains.includes(kw.toLowerCase()))
        const score = matches.length / Math.max(angleKeywords.length, 1)
        if (score > bestScore) {
            bestScore = score
            bestAngle = angleKey
        }
    }

    return {
        decision: bestAngle,
        confidence: Math.min(bestScore + 0.3, 0.95),
        reasoning: `Selected "${bestAngle}" based on ICP pain point alignment`,
        metadata: { anglesEvaluated: angles.length },
    }
}

function scoreTiming(input: any, rules: any) {
    const hour = new Date().getUTCHours()
    const day = new Date().getUTCDay()
    const isWeekend = day === 0 || day === 6
    const optimalHours = rules.optimal_hours || [8, 9, 10, 14, 15, 16]
    const isOptimal = optimalHours.includes(hour)

    if (isWeekend) return { decision: 'schedule_weekday', confidence: 0.90, reasoning: 'Weekend detected', metadata: { utcHour: hour } }
    if (isOptimal) return { decision: 'send_now', confidence: 0.85, reasoning: `Hour ${hour} is in optimal window`, metadata: { utcHour: hour } }
    return { decision: 'schedule_optimal', confidence: 0.70, reasoning: `Hour ${hour} outside window, schedule later`, metadata: { utcHour: hour } }
}

function scoreContact(input: any, rules: any, fieldRules: any) {
    if (input.hasBounced || input.hasComplained || input.hasUnsubscribed) {
        return { decision: 'do_not_contact', confidence: 0.98, reasoning: 'Hard block signal' }
    }
    const daysSince = Number(input.daysSinceLastContact || 0)
    const minSpacing = rules.min_spacing_days || 3
    if (daysSince < minSpacing) {
        return { decision: 'wait', confidence: 0.80, reasoning: `Only ${daysSince} days since last contact` }
    }
    return { decision: 'contact', confidence: 0.75, reasoning: 'No blocking signals, spacing OK' }
}

function scorePacing(input: any, rules: any) {
    const bounceRate = Number(input.orgBounceRate || 0)
    const maxBounce = rules.max_bounce_rate || 0.05
    if (bounceRate > maxBounce) {
        return { decision: 'slow_down', confidence: 0.88, reasoning: `Bounce rate ${(bounceRate * 100).toFixed(1)}% exceeds threshold` }
    }
    return { decision: 'maintain', confidence: 0.75, reasoning: 'Bounce rate within tolerance' }
}

function scoreReply(input: any, keywords: any) {
    const body = String(input.replyBody || '').toLowerCase()
    const positiveKw = keywords.positive || ['yes', 'interested', 'tell me more', 'sounds good']
    const negativeKw = keywords.negative || ['not interested', 'unsubscribe', 'remove me', 'stop']

    if (negativeKw.some((kw: string) => body.includes(kw))) return { decision: 'negative', confidence: 0.95, reasoning: 'Explicit rejection detected' }
    if (positiveKw.some((kw: string) => body.includes(kw))) return { decision: 'positive', confidence: 0.90, reasoning: 'Positive intent detected' }
    return { decision: 'neutral', confidence: 0.50, reasoning: 'Intent unclear' }
}

function scoreBuyingRole(input: any, fieldRules: any) {
    const title = String(input.jobTitle || '').toLowerCase()
    const rolePatterns = fieldRules.title_patterns || {
        economic_buyer: ['ceo', 'cto', 'cfo', 'founder', 'owner', 'president'],
        champion: ['vp', 'director', 'head of', 'manager'],
        influencer: ['analyst', 'specialist', 'coordinator'],
    }
    for (const [role, patterns] of Object.entries(rolePatterns)) {
        if ((patterns as string[]).some(p => title.includes(p))) {
            return { decision: role, confidence: 0.80, reasoning: `Title matches ${role} pattern` }
        }
    }
    return { decision: 'unknown', confidence: 0.40, reasoning: 'Title not matched' }
}

function scoreBuyerStage(input: any, rules: any) {
    const signals = input.recentSignals || []
    if (signals.includes('booking')) return { decision: 'decision', confidence: 0.92, reasoning: 'Booking signal' }
    if (signals.includes('reply')) return { decision: 'consideration', confidence: 0.82, reasoning: 'Reply signal' }
    if (signals.includes('click')) return { decision: 'awareness', confidence: 0.65, reasoning: 'Click signal' }
    return { decision: 'unaware', confidence: 0.55, reasoning: 'No signals' }
}

function scoreSequence(input: any, rules: any) {
    const step = Number(input.currentStep || 1)
    const maxSteps = rules.max_steps || 5
    if (input.hasReplied) return { decision: 'exit', confidence: 0.95, reasoning: 'Replied — exit sequence' }
    if (step >= maxSteps) return { decision: 'end', confidence: 0.88, reasoning: 'Max steps reached' }
    return { decision: 'continue', confidence: 0.70, reasoning: `Step ${step}/${maxSteps}` }
}

function scoreUncertainty(input: any, rules: any) {
    const signals = input.conflictingSignals || []
    if (!signals.length) return { decision: 'no_conflict', confidence: 0.90, reasoning: 'Clear signal' }
    return { decision: `resolve_${signals[0]}`, confidence: 0.60, reasoning: `Conflicting: ${signals.join(', ')}` }
}

function scoreGeneric(input: any, rules: any, fieldRules: any) {
    return { decision: 'proceed', confidence: 0.60, reasoning: 'Generic mastery — no specific rules matched' }
}

// ============================================================================
// HELPERS
// ============================================================================

function deduplicateConfigs(configs: any[], orgId: string): any[] {
    const seen = new Map<string, any>()
    for (const c of configs) {
        const existing = seen.get(c.agent_key)
        if (!existing) {
            seen.set(c.agent_key, c)
        } else if (c.partner_id === orgId && existing.partner_id !== orgId) {
            // Org-specific takes priority over global
            seen.set(c.agent_key, c)
        }
    }
    return Array.from(seen.values()).sort((a, b) => (a.pipeline_order || 0) - (b.pipeline_order || 0))
}
