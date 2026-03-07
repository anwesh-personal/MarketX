export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const createLayerSchema = z.object({
    layer_type: z.enum(['foundation', 'persona', 'guardrails', 'domain_seed']),
    name:        z.string().min(1).max(255),
    description: z.string().optional(),
    content:     z.string().min(1),
    tier:        z.enum(['basic', 'medium', 'enterprise', 'all']).default('all'),
})

// GET /api/superadmin/prompt-layers
export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const layerType = searchParams.get('layer_type')

    const supabase = createClient()
    let query = supabase
        .from('prompt_layers')
        .select('id, layer_type, name, description, content, version, tier, is_active, created_at, created_by')
        .eq('is_active', true)
        .order('layer_type')
        .order('name')

    if (layerType) {
        query = query.eq('layer_type', layerType)
    }

    const { data, error } = await query
    if (error) {
        console.error('GET /api/superadmin/prompt-layers failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ layers: data ?? [], count: (data ?? []).length })
}

// POST /api/superadmin/prompt-layers
export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = createLayerSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.errors },
            { status: 400 }
        )
    }

    const supabase = createClient()
    const { data, error } = await supabase
        .from('prompt_layers')
        .insert({
            ...parsed.data,
            is_active:   true,
            version:     1,
            created_by:  admin.id,
        })
        .select()
        .single()

    if (error) {
        console.error('POST /api/superadmin/prompt-layers failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ layer: data }, { status: 201 })
}
