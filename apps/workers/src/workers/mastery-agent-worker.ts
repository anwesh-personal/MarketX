/**
 * MASTERY AGENT WORKER
 * ====================
 * Processes Mastery Agent decisions asynchronously via BullMQ.
 *
 * Previously Mastery Agents ran synchronously inside BrainOrchestrator,
 * blocking the response. This worker decouples them:
 *
 *   BrainOrchestrator → queue job → return response immediately
 *                              ↓
 *                   mastery-agent-worker picks up
 *                              ↓
 *              Runs the appropriate agent (AngleSelection,
 *              BuyerStage, TimingWindow, etc.)
 *                              ↓
 *              Writes result to brain_decisions table
 *              Updates brain_beliefs if confidence changed
 *
 * 9 Agent Types:
 *   angle_selection      - Which belief angle to use for ICP + offer
 *   buyer_stage          - Where buyer is in the funnel
 *   buying_role          - Role in the buying committee
 *   contact_decision     - Whether to contact this person
 *   reply_meaning        - Interpret incoming email reply
 *   send_pacing          - How fast / slow to send
 *   sequence_progression - Next step in email sequence
 *   timing_window        - Best time to send
 *   uncertainty_resolution - Resolve ambiguous signals
 */

import { Worker, Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { QueueName, getRedisConnectionOptions } from '../config/queues'

// ============================================================================
// TYPES
// ============================================================================

export type MasteryAgentType =
    | 'angle_selection'
    | 'buyer_stage'
    | 'buying_role'
    | 'contact_decision'
    | 'reply_meaning'
    | 'send_pacing'
    | 'sequence_progression'
    | 'timing_window'
    | 'uncertainty_resolution'

export interface MasteryAgentJob {
    agentType: MasteryAgentType
    orgId: string
    userId?: string
    conversationId?: string
    executionId?: string
    /** Input payload specific to the agent type */
    input: Record<string, unknown>
    /** Where to write the result */
    callbackTable?: string
    callbackRowId?: string
}

export interface MasteryAgentResult {
    agentType: MasteryAgentType
    orgId: string
    decision: string
    confidence: number
    reasoning: string
    metadata: Record<string, unknown>
    durationMs: number
}

// ============================================================================
// SUPABASE
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ [MasteryAgentWorker] Missing Supabase env vars')
}

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null

// ============================================================================
// PROCESSOR
// ============================================================================

async function processMasteryAgentJob(job: Job<MasteryAgentJob>): Promise<MasteryAgentResult> {
    const { agentType, orgId, userId, conversationId, executionId, input } = job.data
    const startTime = Date.now()

    console.log(`🎯 [MasteryAgent] ${agentType} for org=${orgId}`)

    try {
        // Load agent config from DB
        const agentConfig = await loadAgentConfig(agentType, orgId)

        // Run the decision logic
        const result = await runAgentDecision(agentType, input, agentConfig, orgId)

        const durationMs = Date.now() - startTime

        // Save decision to brain_decisions table
        if (supabase) {
            await supabase.from('brain_decisions').insert({
                org_id:          orgId,
                user_id:         userId     || null,
                conversation_id: conversationId || null,
                execution_id:    executionId   || null,
                agent_type:      agentType,
                decision:        result.decision,
                confidence:      result.confidence,
                reasoning:       result.reasoning,
                input_snapshot:  input,
                duration_ms:     durationMs,
                created_at:      new Date().toISOString(),
            }).then(({ error }) => {
                if (error) console.warn(`[MasteryAgent] brain_decisions insert failed:`, error.message)
            })

            // Update belief confidence if this was a belief-related decision
            if (result.beliefId && result.confidenceDelta) {
                await supabase.rpc('update_belief_confidence', {
                    p_belief_id:       result.beliefId,
                    p_org_id:          orgId,
                    p_confidence_delta: result.confidenceDelta,
                }).then(({ error }) => {
                    if (error) console.warn(`[MasteryAgent] belief update failed:`, error.message)
                })
            }
        }

        console.log(`✅ [MasteryAgent] ${agentType} done: "${result.decision}" (${result.confidence.toFixed(2)} confidence, ${durationMs}ms)`)

        return {
            agentType,
            orgId,
            decision:   result.decision,
            confidence: result.confidence,
            reasoning:  result.reasoning,
            metadata:   result.metadata || {},
            durationMs,
        }
    } catch (error: any) {
        console.error(`❌ [MasteryAgent] ${agentType} failed:`, error.message)
        throw error
    }
}

// ============================================================================
// AGENT DECISION LOGIC
// ============================================================================

async function loadAgentConfig(agentType: MasteryAgentType, orgId: string) {
    if (!supabase) return null
    const { data } = await supabase
        .from('mastery_agent_configs')
        .select('*')
        .eq('agent_type', agentType)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .limit(1)
        .single()
    return data
}

async function runAgentDecision(
    agentType: MasteryAgentType,
    input: Record<string, unknown>,
    config: any,
    orgId: string
): Promise<{
    decision: string
    confidence: number
    reasoning: string
    beliefId?: string
    confidenceDelta?: number
    metadata?: Record<string, unknown>
}> {
    // Load relevant KB context for this agent
    const kbContext = supabase ? await loadKBContext(agentType, orgId) : []

    switch (agentType) {
        case 'angle_selection':
            return resolveAngleSelection(input, kbContext, config)
        case 'buyer_stage':
            return resolveBuyerStage(input, kbContext, config)
        case 'buying_role':
            return resolveBuyingRole(input, kbContext, config)
        case 'contact_decision':
            return resolveContactDecision(input, kbContext, config)
        case 'reply_meaning':
            return resolveReplyMeaning(input, kbContext, config)
        case 'send_pacing':
            return resolveSendPacing(input, kbContext, config)
        case 'sequence_progression':
            return resolveSequenceProgression(input, kbContext, config)
        case 'timing_window':
            return resolveTimingWindow(input, kbContext, config)
        case 'uncertainty_resolution':
            return resolveUncertainty(input, kbContext, config)
        default:
            throw new Error(`Unknown mastery agent type: ${agentType}`)
    }
}

async function loadKBContext(agentType: MasteryAgentType, orgId: string): Promise<any[]> {
    if (!supabase) return []
    const typeMap: Record<MasteryAgentType, string> = {
        angle_selection:       'angle',
        buyer_stage:           'buyer_stage',
        buying_role:           'buying_role',
        contact_decision:      'contact',
        reply_meaning:         'reply_pattern',
        send_pacing:           'send_timing',
        sequence_progression:  'sequence',
        timing_window:         'timing',
        uncertainty_resolution: 'signal',
    }
    const { data } = await supabase
        .from('brain_knowledge_items')
        .select('content, confidence, metadata')
        .eq('org_id', orgId)
        .eq('object_type', typeMap[agentType])
        .gte('confidence', 0.5)
        .order('confidence', { ascending: false })
        .limit(10)
    return data ?? []
}

// ─── Individual Agent Resolvers ───────────────────────────────────────────────
// Each resolver reads KB context + input and makes a deterministic decision.
// No LLM calls — these are rule-based + KB-confidence weighted decisions.

function resolveAngleSelection(input: any, kb: any[], config: any) {
    const angles: any[] = input.availableAngles || []
    if (!angles.length) return { decision: 'no_angles', confidence: 0, reasoning: 'No angles provided' }
    // Find KB-backed angle with highest confidence
    const backed = angles.find(a => kb.some(k => k.content?.includes(a.angle_key)))
    const best = backed || angles[0]
    return {
        decision:   best.angle_key || best.id,
        confidence: backed ? 0.78 : 0.50,
        reasoning:  backed ? `KB evidence supports angle "${best.angle_key}"` : 'Defaulting to first available angle',
        metadata:   { selectedAngle: best },
    }
}

function resolveBuyerStage(input: any, kb: any[], config: any) {
    const signals: string[] = input.recentSignals || []
    const hasReply     = signals.includes('reply')
    const hasClick     = signals.includes('click')
    const hasBooking   = signals.includes('booking')

    if (hasBooking) return { decision: 'decision', confidence: 0.92, reasoning: 'Booking signal detected', metadata: {} }
    if (hasReply)   return { decision: 'consideration', confidence: 0.82, reasoning: 'Reply signal — engaged prospect', metadata: {} }
    if (hasClick)   return { decision: 'awareness', confidence: 0.65, reasoning: 'Click signal — early interest', metadata: {} }
    return { decision: 'unaware', confidence: 0.55, reasoning: 'No engagement signals', metadata: {} }
}

function resolveBuyingRole(input: any, kb: any[], config: any) {
    const title = String(input.jobTitle || '').toLowerCase()
    if (/ceo|cto|cfo|founder|owner|president/.test(title))     return { decision: 'economic_buyer', confidence: 0.88, reasoning: 'C-suite title', metadata: {} }
    if (/vp|director|head of|manager/.test(title))              return { decision: 'champion', confidence: 0.75, reasoning: 'Director-level — likely champion', metadata: {} }
    if (/analyst|specialist|coordinator/.test(title))           return { decision: 'influencer', confidence: 0.65, reasoning: 'Individual contributor', metadata: {} }
    return { decision: 'unknown', confidence: 0.40, reasoning: 'Title not recognized', metadata: {} }
}

function resolveContactDecision(input: any, kb: any[], config: any) {
    const bounced   = input.hasBounced   === true
    const complained = input.hasComplained === true
    const unsubbed  = input.hasUnsubscribed === true
    if (bounced || complained || unsubbed)
        return { decision: 'do_not_contact', confidence: 0.98, reasoning: 'Hard block signal present', metadata: {} }
    const daysSince = Number(input.daysSinceLastContact || 0)
    if (daysSince < 3)
        return { decision: 'wait', confidence: 0.80, reasoning: 'Contacted recently, wait for spacing', metadata: {} }
    return { decision: 'contact', confidence: 0.72, reasoning: 'No blocking signals, spacing OK', metadata: {} }
}

function resolveReplyMeaning(input: any, kb: any[], config: any) {
    const body = String(input.replyBody || '').toLowerCase()
    if (/not interested|unsubscribe|remove me|stop/.test(body)) return { decision: 'negative_hard', confidence: 0.95, reasoning: 'Explicit rejection', metadata: {} }
    if (/maybe|perhaps|not right now|later/.test(body))          return { decision: 'soft_no', confidence: 0.78, reasoning: 'Soft deferral', metadata: {} }
    if (/yes|interested|tell me more|sounds good|let.s/.test(body)) return { decision: 'positive', confidence: 0.90, reasoning: 'Positive intent signal', metadata: {} }
    if (/when|how|what|who|price|cost/.test(body))               return { decision: 'question', confidence: 0.82, reasoning: 'Prospect asking questions', metadata: {} }
    return { decision: 'neutral', confidence: 0.50, reasoning: 'Intent unclear', metadata: {} }
}

function resolveSendPacing(input: any, kb: any[], config: any) {
    const bounceRate = Number(input.orgBounceRate || 0)
    const replyRate  = Number(input.orgReplyRate  || 0)
    if (bounceRate > 0.05) return { decision: 'slow_down', confidence: 0.88, reasoning: 'Bounce rate too high', metadata: { recommendedDailyLimit: 50 } }
    if (replyRate  > 0.10) return { decision: 'maintain', confidence: 0.80, reasoning: 'Strong reply rate, maintain pace', metadata: {} }
    return { decision: 'can_increase', confidence: 0.65, reasoning: 'Low bounce, room to scale', metadata: { recommendedDailyLimit: 200 } }
}

function resolveSequenceProgression(input: any, kb: any[], config: any) {
    const step = Number(input.currentStep || 1)
    const hasReplied = input.hasReplied === true
    const hasClicked = input.hasClicked === true
    if (hasReplied) return { decision: 'exit_sequence', confidence: 0.95, reasoning: 'Prospect replied — exit automated sequence', metadata: {} }
    if (step >= 5)  return { decision: 'end_sequence', confidence: 0.88, reasoning: 'Max steps reached', metadata: {} }
    if (hasClicked) return { decision: 'send_next_engaged', confidence: 0.80, reasoning: 'Clicked — send engagement-focused next step', metadata: {} }
    return { decision: 'send_next_standard', confidence: 0.70, reasoning: 'Continue standard sequence', metadata: {} }
}

function resolveTimingWindow(input: any, kb: any[], config: any) {
    const tz   = String(input.prospectTimezone || 'UTC')
    const hour = new Date().getUTCHours()
    // Best windows: 8–10am and 2–4pm prospect local time
    const isGoodHour = (hour >= 8 && hour <= 10) || (hour >= 14 && hour <= 16)
    const isWeekend  = [0, 6].includes(new Date().getUTCDay())
    if (isWeekend)   return { decision: 'wait_weekday', confidence: 0.90, reasoning: 'Weekend — wait for weekday', metadata: {} }
    if (isGoodHour)  return { decision: 'send_now', confidence: 0.82, reasoning: 'Within optimal send window', metadata: { timezone: tz } }
    return { decision: 'schedule_next_window', confidence: 0.75, reasoning: 'Outside optimal window — schedule for next', metadata: {} }
}

function resolveUncertainty(input: any, kb: any[], config: any) {
    const signals: string[] = input.conflictingSignals || []
    if (signals.length === 0) return { decision: 'no_conflict', confidence: 0.90, reasoning: 'No conflicting signals found', metadata: {} }
    const dominant = signals[0]
    return {
        decision:   `resolve_${dominant}`,
        confidence: 0.60,
        reasoning:  `Multiple signals present. Resolving toward "${dominant}" as dominant signal.`,
        metadata:   { allSignals: signals },
    }
}

// ============================================================================
// WORKER SETUP
// ============================================================================

const worker = new Worker<MasteryAgentJob, MasteryAgentResult>(
    QueueName.MASTERY_AGENT,
    processMasteryAgentJob,
    {
        connection: getRedisConnectionOptions(),
        concurrency: 8,
        limiter: { max: 50, duration: 60000 },
    }
)

worker.on('completed', (job, result) => {
    console.log(`✅ [MasteryAgent] Job ${job.id}: ${result.agentType} → "${result.decision}" (${result.confidence.toFixed(2)})`)
})

worker.on('failed', (job, err) => {
    console.error(`❌ [MasteryAgent] Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
    console.error('[MasteryAgent] Worker error:', err)
})

worker.on('ready', () => {
    console.log(`🎯 Mastery Agent Worker ready (queue: ${QueueName.MASTERY_AGENT}, concurrency: 8)`)
})

export { worker as masteryAgentWorker }
export default worker
