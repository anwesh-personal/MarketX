import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const eventTypeSchema = z.enum([
    'send',
    'reply',
    'click',
    'booking',
    'show',
    'revenue',
    'bounce',
    'complaint',
    'open',
])

const ingestSchema = z.object({
    offer_id: z.string().uuid('offer_id must be a valid UUID'),
    icp_id: z.string().uuid('icp_id must be a valid UUID'),
    brief_id: z.string().uuid('brief_id must be a valid UUID'),
    belief_id: z.string().uuid('belief_id must be a valid UUID'),
    flow_id: z.string().uuid().optional(),
    flow_step_id: z.string().uuid().optional(),
    event_type: eventTypeSchema,
    event_value: z.number().optional(),
    occurred_at: z.string().datetime().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
})

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
    const parsed = ingestSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const input = parsed.data

    const [offerCheck, icpCheck, briefCheck, beliefCheck] = await Promise.all([
        supabase.from('offer').select('id').eq('id', input.offer_id).eq('partner_id', me.org_id).maybeSingle(),
        supabase.from('icp').select('id').eq('id', input.icp_id).eq('partner_id', me.org_id).maybeSingle(),
        supabase.from('brief').select('id').eq('id', input.brief_id).eq('partner_id', me.org_id).maybeSingle(),
        supabase.from('belief').select('id').eq('id', input.belief_id).eq('partner_id', me.org_id).maybeSingle(),
    ])

    if (!offerCheck.data) return NextResponse.json({ error: 'offer_id not found for this org' }, { status: 404 })
    if (!icpCheck.data) return NextResponse.json({ error: 'icp_id not found for this org' }, { status: 404 })
    if (!briefCheck.data) return NextResponse.json({ error: 'brief_id not found for this org' }, { status: 404 })
    if (!beliefCheck.data) return NextResponse.json({ error: 'belief_id not found for this org' }, { status: 404 })

    const { data: inserted, error: insertError } = await supabase
        .from('signal_event')
        .insert({
            partner_id: me.org_id,
            offer_id: input.offer_id,
            icp_id: input.icp_id,
            brief_id: input.brief_id,
            belief_id: input.belief_id,
            flow_id: input.flow_id ?? null,
            flow_step_id: input.flow_step_id ?? null,
            event_type: input.event_type,
            event_value: input.event_value ?? null,
            meta: input.meta ?? {},
            occurred_at: input.occurred_at ?? new Date().toISOString(),
        })
        .select('id, event_type, occurred_at, partner_id, offer_id, icp_id, brief_id, belief_id')
        .single()

    if (insertError || !inserted) {
        return NextResponse.json({ error: `Failed to ingest signal: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, signal: inserted }, { status: 201 })
}
