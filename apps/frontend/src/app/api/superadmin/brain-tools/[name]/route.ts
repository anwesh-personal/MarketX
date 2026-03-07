export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const updateToolSchema = z.object({
    description:      z.string().min(10).optional(),
    parameters:       z.record(z.unknown()).optional(),
    handler_function: z.string().min(1).optional(),
    min_tier:         z.enum(['basic', 'medium', 'enterprise']).optional(),
    requires_confirm: z.boolean().optional(),
    is_enabled:       z.boolean().optional(),
})

// PATCH /api/superadmin/brain-tools/[name]
export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const parsed = updateToolSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
        .from('brain_tools')
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq('name', params.name)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tool: data })
}
