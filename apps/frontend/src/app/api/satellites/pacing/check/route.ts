import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getConfigValues } from '@/lib/platform-config'
import { requireFeature } from '@/lib/requireFeature'

const schema = z.object({
    satellite_id: z.string().uuid(),
    requested_sends: z.number().int().min(1).max(10000),
})

export async function POST(req: NextRequest) {
    const gate = await requireFeature(req, 'can_manage_satellites')
    if (gate.denied) return gate.response

    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { satellite_id, requested_sends } = parsed.data

    const { data: sat, error: satError } = await supabase
        .from('sending_satellites')
        .select('id, partner_id, domain_id, status, daily_send_cap, current_daily_sent, warmup_day, warmup_target_days, is_active')
        .eq('id', satellite_id)
        .eq('partner_id', me.org_id)
        .single()
    if (satError || !sat) return NextResponse.json({ error: 'Satellite not found for this org' }, { status: 404 })

    if (!sat.is_active || sat.status === 'disabled' || sat.status === 'paused') {
        return NextResponse.json({
            allowed: false,
            approved_sends: 0,
            reason: `Satellite is ${sat.status}/${sat.is_active ? 'active' : 'inactive'} — sends blocked.`,
            satellite: sat,
        })
    }

    const cfg = await getConfigValues(supabase, [
        'send_pacing_global_daily_cap',
        'send_pacing_warmup_min_volume',
    ])

    const globalDailyCap = Number(cfg['send_pacing_global_daily_cap'])
    const warmupMinVolume = Number(cfg['send_pacing_warmup_min_volume'])
    const effectiveCap = Math.min(sat.daily_send_cap, globalDailyCap)

    let warmupCap = effectiveCap
    if (sat.status === 'warming' || sat.warmup_day < sat.warmup_target_days) {
        const rampFraction = Math.min(1, (sat.warmup_day + 1) / sat.warmup_target_days)
        warmupCap = Math.max(warmupMinVolume, Math.round(effectiveCap * rampFraction))
    }

    const remaining = Math.max(0, warmupCap - sat.current_daily_sent)
    const approved = Math.min(requested_sends, remaining)

    return NextResponse.json({
        allowed: approved > 0,
        approved_sends: approved,
        requested_sends,
        remaining_daily_capacity: remaining,
        effective_daily_cap: warmupCap,
        global_daily_cap: globalDailyCap,
        satellite_daily_cap: sat.daily_send_cap,
        warmup_day: sat.warmup_day,
        warmup_target_days: sat.warmup_target_days,
        is_warming: sat.warmup_day < sat.warmup_target_days,
        satellite: { id: sat.id, status: sat.status, current_daily_sent: sat.current_daily_sent },
    })
}
