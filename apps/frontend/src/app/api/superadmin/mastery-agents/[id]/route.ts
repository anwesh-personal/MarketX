import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const updateSchema = z.object({
    display_name: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
    version: z.string().optional(),
    decision_outputs: z.array(z.string()).optional(),
    input_schema: z.record(z.any()).optional(),
    output_schema: z.record(z.any()).optional(),
    scoring_rules: z.array(z.any()).optional(),
    keyword_rules: z.array(z.any()).optional(),
    field_rules: z.array(z.any()).optional(),
    kb_object_types: z.array(z.string()).optional(),
    kb_min_confidence: z.number().min(0).max(1).optional(),
    kb_max_objects: z.number().int().optional(),
    kb_write_enabled: z.boolean().optional(),
    kb_write_type: z.string().optional().nullable(),
    locked_constraints: z.record(z.any()).optional(),
    max_execution_ms: z.number().int().optional(),
    fallback_output: z.string().optional().nullable(),
    confidence_formula: z.string().optional(),
    confidence_divisor: z.number().optional(),
    pipeline_stage: z.string().optional().nullable(),
    pipeline_order: z.number().int().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' })


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const { data, error } = await supabase
        .from('mastery_agent_configs')
        .select('*')
        .eq('id', params.id)
        .single()
    if (error || !data) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const { data: recentDecisions } = await supabase
        .from('agent_decision_log')
        .select('id, decision_type, decision, confidence, created_at')
        .eq('agent_type', data.agent_key)
        .order('created_at', { ascending: false })
        .limit(20)

    return NextResponse.json({ agent: data, recent_decisions: recentDecisions ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const { data: existing } = await supabase
        .from('mastery_agent_configs')
        .select('id, is_system')
        .eq('id', params.id)
        .single()
    if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { data: updated, error: updateErr } = await supabase
        .from('mastery_agent_configs')
        .update(parsed.data)
        .eq('id', params.id)
        .select()
        .single()

    if (updateErr) return NextResponse.json({ error: `Update failed: ${updateErr.message}` }, { status: 500 })

    return NextResponse.json({ agent: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const { data: existing } = await supabase
        .from('mastery_agent_configs')
        .select('id, is_system, is_active')
        .eq('id', params.id)
        .single()
    if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    if (existing.is_system) return NextResponse.json({ error: 'System agents cannot be deleted. Deactivate instead.' }, { status: 409 })

    const { error } = await supabase.from('mastery_agent_configs').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, deleted_id: params.id })
}
