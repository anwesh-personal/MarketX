import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const lockSchema = z.object({
    reason: z.string().min(1).max(500).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })

    let reason: string | undefined
    try {
        const body = await req.json()
        const parsed = lockSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
        }
        reason = parsed.data.reason
    } catch {
        reason = undefined
    }

    const briefId = params.id
    const { data: brief, error: briefError } = await supabase
        .from('brief')
        .select('id, locked_fields, status')
        .eq('id', briefId)
        .single()

    if (briefError || !brief) return NextResponse.json({ error: 'Brief not found' }, { status: 404 })

    const currentLocked = (brief.locked_fields as Record<string, unknown> | null) ?? {}
    const nextLocked = {
        ...currentLocked,
        immutable_after_launch: true,
        locked_at: new Date().toISOString(),
        locked_by_admin_id: admin.id,
        lock_reason: reason ?? currentLocked.lock_reason ?? null,
    }

    const { data: updated, error: updateError } = await supabase
        .from('brief')
        .update({
            locked_fields: nextLocked,
            status: brief.status === 'archived' ? 'archived' : 'active',
        })
        .eq('id', briefId)
        .select('id, locked_fields, status, updated_at')
        .single()

    if (updateError || !updated) {
        return NextResponse.json({ error: `Failed to lock brief: ${updateError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        brief: updated,
    })
}
