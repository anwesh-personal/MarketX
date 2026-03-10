import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createSchema = z.object({
    partner_id: z.string().uuid().optional().nullable(),
    scope: z.enum(['global', 'organization']).default('organization'),
    agent_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
    display_name: z.string().min(1).max(200),
    description: z.string().optional(),
    agent_category: z.enum(['contact', 'timing', 'angle', 'pacing', 'reply', 'buying_role', 'buyer_stage', 'uncertainty', 'sequence', 'custom']),
    version: z.string().default('1.0'),
    is_active: z.boolean().default(true),

    decision_type: z.string().min(1),
    decision_outputs: z.array(z.string()).min(1),
    input_schema: z.record(z.any()).default({}),
    output_schema: z.record(z.any()).default({}),

    scoring_rules: z.array(z.object({
        name: z.string(),
        condition: z.record(z.any()),
        action: z.enum(['boost', 'penalize', 'set']),
        target: z.string(),
        value: z.number(),
        reasoning_template: z.string().optional(),
    })).default([]),

    keyword_rules: z.array(z.object({
        keywords: z.array(z.string()),
        target_output: z.string(),
        score: z.number(),
        category: z.string().optional(),
    })).default([]),

    field_rules: z.array(z.object({
        input_field: z.string(),
        mapping: z.record(z.object({
            output: z.string(),
            score: z.number(),
        })),
    })).default([]),

    kb_object_types: z.array(z.string()).default([]),
    kb_min_confidence: z.number().min(0).max(1).default(0.2),
    kb_max_objects: z.number().int().min(1).max(100).default(10),
    kb_write_enabled: z.boolean().default(false),
    kb_write_type: z.string().optional().nullable(),

    locked_constraints: z.record(z.any()).default({}),

    max_execution_ms: z.number().int().min(100).max(30000).default(5000),
    fallback_output: z.string().optional().nullable(),
    confidence_formula: z.string().default('score_based'),
    confidence_divisor: z.number().min(1).default(100),

    pipeline_stage: z.enum(['pre_send', 'post_reply', 'pre_extension', 'periodic', 'on_demand']).optional().nullable(),
    pipeline_order: z.number().int().min(0).default(0),
})

async function getSuperadmin(supabase: any) {
    const token = (await supabase.auth.getSession())?.data?.session?.access_token
    if (!token) return null
    const { data } = await supabase.from('superadmins').select('id, email, is_active').eq('is_active', true).limit(1).single()
    return data
}

export async function GET(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const url = new URL(req.url)
    const scope = url.searchParams.get('scope')
    const category = url.searchParams.get('category')
    const orgId = url.searchParams.get('org_id')
    const pipeline = url.searchParams.get('pipeline_stage')

    let query = supabase
        .from('mastery_agent_configs')
        .select('*')
        .order('pipeline_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (scope) query = query.eq('scope', scope)
    if (category) query = query.eq('agent_category', category)
    if (orgId) query = query.eq('partner_id', orgId)
    if (pipeline) query = query.eq('pipeline_stage', pipeline)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const catCounts: Record<string, number> = {}
    const pipeCounts: Record<string, number> = {}
    for (const a of (data ?? [])) {
        catCounts[a.agent_category] = (catCounts[a.agent_category] ?? 0) + 1
        if (a.pipeline_stage) pipeCounts[a.pipeline_stage] = (pipeCounts[a.pipeline_stage] ?? 0) + 1
    }

    return NextResponse.json({
        agents: data ?? [],
        total: (data ?? []).length,
        by_category: catCounts,
        by_pipeline: pipeCounts,
    })
}

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const data = parsed.data
    if (data.scope === 'organization' && !data.partner_id) {
        return NextResponse.json({ error: 'partner_id required for org-scoped agent' }, { status: 400 })
    }
    if (data.scope === 'global') data.partner_id = null

    const { data: created, error: createErr } = await supabase
        .from('mastery_agent_configs')
        .insert({ ...data, created_by: admin.id })
        .select()
        .single()

    if (createErr) return NextResponse.json({ error: `Creation failed: ${createErr.message}` }, { status: 500 })

    return NextResponse.json({ agent: created }, { status: 201 })
}
