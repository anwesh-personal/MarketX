import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const url = new URL(req.url)
    const days = parseInt(url.searchParams.get('days') ?? '14', 10)
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const beliefId = url.searchParams.get('belief_id')

    if (beliefId) {
        const { data: belief } = await supabase
            .from('belief')
            .select('id, partner_id, brief_id, angle, statement, lane, status, confidence_score, allocation_weight')
            .eq('id', beliefId).eq('partner_id', me.org_id).single()
        if (!belief) return NextResponse.json({ error: 'Belief not found' }, { status: 404 })

        const { data: rollups } = await supabase
            .from('belief_daily_rollup')
            .select('*').eq('belief_id', beliefId).gte('rollup_date', sinceDate)
            .order('rollup_date', { ascending: true })

        const { data: promotionLogs } = await supabase
            .from('belief_promotion_log')
            .select('from_status, to_status, reason, created_at')
            .eq('belief_id', beliefId).order('created_at', { ascending: false }).limit(10)

        return NextResponse.json({ belief, daily_rollups: rollups ?? [], promotion_history: promotionLogs ?? [] })
    }

    const { data: beliefs } = await supabase
        .from('belief')
        .select('id, angle, statement, lane, status, confidence_score, allocation_weight, updated_at')
        .eq('partner_id', me.org_id)
        .in('status', ['TEST', 'SW', 'IW', 'RW', 'GW'])
        .order('confidence_score', { ascending: false })

    const beliefIds = (beliefs ?? []).map(b => b.id)

    const { data: rollups } = beliefIds.length > 0
        ? await supabase
            .from('belief_daily_rollup')
            .select('belief_id, sends, replies, bookings, rollup_date')
            .in('belief_id', beliefIds)
            .gte('rollup_date', sinceDate)
        : { data: [] }

    const beliefSummaries = (beliefs ?? []).map(b => {
        const bRollups = (rollups ?? []).filter(r => r.belief_id === b.id)
        return {
            ...b,
            period_sends: bRollups.reduce((s, r) => s + r.sends, 0),
            period_replies: bRollups.reduce((s, r) => s + r.replies, 0),
            period_bookings: bRollups.reduce((s, r) => s + r.bookings, 0),
        }
    })

    return NextResponse.json({ beliefs: beliefSummaries })
}
