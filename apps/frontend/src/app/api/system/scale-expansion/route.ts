import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConfigValues } from '@/lib/platform-config'

export async function POST(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    if (!['admin', 'owner', 'superadmin'].includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: { org_id?: string } = {}
    try { body = await req.json() } catch { /* optional */ }
    const targetOrg = me.role === 'superadmin' && body.org_id ? body.org_id : me.org_id

    const cfg = await getConfigValues(supabase, [
        'deliverability_bounce_rate_warning',
        'domain_max_satellites_per_domain',
    ])
    const maxBounce = Number(cfg['deliverability_bounce_rate_warning'])

    const { data: latestRollup } = await supabase
        .from('partner_daily_rollup')
        .select('*')
        .eq('partner_id', targetOrg)
        .order('rollup_date', { ascending: false })
        .limit(7)

    if (!latestRollup?.length) {
        return NextResponse.json({ expanded: false, reason: 'No rollup data available' })
    }

    const avgBounce = latestRollup.reduce((s, r) => s + Number(r.bounce_rate), 0) / latestRollup.length
    const avgReply = latestRollup.reduce((s, r) => s + Number(r.reply_rate), 0) / latestRollup.length
    const totalRevenue = latestRollup.reduce((s, r) => s + r.total_revenue_cents, 0) / 100
    const totalSends = latestRollup.reduce((s, r) => s + r.total_sends, 0)
    const revPer1K = totalSends > 0 ? totalRevenue / (totalSends / 1000) : 0

    const checks = {
        deliverability_stable: avgBounce < maxBounce,
        engagement_positive: avgReply > 0.01,
        revenue_healthy: revPer1K > 5,
    }

    const allPassed = Object.values(checks).every(Boolean)

    if (!allPassed) {
        const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k)
        return NextResponse.json({
            expanded: false,
            reason: `Expansion blocked: ${failed.join(', ')}`,
            checks,
            metrics: { avg_bounce: avgBounce, avg_reply: avgReply, rev_per_1k: revPer1K },
        })
    }

    const { data: inactiveSats } = await supabase
        .from('sending_satellites')
        .select('id, domain_id, status')
        .eq('partner_id', targetOrg)
        .eq('is_active', false)
        .in('status', ['provisioning', 'warming'])
        .order('created_at', { ascending: true })
        .limit(1)

    if (!inactiveSats?.length) {
        return NextResponse.json({
            expanded: false,
            reason: 'No inactive satellites available to activate. Provision more first.',
            checks,
        })
    }

    const sat = inactiveSats[0]
    await supabase
        .from('sending_satellites')
        .update({ is_active: true, status: 'warming' })
        .eq('id', sat.id)

    return NextResponse.json({
        expanded: true,
        activated_satellite_id: sat.id,
        checks,
        metrics: { avg_bounce: avgBounce, avg_reply: avgReply, rev_per_1k: revPer1K },
        strategy: 'horizontal_first',
    })
}
