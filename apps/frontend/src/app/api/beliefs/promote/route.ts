import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getConfigValues } from '@/lib/platform-config'

const PROMOTION_LADDER = ['HYP', 'TEST', 'SW', 'IW', 'RW', 'GW'] as const
type BeliefStatus = typeof PROMOTION_LADDER[number] | 'PAUSED'

const VALID_TRANSITIONS: Record<string, string[]> = {
    HYP:    ['TEST'],
    TEST:   ['SW', 'PAUSED'],
    SW:     ['IW', 'PAUSED'],
    IW:     ['RW', 'PAUSED'],
    RW:     ['GW', 'PAUSED'],
    GW:     [],
    PAUSED: ['TEST', 'SW', 'IW', 'RW'],
}

const schema = z.object({
    belief_id: z.string().uuid(),
    target_status: z.enum(['HYP', 'TEST', 'SW', 'IW', 'RW', 'GW', 'PAUSED']).optional(),
    force: z.boolean().optional().default(false),
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

    const allowedRoles = ['admin', 'owner', 'superadmin']
    if (!allowedRoles.includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { belief_id, target_status: explicitTarget, force } = parsed.data

    const { data: belief, error: beliefErr } = await supabase
        .from('belief')
        .select('id, partner_id, brief_id, status, confidence_score, allocation_weight')
        .eq('id', belief_id)
        .eq('partner_id', me.org_id)
        .single()
    if (beliefErr || !belief) return NextResponse.json({ error: 'Belief not found for this org' }, { status: 404 })

    const currentStatus = belief.status as BeliefStatus
    const currentIdx = PROMOTION_LADDER.indexOf(currentStatus as any)

    let targetStatus: BeliefStatus
    if (explicitTarget) {
        targetStatus = explicitTarget
    } else if (currentStatus === 'PAUSED') {
        return NextResponse.json({ error: 'Paused beliefs need explicit target_status to resume' }, { status: 400 })
    } else if (currentIdx >= 0 && currentIdx < PROMOTION_LADDER.length - 1) {
        targetStatus = PROMOTION_LADDER[currentIdx + 1]
    } else {
        return NextResponse.json({ error: `Belief at ${currentStatus} cannot be promoted further` }, { status: 409 })
    }

    const validTargets = VALID_TRANSITIONS[currentStatus] ?? []
    if (!validTargets.includes(targetStatus)) {
        return NextResponse.json({
            error: `Invalid transition: ${currentStatus} → ${targetStatus}. Valid: [${validTargets.join(', ')}]`,
        }, { status: 409 })
    }

    if (targetStatus === 'PAUSED') {
        const { error: pauseErr } = await supabase
            .from('belief')
            .update({ status: 'PAUSED' })
            .eq('id', belief_id)
        if (pauseErr) return NextResponse.json({ error: `Pause failed: ${pauseErr.message}` }, { status: 500 })

        await supabase.from('belief_promotion_log').insert({
            belief_id,
            from_status: currentStatus,
            to_status: 'PAUSED',
            reason: 'Manual pause by admin',
            meta: { triggered_by: user.id, role: me.role },
        })

        return NextResponse.json({
            success: true,
            belief_id,
            from_status: currentStatus,
            to_status: 'PAUSED',
            gate_check: null,
        })
    }

    let gateResult: {
        passed: boolean
        checks: Record<string, { passed: boolean; actual: number; threshold: number }>
    } | null = null

    if (!force && targetStatus !== 'TEST') {
        const cfg = await getConfigValues(supabase, [
            'promotion_min_sample_size',
            'promotion_min_confidence',
            'promotion_negative_rate_max',
            'promotion_booked_call_rate_min',
            'allocation_min_exploration',
        ])

        const minSampleSize = Number(cfg['promotion_min_sample_size'])
        const minConfidence = Number(cfg['promotion_min_confidence'])
        const maxNegativeRate = Number(cfg['promotion_negative_rate_max'])
        const minBookedCallRate = Number(cfg['promotion_booked_call_rate_min'])
        const minExploration = Number(cfg['allocation_min_exploration'])

        const { data: signals } = await supabase
            .from('signal_event')
            .select('event_type')
            .eq('belief_id', belief_id)
        const total = signals?.length ?? 0
        const byType: Record<string, number> = {}
        for (const s of (signals ?? [])) {
            byType[s.event_type] = (byType[s.event_type] ?? 0) + 1
        }

        const sends = byType['send'] ?? 0
        const bookings = byType['booking'] ?? 0
        const negativeReplies = byType['reply'] ?? 0
        const bookedCallRate = sends > 0 ? bookings / sends : 0
        const negativeRate = sends > 0 ? negativeReplies / sends : 0
        const confidenceScore = Number(belief.confidence_score ?? 0)

        const checks: Record<string, { passed: boolean; actual: number; threshold: number }> = {
            sample_size: { passed: total >= minSampleSize, actual: total, threshold: minSampleSize },
            confidence_score: { passed: confidenceScore >= minConfidence, actual: confidenceScore, threshold: minConfidence },
            negative_rate: { passed: negativeRate <= maxNegativeRate, actual: negativeRate, threshold: maxNegativeRate },
            booked_call_rate: { passed: bookedCallRate >= minBookedCallRate, actual: bookedCallRate, threshold: minBookedCallRate },
            min_exploration: { passed: belief.allocation_weight >= minExploration, actual: Number(belief.allocation_weight), threshold: minExploration },
        }

        const allPassed = Object.values(checks).every(c => c.passed)
        gateResult = { passed: allPassed, checks }

        await supabase.from('belief_gate_snapshot').insert({
            belief_id,
            snapshot: { checks, target_status: targetStatus, from_status: currentStatus },
            passed: allPassed,
        })

        if (!allPassed) {
            const failedGates = Object.entries(checks)
                .filter(([, c]) => !c.passed)
                .map(([k]) => k)

            await supabase.from('belief_promotion_log').insert({
                belief_id,
                from_status: currentStatus,
                to_status: currentStatus,
                reason: `Promotion to ${targetStatus} blocked — gates failed: ${failedGates.join(', ')}`,
                meta: { checks, triggered_by: user.id },
            })

            return NextResponse.json({
                success: false,
                belief_id,
                from_status: currentStatus,
                target_status: targetStatus,
                gate_check: gateResult,
                message: `Promotion blocked. Failed gates: ${failedGates.join(', ')}`,
            })
        }
    }

    const { error: promoteErr } = await supabase
        .from('belief')
        .update({ status: targetStatus })
        .eq('id', belief_id)
    if (promoteErr) return NextResponse.json({ error: `Promotion update failed: ${promoteErr.message}` }, { status: 500 })

    await supabase.from('belief_promotion_log').insert({
        belief_id,
        from_status: currentStatus,
        to_status: targetStatus,
        reason: force ? 'Force-promoted by admin (gates bypassed)' : `All gates passed for ${currentStatus} → ${targetStatus}`,
        meta: {
            gate_result: gateResult,
            triggered_by: user.id,
            role: me.role,
            forced: force,
        },
    })

    return NextResponse.json({
        success: true,
        belief_id,
        from_status: currentStatus,
        to_status: targetStatus,
        gate_check: gateResult,
    })
}
