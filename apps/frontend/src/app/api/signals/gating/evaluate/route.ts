import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
    GATING_MIN_CONFIDENCE,
    GATING_MIN_BOOKED_CALL_RATE,
    GATING_MAX_NEGATIVE_RATE,
    GATING_MIN_EXPLORATION,
} from '@/lib/config-defaults'

const schema = z.object({
    belief_id: z.string().uuid('belief_id must be a valid UUID'),
    lookback_days: z.number().int().min(1).max(90).optional().default(14),
})

function pass(name: string, value: number | boolean, threshold: number | boolean) {
    return {
        gate: name,
        value,
        threshold,
        passed: typeof value === 'number' && typeof threshold === 'number'
            ? value >= threshold
            : value === threshold,
    }
}

export async function POST(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me, error: meError } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()
    if (meError || !me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const beliefId = parsed.data.belief_id
    const lookbackDays = parsed.data.lookback_days
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: belief, error: beliefError } = await supabase
        .from('belief')
        .select('id, partner_id, confidence_score')
        .eq('id', beliefId)
        .eq('partner_id', me.org_id)
        .single()
    if (beliefError || !belief) return NextResponse.json({ error: 'Belief not found for this org' }, { status: 404 })

    const { data: cfgRows } = await supabase
        .from('config_table')
        .select('key, value')
        .in('key', ['promotion_min_sample_size', 'allocation_min_exploration'])

    const cfg = new Map((cfgRows ?? []).map((r: any) => [r.key, r.value]))
    const minSampleSize = Number(cfg.get('promotion_min_sample_size')?.value ?? 50)
    const minExploration = Number(cfg.get('allocation_min_exploration')?.value ?? 0.1)

    const { data: events } = await supabase
        .from('signal_event')
        .select('event_type')
        .eq('belief_id', beliefId)
        .gte('occurred_at', since)

    const sends = (events ?? []).filter((e) => e.event_type === 'send').length
    const bookings = (events ?? []).filter((e) => e.event_type === 'booking' || e.event_type === 'show').length
    const complaints = (events ?? []).filter((e) => e.event_type === 'complaint').length
    const bounces = (events ?? []).filter((e) => e.event_type === 'bounce').length

    const bookedCallRate = sends > 0 ? bookings / sends : 0
    const negativeRate = sends > 0 ? (complaints + bounces) / sends : 0

    const gates = [
        pass('min_sample_size', sends, minSampleSize),
        pass('confidence_score', Number(belief.confidence_score ?? 0), GATING_MIN_CONFIDENCE),
        pass('booked_call_rate', bookedCallRate, GATING_MIN_BOOKED_CALL_RATE),
        pass('negative_rate_max', 1 - negativeRate, 1 - GATING_MAX_NEGATIVE_RATE),
        pass('min_exploration_guard', minExploration, GATING_MIN_EXPLORATION),
    ]

    const passed = gates.every((g) => g.passed)
    const snapshot = {
        evaluated_at: new Date().toISOString(),
        lookback_days: lookbackDays,
        sends,
        bookings,
        complaints,
        bounces,
        booked_call_rate: bookedCallRate,
        negative_rate: negativeRate,
        confidence_score: Number(belief.confidence_score ?? 0),
        gates,
    }

    const { data: row, error: insertError } = await supabase
        .from('belief_gate_snapshot')
        .insert({
            belief_id: beliefId,
            snapshot,
            passed,
        })
        .select('id, belief_id, passed, created_at')
        .single()

    if (insertError || !row) {
        return NextResponse.json({ error: `Failed to persist gate snapshot: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        result: {
            belief_id: beliefId,
            passed,
            snapshot_id: row.id,
            gates,
        },
    })
}
