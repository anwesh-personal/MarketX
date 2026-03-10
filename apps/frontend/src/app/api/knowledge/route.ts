import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createSchema = z.object({
    object_type: z.string().min(1),
    title: z.string().min(1).max(500),
    description: z.string().optional(),
    pattern_data: z.record(z.any()).default({}),
    confidence: z.number().min(0).max(1).default(0.5),
    sample_size: z.number().int().min(0).default(0),
    recommendation: z.string().optional(),
    applicable_industries: z.array(z.string()).default([]),
    applicable_geographies: z.array(z.string()).default([]),
    applicable_seniorities: z.array(z.string()).default([]),
    applicable_offer_types: z.array(z.string()).default([]),
    revalidation_cycle: z.enum(['fast', 'medium', 'slow']).default('medium'),
})

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const url = new URL(req.url)
    const scope = url.searchParams.get('scope')
    const objectType = url.searchParams.get('type')
    const status = url.searchParams.get('status')

    let query = supabase
        .from('knowledge_object')
        .select('*')
        .order('confidence', { ascending: false })
        .limit(200)

    if (scope === 'local') {
        query = query.eq('partner_id', me.org_id).eq('scope', 'local')
    } else if (scope === 'global') {
        query = query.eq('scope', 'global')
    } else if (scope === 'candidate_global') {
        query = query.eq('scope', 'candidate_global')
    } else {
        query = query.or(`partner_id.eq.${me.org_id},scope.eq.global`)
    }

    if (objectType) query = query.eq('object_type', objectType)
    if (status) query = query.eq('promotion_status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ knowledge_objects: data ?? [] })
}

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
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const cycleDays: Record<string, number> = { fast: 7, medium: 30, slow: 90 }
    const nextReval = new Date(Date.now() + (cycleDays[parsed.data.revalidation_cycle] ?? 30) * 24 * 60 * 60 * 1000).toISOString()

    const { data: created, error: createErr } = await supabase
        .from('knowledge_object')
        .insert({
            partner_id: me.org_id,
            scope: 'local',
            ...parsed.data,
            description: parsed.data.description ?? null,
            recommendation: parsed.data.recommendation ?? null,
            evidence_count: 1,
            evidence_sources: [{ source: 'manual', user_id: user.id, at: new Date().toISOString() }],
            next_revalidation_at: nextReval,
        })
        .select()
        .single()

    if (createErr) return NextResponse.json({ error: `Creation failed: ${createErr.message}` }, { status: 500 })

    return NextResponse.json({ knowledge_object: created }, { status: 201 })
}
