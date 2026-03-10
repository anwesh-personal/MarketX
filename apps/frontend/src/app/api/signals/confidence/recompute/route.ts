import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { enqueueBeliefConfidenceRecompute } from '@/lib/queues'

const schema = z.object({
    lookback_days: z.number().int().min(1).max(90).optional().default(7),
    org_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me, error: meError } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (meError || !me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
    if (!['owner', 'admin', 'superadmin'].includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Only admin/owner can enqueue confidence recompute' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { body = {} }
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const lookbackDays = parsed.data.lookback_days
    const targetOrgId = me.role === 'superadmin'
        ? (parsed.data.org_id ?? undefined)
        : me.org_id

    const queued = await enqueueBeliefConfidenceRecompute({
        orgId: targetOrgId,
        lookbackDays: lookbackDays,
    })

    return NextResponse.json({
        success: true,
        message: 'Confidence recompute job queued',
        scope: targetOrgId ? 'org' : 'global',
        org_id: targetOrgId ?? null,
        lookback_days: lookbackDays,
        queue: queued,
    }, { status: 202 })
}
