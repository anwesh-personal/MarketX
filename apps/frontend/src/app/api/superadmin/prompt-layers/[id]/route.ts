export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const updateLayerSchema = z.object({
    name:        z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    content:     z.string().min(1).optional(),
    tier:        z.enum(['basic', 'medium', 'enterprise', 'all']).optional(),
    is_active:   z.boolean().optional(),
})

// GET /api/superadmin/prompt-layers/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient()
    const { data, error } = await supabase
        .from('prompt_layers')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error) return NextResponse.json({ error: 'Layer not found' }, { status: 404 })

    return NextResponse.json({ layer: data })
}

// PUT /api/superadmin/prompt-layers/[id]
// Creates a new version (old row kept as history via parent_id chain)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const parsed = updateLayerSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const supabase = createClient()

    // Fetch current version
    const { data: current, error: fetchErr } = await supabase
        .from('prompt_layers')
        .select('*')
        .eq('id', params.id)
        .single()

    if (fetchErr || !current) return NextResponse.json({ error: 'Layer not found' }, { status: 404 })

    // If content changes, create a new version and archive old one
    if (parsed.data.content && parsed.data.content !== current.content) {
        // Archive old version
        await supabase.from('prompt_layers').update({ is_active: false }).eq('id', params.id)

        // Create new version
        const { data: newLayer, error: createErr } = await supabase
            .from('prompt_layers')
            .insert({
                layer_type:  current.layer_type,
                name:        parsed.data.name        ?? current.name,
                description: parsed.data.description ?? current.description,
                content:     parsed.data.content,
                tier:        parsed.data.tier        ?? current.tier,
                version:     current.version + 1,
                parent_id:   params.id,
                is_active:   true,
                created_by:  admin.id,
            })
            .select()
            .single()

        if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
        return NextResponse.json({ layer: newLayer })
    }

    // Non-content change — update in place
    const { data, error } = await supabase
        .from('prompt_layers')
        .update({
            name:        parsed.data.name        ?? current.name,
            description: parsed.data.description ?? current.description,
            tier:        parsed.data.tier        ?? current.tier,
            is_active:   parsed.data.is_active   ?? current.is_active,
        })
        .eq('id', params.id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ layer: data })
}

// DELETE /api/superadmin/prompt-layers/[id]  (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient()
    const { error } = await supabase
        .from('prompt_layers')
        .update({ is_active: false })
        .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
}
