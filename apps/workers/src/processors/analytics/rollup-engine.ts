import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RollupInput {
    orgId?: string
    date?: string
}

export async function runDailyRollup(input: RollupInput) {
    const rollupDate = input.date ?? new Date().toISOString().slice(0, 10)

    let beliefQuery = supabase
        .from('belief')
        .select('id, partner_id, status')
        .in('status', ['TEST', 'SW', 'IW', 'RW', 'GW'])
    if (input.orgId) beliefQuery = beliefQuery.eq('partner_id', input.orgId)

    const { data: beliefs, error: bErr } = await beliefQuery
    if (bErr) throw bErr
    if (!beliefs?.length) return { success: true, beliefs_rolled: 0, partners_rolled: 0 }

    const beliefRollups: any[] = []

    for (const belief of beliefs) {
        const { data: signals } = await supabase
            .from('signal_event')
            .select('event_type, metadata')
            .eq('belief_id', belief.id)
            .gte('created_at', `${rollupDate}T00:00:00Z`)
            .lt('created_at', `${rollupDate}T23:59:59Z`)

        const counts: Record<string, number> = {}
        const replyLabels: Record<string, number> = {}
        let revenueCents = 0

        for (const s of (signals ?? [])) {
            counts[s.event_type] = (counts[s.event_type] ?? 0) + 1
            if (s.event_type === 'reply') {
                const label = (s.metadata as any)?.classification ?? 'unknown'
                replyLabels[label] = (replyLabels[label] ?? 0) + 1
            }
            if (s.event_type === 'revenue') {
                revenueCents += Number((s.metadata as any)?.amount_cents ?? 0)
            }
        }

        const sends = counts['send'] ?? 0
        beliefRollups.push({
            partner_id: belief.partner_id,
            belief_id: belief.id,
            rollup_date: rollupDate,
            sends,
            deliveries: sends - (counts['bounce'] ?? 0),
            bounces: counts['bounce'] ?? 0,
            complaints: counts['complaint'] ?? 0,
            opens: counts['open'] ?? 0,
            clicks: counts['click'] ?? 0,
            replies: counts['reply'] ?? 0,
            replies_interested: replyLabels['Interested'] ?? 0,
            replies_clarification: replyLabels['Clarification'] ?? 0,
            replies_objection: replyLabels['Objection'] ?? 0,
            replies_timing: replyLabels['Timing'] ?? 0,
            replies_referral: replyLabels['Referral'] ?? 0,
            replies_negative: replyLabels['Negative'] ?? 0,
            replies_noise: replyLabels['Noise'] ?? 0,
            bookings: counts['booking'] ?? 0,
            shows: counts['show'] ?? 0,
            revenue_cents: revenueCents,
        })
    }

    if (beliefRollups.length > 0) {
        const { error: upsertErr } = await supabase
            .from('belief_daily_rollup')
            .upsert(beliefRollups, { onConflict: 'belief_id,rollup_date' })
        if (upsertErr) throw upsertErr
    }

    const partnerMap: Record<string, any> = {}
    for (const br of beliefRollups) {
        if (!partnerMap[br.partner_id]) {
            partnerMap[br.partner_id] = {
                partner_id: br.partner_id, rollup_date: rollupDate,
                total_sends: 0, total_deliveries: 0, total_bounces: 0, total_complaints: 0,
                total_opens: 0, total_clicks: 0, total_replies: 0,
                total_bookings: 0, total_shows: 0, total_revenue_cents: 0,
                active_beliefs: 0, active_satellites: 0,
            }
        }
        const p = partnerMap[br.partner_id]
        p.total_sends += br.sends
        p.total_deliveries += br.deliveries
        p.total_bounces += br.bounces
        p.total_complaints += br.complaints
        p.total_opens += br.opens
        p.total_clicks += br.clicks
        p.total_replies += br.replies
        p.total_bookings += br.bookings
        p.total_shows += br.shows
        p.total_revenue_cents += br.revenue_cents
        p.active_beliefs++
    }

    for (const pid of Object.keys(partnerMap)) {
        const { data: sats } = await supabase
            .from('sending_satellites')
            .select('id')
            .eq('partner_id', pid)
            .eq('is_active', true)
        partnerMap[pid].active_satellites = sats?.length ?? 0
    }

    const partnerRollups = Object.values(partnerMap)
    if (partnerRollups.length > 0) {
        const { error: pErr } = await supabase
            .from('partner_daily_rollup')
            .upsert(partnerRollups, { onConflict: 'partner_id,rollup_date' })
        if (pErr) throw pErr
    }

    return {
        success: true,
        rollup_date: rollupDate,
        beliefs_rolled: beliefRollups.length,
        partners_rolled: partnerRollups.length,
    }
}
