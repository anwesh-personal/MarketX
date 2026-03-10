import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
    satellite_id: z.string().uuid(),
    sends_completed: z.number().int().min(1).max(10000),
})

export async function POST(req: NextRequest) {
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

    const { satellite_id, sends_completed } = parsed.data

    const { data: sat, error: satError } = await supabase
        .from('sending_satellites')
        .select('id, partner_id, current_daily_sent, warmup_day, warmup_target_days, status')
        .eq('id', satellite_id)
        .eq('partner_id', me.org_id)
        .single()
    if (satError || !sat) return NextResponse.json({ error: 'Satellite not found for this org' }, { status: 404 })

    const newDailySent = sat.current_daily_sent + sends_completed
    const newWarmupDay = sat.warmup_day < sat.warmup_target_days
        ? sat.warmup_day + 1
        : sat.warmup_day

    const statusTransition = (sat.status === 'warming' && newWarmupDay >= sat.warmup_target_days)
        ? 'active'
        : (sat.status === 'provisioning' ? 'warming' : sat.status)

    const { data: updated, error: updateError } = await supabase
        .from('sending_satellites')
        .update({
            current_daily_sent: newDailySent,
            warmup_day: newWarmupDay,
            status: statusTransition,
            last_send_at: new Date().toISOString(),
        })
        .eq('id', satellite_id)
        .select('id, mailbox_email, status, current_daily_sent, warmup_day, last_send_at')
        .single()

    if (updateError || !updated) {
        return NextResponse.json({ error: `Failed to record sends: ${updateError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        satellite: updated,
        status_changed: statusTransition !== sat.status,
        previous_status: sat.status,
    })
}
