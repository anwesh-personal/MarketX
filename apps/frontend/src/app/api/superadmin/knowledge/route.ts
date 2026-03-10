import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const scope = url.searchParams.get('scope') ?? 'all'
    const objectType = url.searchParams.get('type')
    const status = url.searchParams.get('status')
    const orgId = url.searchParams.get('org_id')

    let query = supabase
        .from('knowledge_object')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(300)

    if (scope === 'global') query = query.eq('scope', 'global')
    else if (scope === 'candidate_global') query = query.eq('scope', 'candidate_global')
    else if (scope === 'local') query = query.eq('scope', 'local')

    if (objectType) query = query.eq('object_type', objectType)
    if (status) query = query.eq('promotion_status', status)
    if (orgId) query = query.eq('partner_id', orgId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const scopeCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}
    for (const ko of (data ?? [])) {
        scopeCounts[ko.scope] = (scopeCounts[ko.scope] ?? 0) + 1
        typeCounts[ko.object_type] = (typeCounts[ko.object_type] ?? 0) + 1
        statusCounts[ko.promotion_status] = (statusCounts[ko.promotion_status] ?? 0) + 1
    }

    return NextResponse.json({
        knowledge_objects: data ?? [],
        total: (data ?? []).length,
        by_scope: scopeCounts,
        by_type: typeCounts,
        by_status: statusCounts,
    })
}

export async function PATCH(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    let body: { id: string; updates: Record<string, any> }
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const allowedFields = [
        'promotion_status', 'review_notes', 'revalidation_cycle',
        'harmful_side_effects', 'confidence', 'stability_score',
    ]
    const updates: Record<string, any> = {}
    for (const [k, v] of Object.entries(body.updates ?? {})) {
        if (allowedFields.includes(k)) updates[k] = v
    }
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.reviewed_by = admin.id
    updates.reviewed_at = new Date().toISOString()

    const { data: updated, error } = await supabase
        .from('knowledge_object')
        .update(updates)
        .eq('id', body.id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ knowledge_object: updated })
}

export async function DELETE(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: ko } = await supabase
        .from('knowledge_object')
        .select('id, scope')
        .eq('id', id)
        .single()
    if (!ko) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase.from('knowledge_object').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, deleted_id: id })
}
