import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ConfidenceRunInput {
    orgId?: string
    lookbackDays?: number
}

function toNum(value: unknown, fallback: number): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

export async function recomputeBeliefConfidence(input: ConfidenceRunInput) {
    const lookbackDays = Math.max(1, Math.min(90, input.lookbackDays ?? 7))
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: cfgRows } = await supabase
        .from('config_table')
        .select('key, value')
        .eq('key', 'confidence_formula_v1')
        .limit(1)

    const weights =
        (cfgRows?.[0]?.value as any)?.weights ??
        {
            booked_call_rate: 0.4,
            positive_reply_rate: 0.3,
            reply_quality: 0.2,
            negative_reply_rate: 0.1,
        }

    let beliefsQuery = supabase
        .from('belief')
        .select('id, partner_id, status')
        .in('status', ['HYP', 'TEST', 'SW', 'IW', 'RW', 'GW'])

    if (input.orgId) beliefsQuery = beliefsQuery.eq('partner_id', input.orgId)

    const { data: beliefs, error: beliefsError } = await beliefsQuery
    if (beliefsError) throw beliefsError
    if (!beliefs?.length) return { success: true, beliefsProcessed: 0, lookbackDays }

    const beliefIds = beliefs.map((b) => b.id)
    const { data: events, error: eventsError } = await supabase
        .from('signal_event')
        .select('belief_id, event_type')
        .in('belief_id', beliefIds)
        .gte('occurred_at', since)

    if (eventsError) throw eventsError

    // Load reply classifications from mastery agent (reply_meaning decisions).
    // brain_decisions.input_snapshot contains { beliefId }, decision is one of:
    //   'negative_hard', 'soft_no', 'positive', 'question', 'neutral'
    const negativeDecisions = new Set(['negative_hard', 'soft_no'])
    const positiveDecisions = new Set(['positive', 'question'])

    let replyClassifications = new Map<string, 'positive' | 'negative'>()

    if (input.orgId) {
        const { data: decisions } = await supabase
            .from('brain_decisions')
            .select('decision, input_snapshot')
            .eq('org_id', input.orgId)
            .eq('agent_type', 'reply_meaning')
            .gte('created_at', since)

        if (decisions) {
            for (const d of decisions) {
                const beliefId = (d.input_snapshot as any)?.beliefId
                if (!beliefId) continue
                if (negativeDecisions.has(d.decision)) {
                    replyClassifications.set(beliefId, 'negative')
                } else if (positiveDecisions.has(d.decision)) {
                    replyClassifications.set(beliefId, 'positive')
                }
                // 'neutral' replies are excluded from both counts (no impact on score)
            }
        }
    }

    const counters = new Map<string, { sends: number; positiveReplies: number; negativeReplies: number; bookings: number }>()
    for (const b of beliefs) {
        counters.set(b.id, { sends: 0, positiveReplies: 0, negativeReplies: 0, bookings: 0 })
    }

    for (const e of events ?? []) {
        const entry = counters.get(e.belief_id)
        if (!entry) continue
        if (e.event_type === 'send') entry.sends += 1
        if (e.event_type === 'booking' || e.event_type === 'show') entry.bookings += 1
        if (e.event_type === 'reply') {
            // Use mastery agent classification if available, else default to positive
            // (safe default: most replies to cold outbound are neutral-to-positive)
            const classification = replyClassifications.get(e.belief_id)
            if (classification === 'negative') {
                entry.negativeReplies += 1
            } else {
                entry.positiveReplies += 1
            }
        }
        if (e.event_type === 'bounce' || e.event_type === 'complaint') entry.negativeReplies += 1
    }

    const updates = beliefs.map((belief) => {
        const c = counters.get(belief.id) ?? { sends: 0, positiveReplies: 0, negativeReplies: 0, bookings: 0 }
        const sends = Math.max(1, c.sends)
        const bookedCallRate = c.bookings / sends
        const positiveReplyRate = c.positiveReplies / sends
        const negativeReplyRate = c.negativeReplies / sends

        // Placeholder deterministic proxy until reply quality model is added.
        const replyQuality = c.positiveReplies > 0 ? Math.min(1, positiveReplyRate * 1.2) : 0

        const scoreRaw =
            bookedCallRate * toNum(weights.booked_call_rate, 0.4) +
            positiveReplyRate * toNum(weights.positive_reply_rate, 0.3) +
            replyQuality * toNum(weights.reply_quality, 0.2) -
            negativeReplyRate * toNum(weights.negative_reply_rate, 0.1)

        const score = Math.max(0, Math.min(1, scoreRaw))

        return {
            id: belief.id,
            confidence_score: Number(score.toFixed(5)),
            updated_at: new Date().toISOString(),
        }
    })

    for (const row of updates) {
        const { error: updateError } = await supabase
            .from('belief')
            .update({ confidence_score: row.confidence_score, updated_at: row.updated_at })
            .eq('id', row.id)
        if (updateError) {
            console.warn(`[confidence-engine] Failed to update belief ${row.id}: ${updateError.message}`)
        }
    }

    return {
        success: true,
        beliefsProcessed: updates.length,
        lookbackDays,
        since,
    }
}
