import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const url = new URL(req.url)
    const days = parseInt(url.searchParams.get('days') ?? '30', 10)
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [rollups, beliefs, satellites, latestRollup] = await Promise.all([
        supabase.from('partner_daily_rollup').select('*').eq('partner_id', me.org_id).gte('rollup_date', sinceDate).order('rollup_date', { ascending: true }),
        supabase.from('belief').select('id, status, lane, confidence_score, allocation_weight, angle').eq('partner_id', me.org_id).in('status', ['TEST', 'SW', 'IW', 'RW', 'GW']),
        supabase.from('sending_satellites').select('id, status, is_active, reputation_score, current_daily_sent, daily_send_cap').eq('partner_id', me.org_id),
        supabase.from('partner_daily_rollup').select('*').eq('partner_id', me.org_id).order('rollup_date', { ascending: false }).limit(1).single(),
    ])

    const totals = (rollups.data ?? []).reduce((acc, r) => ({
        sends: acc.sends + r.total_sends,
        deliveries: acc.deliveries + r.total_deliveries,
        bounces: acc.bounces + r.total_bounces,
        opens: acc.opens + r.total_opens,
        clicks: acc.clicks + r.total_clicks,
        replies: acc.replies + r.total_replies,
        bookings: acc.bookings + r.total_bookings,
        shows: acc.shows + r.total_shows,
        revenue_cents: acc.revenue_cents + r.total_revenue_cents,
    }), { sends: 0, deliveries: 0, bounces: 0, opens: 0, clicks: 0, replies: 0, bookings: 0, shows: 0, revenue_cents: 0 })

    const beliefStatusCounts: Record<string, number> = {}
    for (const b of (beliefs.data ?? [])) {
        beliefStatusCounts[b.status] = (beliefStatusCounts[b.status] ?? 0) + 1
    }

    const activeSats = (satellites.data ?? []).filter(s => s.is_active)
    const avgReputation = activeSats.length > 0
        ? activeSats.reduce((s, sat) => s + Number(sat.reputation_score ?? 0), 0) / activeSats.length
        : 0

    return NextResponse.json({
        period: { days, from: sinceDate, to: new Date().toISOString().slice(0, 10) },
        headline: {
            total_sends: totals.sends,
            reply_rate: totals.sends > 0 ? totals.replies / totals.sends : 0,
            booked_calls: totals.bookings,
            show_rate: totals.bookings > 0 ? totals.shows / totals.bookings : 0,
            revenue: totals.revenue_cents / 100,
            revenue_per_1k_sends: totals.sends > 0 ? (totals.revenue_cents / 100) / (totals.sends / 1000) : 0,
        },
        satellites: {
            total: (satellites.data ?? []).length,
            active: activeSats.length,
            avg_reputation: Number(avgReputation.toFixed(2)),
        },
        beliefs: {
            active: (beliefs.data ?? []).length,
            by_status: beliefStatusCounts,
        },
        daily_trend: rollups.data ?? [],
        latest: latestRollup.data ?? null,
    })
}
