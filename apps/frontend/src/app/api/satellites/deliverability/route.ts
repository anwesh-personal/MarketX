import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

export async function GET(req: NextRequest) {
    const gate = await requireFeature(req, 'can_manage_satellites')
    if (gate.denied) return gate.response

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
    const orgParam = url.searchParams.get('org_id')
    const daysBack = parseInt(url.searchParams.get('days') ?? '7', 10)
    const targetOrg = me.role === 'superadmin' && orgParam ? orgParam : me.org_id

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - daysBack)
    const sinceStr = sinceDate.toISOString().slice(0, 10)

    const { data: snapshots, error: snapErr } = await supabase
        .from('deliverability_snapshots')
        .select('*')
        .eq('partner_id', targetOrg)
        .gte('snapshot_date', sinceStr)
        .order('snapshot_date', { ascending: false })
    if (snapErr) return NextResponse.json({ error: `Fetch failed: ${snapErr.message}` }, { status: 500 })

    const { data: alerts } = await supabase
        .from('deliverability_alerts')
        .select('*')
        .eq('partner_id', targetOrg)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(50)

    const totals = (snapshots ?? []).reduce((acc, s) => ({
        sends: acc.sends + s.sends,
        deliveries: acc.deliveries + s.deliveries,
        bounces: acc.bounces + s.bounces,
        complaints: acc.complaints + s.complaints,
        opens: acc.opens + s.opens,
        clicks: acc.clicks + s.clicks,
    }), { sends: 0, deliveries: 0, bounces: 0, complaints: 0, opens: 0, clicks: 0 })

    const avgReputation = (snapshots ?? []).length > 0
        ? (snapshots ?? []).reduce((sum, s) => sum + Number(s.reputation_score), 0) / (snapshots ?? []).length
        : 100

    return NextResponse.json({
        period: { from: sinceStr, to: new Date().toISOString().slice(0, 10), days: daysBack },
        summary: {
            ...totals,
            bounce_rate: totals.sends > 0 ? (totals.bounces / totals.sends) : 0,
            complaint_rate: totals.sends > 0 ? (totals.complaints / totals.sends) : 0,
            open_rate: totals.deliveries > 0 ? (totals.opens / totals.deliveries) : 0,
            click_rate: totals.opens > 0 ? (totals.clicks / totals.opens) : 0,
            avg_reputation: Number(avgReputation.toFixed(2)),
        },
        daily_snapshots: snapshots ?? [],
        unacknowledged_alerts: alerts ?? [],
    })
}
