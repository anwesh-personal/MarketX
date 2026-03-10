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

    const allowedRoles = ['admin', 'owner', 'superadmin']
    if (!allowedRoles.includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: { org_id?: string; date?: string } = {}
    try { body = await req.json() } catch { /* optional */ }

    const targetOrg = me.role === 'superadmin' && body.org_id ? body.org_id : me.org_id
    const snapshotDate = body.date ?? new Date().toISOString().slice(0, 10)

    const { data: satellites, error: satErr } = await supabase
        .from('sending_satellites')
        .select('id, partner_id')
        .eq('partner_id', targetOrg)
    if (satErr || !satellites?.length) {
        return NextResponse.json({ error: 'No satellites found', details: satErr?.message }, { status: 404 })
    }

    const satIds = satellites.map(s => s.id)

    const { data: signals } = await supabase
        .from('signal_event')
        .select('event_type, metadata')
        .eq('partner_id', targetOrg)
        .gte('created_at', `${snapshotDate}T00:00:00Z`)
        .lt('created_at', `${snapshotDate}T23:59:59Z`)
        .in('event_type', ['send', 'bounce', 'complaint', 'open', 'click'])

    const satSignals: Record<string, { sends: number; deliveries: number; bounces: number; complaints: number; opens: number; clicks: number }> = {}
    for (const sid of satIds) {
        satSignals[sid] = { sends: 0, deliveries: 0, bounces: 0, complaints: 0, opens: 0, clicks: 0 }
    }

    for (const sig of (signals ?? [])) {
        const meta = sig.metadata as Record<string, any> | null
        const sid = meta?.satellite_id
        if (sid && satSignals[sid]) {
            const bucket = satSignals[sid]
            switch (sig.event_type) {
                case 'send': bucket.sends++; bucket.deliveries++; break
                case 'bounce': bucket.bounces++; bucket.deliveries = Math.max(0, bucket.deliveries - 1); break
                case 'complaint': bucket.complaints++; break
                case 'open': bucket.opens++; break
                case 'click': bucket.clicks++; break
            }
        }
    }

    const cfg = await getConfigValues(supabase, [
        'deliverability_bounce_rate_warning',
        'deliverability_bounce_rate_critical',
        'deliverability_complaint_rate_warning',
        'deliverability_complaint_rate_critical',
        'deliverability_open_rate_low',
        'deliverability_reputation_penalty_bounce',
        'deliverability_reputation_penalty_complaint',
        'deliverability_auto_pause_reputation',
    ])
    const thresholds = {
        bounce_rate_warning: Number(cfg['deliverability_bounce_rate_warning']),
        bounce_rate_critical: Number(cfg['deliverability_bounce_rate_critical']),
        complaint_rate_warning: Number(cfg['deliverability_complaint_rate_warning']),
        complaint_rate_critical: Number(cfg['deliverability_complaint_rate_critical']),
        open_rate_low: Number(cfg['deliverability_open_rate_low']),
        reputation_penalty_bounce: Number(cfg['deliverability_reputation_penalty_bounce']),
        reputation_penalty_complaint: Number(cfg['deliverability_reputation_penalty_complaint']),
        auto_pause_reputation: Number(cfg['deliverability_auto_pause_reputation']),
    }

    const upserts: any[] = []
    const alerts: any[] = []

    for (const sid of satIds) {
        const s = satSignals[sid]
        const bounceRate = s.sends > 0 ? s.bounces / s.sends : 0
        const complaintRate = s.sends > 0 ? s.complaints / s.sends : 0
        const openRate = s.deliveries > 0 ? s.opens / s.deliveries : 0

        let rep = 100
        rep -= bounceRate * thresholds.reputation_penalty_bounce * 100
        rep -= complaintRate * thresholds.reputation_penalty_complaint * 100
        rep = Math.max(0, Math.min(100, rep))

        const flags: string[] = []
        if (bounceRate >= thresholds.bounce_rate_critical) flags.push('bounce_critical')
        else if (bounceRate >= thresholds.bounce_rate_warning) flags.push('bounce_warning')
        if (complaintRate >= thresholds.complaint_rate_critical) flags.push('complaint_critical')
        else if (complaintRate >= thresholds.complaint_rate_warning) flags.push('complaint_warning')
        if (openRate < thresholds.open_rate_low && s.deliveries > 50) flags.push('low_opens')

        upserts.push({
            partner_id: targetOrg,
            satellite_id: sid,
            snapshot_date: snapshotDate,
            sends: s.sends,
            deliveries: s.deliveries,
            bounces: s.bounces,
            complaints: s.complaints,
            opens: s.opens,
            clicks: s.clicks,
            reputation_score: Number(rep.toFixed(2)),
            flags: JSON.stringify(flags),
        })

        if (flags.includes('bounce_critical')) {
            alerts.push({
                partner_id: targetOrg,
                satellite_id: sid,
                alert_type: 'high_bounce_rate',
                severity: 'critical',
                message: `Bounce rate ${(bounceRate * 100).toFixed(2)}% exceeds critical threshold on ${snapshotDate}`,
                metadata: { bounce_rate: bounceRate, sends: s.sends, bounces: s.bounces },
            })
        }
        if (flags.includes('complaint_critical')) {
            alerts.push({
                partner_id: targetOrg,
                satellite_id: sid,
                alert_type: 'high_complaint_rate',
                severity: 'critical',
                message: `Complaint rate ${(complaintRate * 100).toFixed(3)}% exceeds critical threshold on ${snapshotDate}`,
                metadata: { complaint_rate: complaintRate, sends: s.sends, complaints: s.complaints },
            })
        }
        if (rep < 70) {
            alerts.push({
                partner_id: targetOrg,
                satellite_id: sid,
                alert_type: 'reputation_drop',
                severity: rep < 50 ? 'critical' : 'warning',
                message: `Reputation score dropped to ${rep.toFixed(1)} on ${snapshotDate}`,
                metadata: { reputation_score: rep, flags },
            })
        }
    }

    const { error: upsertErr } = await supabase
        .from('deliverability_snapshots')
        .upsert(upserts, { onConflict: 'satellite_id,snapshot_date' })
    if (upsertErr) return NextResponse.json({ error: `Snapshot upsert failed: ${upsertErr.message}` }, { status: 500 })

    if (alerts.length > 0) {
        await supabase.from('deliverability_alerts').insert(alerts)
    }

    return NextResponse.json({
        success: true,
        snapshot_date: snapshotDate,
        satellites_processed: satIds.length,
        snapshots_written: upserts.length,
        alerts_generated: alerts.length,
    })
}
