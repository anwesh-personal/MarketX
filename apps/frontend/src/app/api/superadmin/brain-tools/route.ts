export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const createToolSchema = z.object({
    name:             z.string().min(1).max(100).regex(/^[a-z_]+$/, 'Tool name must be lowercase with underscores'),
    category:         z.enum(['generation', 'retrieval', 'analysis', 'action']),
    description:      z.string().min(10),
    parameters:       z.record(z.unknown()),
    handler_function: z.string().min(1),
    min_tier:         z.enum(['basic', 'medium', 'enterprise']).default('basic'),
    requires_confirm: z.boolean().default(false),
})

// GET /api/superadmin/brain-tools
export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient()
    const { data, error } = await supabase
        .from('brain_tools')
        .select('*')
        .order('category')
        .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tools: data ?? [], count: (data ?? []).length })
}

const patchToolSchema = z.object({
    name: z.string().min(1),
    is_enabled: z.boolean(),
})

// PATCH /api/superadmin/brain-tools — toggle is_enabled for a tool
export async function PATCH(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const parsed = patchToolSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
        .from('brain_tools')
        .update({ is_enabled: parsed.data.is_enabled })
        .eq('name', parsed.data.name)
        .select()
        .single()

    if (error) {
        if (error.code === 'PGRST116') return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tool: data })
}

// POST /api/superadmin/brain-tools
export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const parsed = createToolSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
        .from('brain_tools')
        .insert({ ...parsed.data, is_enabled: true })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'A tool with this name already exists' }, { status: 409 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tool: data }, { status: 201 })
}
