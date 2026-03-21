import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

const schema = z.object({
    alert_ids: z.array(z.string().uuid()).min(1).max(100),
})

export async function POST(req: NextRequest) {
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

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { alert_ids } = parsed.data

    const { data: updated, error: updateError } = await supabase
        .from('deliverability_alerts')
        .update({
            acknowledged: true,
            acknowledged_by: user.id,
            acknowledged_at: new Date().toISOString(),
        })
        .eq('partner_id', me.org_id)
        .in('id', alert_ids)
        .select('id')

    if (updateError) {
        return NextResponse.json({ error: `Acknowledge failed: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        acknowledged_count: updated?.length ?? 0,
    })
}
