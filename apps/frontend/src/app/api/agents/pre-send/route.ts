import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getConfigValues } from '@/lib/platform-config'
import {
    ContactDecisionAgent,
    TimingWindowAgent,
    AngleSelectionAgent,
    SendPacingAgent,
} from '@/services/mastery'

const schema = z.object({
    identity_id: z.string().uuid(),
    icp_id: z.string().uuid(),
    offer_id: z.string().uuid(),
    satellite_id: z.string().uuid(),
})

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

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { identity_id, icp_id, offer_id, satellite_id } = parsed.data
    const context = { partnerId: me.org_id, supabase }
    const pipeline: any[] = []

    // 1. Load identity data
    const { data: identity } = await supabase
        .from('identity_pool')
        .select('*')
        .eq('id', identity_id)
        .eq('partner_id', me.org_id)
        .single()
    if (!identity) return NextResponse.json({ error: 'Identity not found' }, { status: 404 })

    // 2. Load satellite data
    const { data: sat } = await supabase
        .from('sending_satellites')
        .select('*')
        .eq('id', satellite_id)
        .eq('partner_id', me.org_id)
        .single()
    if (!sat) return NextResponse.json({ error: 'Satellite not found' }, { status: 404 })

    // 3. Load config
    const cfg = await getConfigValues(supabase, [
        'send_pacing_global_daily_cap',
        'send_pacing_warmup_min_volume',
    ])

    // Step 1: Contact Decision
    const contactAgent = new ContactDecisionAgent(context)
    const contactResult = await contactAgent.execute({
        identityId: identity_id,
        icpId: icp_id,
        identityData: {
            confidence: Number(identity.confidence ?? 0.5),
            verification_status: identity.verification_status ?? 'unknown',
            industry: identity.industry,
            seniority: identity.seniority,
            geography: identity.geography,
            in_market_signals: identity.in_market_signals ?? 0,
        },
    })
    pipeline.push({ agent: 'contact_decision', result: contactResult })

    if (contactResult.decision === 'SUPPRESS') {
        return NextResponse.json({
            allowed: false,
            reason: 'Contact Decision Agent: SUPPRESS',
            pipeline,
        })
    }

    // Step 2: Timing Window
    const timingAgent = new TimingWindowAgent(context)
    const timingResult = await timingAgent.execute({
        identityId: identity_id,
        industry: identity.industry,
        geography: identity.geography,
        seniority: identity.seniority,
        timezone: identity.timezone ?? 'UTC',
    })
    pipeline.push({ agent: 'timing_window', result: timingResult })

    // Step 3: Angle Selection
    const { data: angles } = await supabase
        .from('offer_angles')
        .select('id, angle_key, label')
        .eq('offer_id', offer_id)
        .eq('is_active', true)

    const angleAgent = new AngleSelectionAgent(context)
    const angleResult = await angleAgent.execute({
        offerId: offer_id,
        icpId: icp_id,
        availableAngles: (angles ?? []).map(a => ({ id: a.id, angle_key: a.angle_key, label: a.label })),
        industry: identity.industry,
        seniority: identity.seniority,
    })
    pipeline.push({ agent: 'angle_selection', result: angleResult })

    // Step 4: Send Pacing
    const { data: latestSnapshot } = await supabase
        .from('deliverability_snapshots')
        .select('bounce_rate, complaint_rate, reputation_score')
        .eq('satellite_id', satellite_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

    const pacingAgent = new SendPacingAgent(context)
    const pacingResult = await pacingAgent.execute({
        satelliteId: satellite_id,
        currentDailySent: sat.current_daily_sent,
        dailySendCap: sat.daily_send_cap,
        warmupDay: sat.warmup_day,
        warmupTargetDays: sat.warmup_target_days,
        status: sat.status,
        reputationScore: Number(latestSnapshot?.reputation_score ?? sat.reputation_score ?? 100),
        bounceRate: Number(latestSnapshot?.bounce_rate ?? 0),
        complaintRate: Number(latestSnapshot?.complaint_rate ?? 0),
        globalDailyCap: Number(cfg['send_pacing_global_daily_cap']),
        warmupMinVolume: Number(cfg['send_pacing_warmup_min_volume']),
    })
    pipeline.push({ agent: 'send_pacing', result: pacingResult })

    if (pacingResult.decision === 'pause') {
        return NextResponse.json({
            allowed: false,
            reason: 'Send Pacing Agent: PAUSE (reputation/deliverability critical)',
            pipeline,
        })
    }

    const isDelayed = contactResult.decision === 'DELAY'

    return NextResponse.json({
        allowed: true,
        delayed: isDelayed,
        send_at: timingResult.detail.send_at,
        selected_angle: angleResult.detail,
        pacing: {
            action: pacingResult.decision,
            recommended_cap: pacingResult.detail.recommended_daily_cap,
        },
        pipeline,
    })
}
