import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
    flow_id: z.string().uuid(),
    step_number: z.number().int().min(13).max(999),
    subject_a: z.string().min(1).max(500),
    subject_b: z.string().min(1).max(500).optional(),
    body_html: z.string().min(1),
    body_text: z.string().optional(),
    reflection_notes: z.string().optional(),
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

    if (!['admin', 'owner', 'superadmin'].includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { flow_id, step_number, subject_a, subject_b, body_html, body_text, reflection_notes } = parsed.data

    const { data: flow, error: flowErr } = await supabase
        .from('flow')
        .select('id, partner_id, belief_id, status')
        .eq('id', flow_id)
        .eq('partner_id', me.org_id)
        .single()
    if (flowErr || !flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 })

    const { data: existing } = await supabase
        .from('flow_step')
        .select('step_number')
        .eq('flow_id', flow_id)
        .order('step_number', { ascending: false })
        .limit(1)
    const lastStep = existing?.[0]?.step_number ?? 0
    if (step_number !== lastStep + 1) {
        return NextResponse.json({
            error: `Reflection steps must be sequential. Last step: ${lastStep}, expected next: ${lastStep + 1}, got: ${step_number}`,
        }, { status: 400 })
    }

    const { data: created, error: insertErr } = await supabase
        .from('flow_step')
        .insert({
            flow_id,
            step_number,
            subject_a,
            subject_b: subject_b ?? null,
            body_html,
            body_text: body_text ?? null,
        })
        .select('id, step_number, subject_a')
        .single()

    if (insertErr) return NextResponse.json({ error: `Insert failed: ${insertErr.message}` }, { status: 500 })

    return NextResponse.json({
        success: true,
        flow_id,
        step: created,
        phase: 'reflection',
        note: 'Post-12 reflection phase — belief expression continues indefinitely',
    }, { status: 201 })
}
