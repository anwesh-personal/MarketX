import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    let body: { org_id?: string; lookback_days?: number } = {}
    try { body = await req.json() } catch { /* optional */ }

    const targetOrg = me.role === 'superadmin' && body.org_id ? body.org_id : me.org_id

    const { enqueueAnalytics } = await import('@/lib/queues')
    await enqueueAnalytics({
        type: 'dream-cycle' as any,
        orgId: targetOrg,
        lookbackDays: body.lookback_days ?? 7,
    })

    return NextResponse.json({ success: true, message: 'Dream cycle job enqueued', target_org: targetOrg })
}

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const { data: dreamLogs } = await supabase
        .from('brain_dream_logs')
        .select('*')
        .eq('org_id', me.org_id)
        .order('created_at', { ascending: false })
        .limit(10)

    const { data: reflections } = await supabase
        .from('brain_reflections')
        .select('*')
        .eq('org_id', me.org_id)
        .order('created_at', { ascending: false })
        .limit(20)

    const { data: memoryCount } = await supabase
        .from('brain_memories')
        .select('id')
        .eq('org_id', me.org_id)

    return NextResponse.json({
        dream_logs: dreamLogs ?? [],
        reflections: reflections ?? [],
        total_memories: memoryCount?.length ?? 0,
    })
}
