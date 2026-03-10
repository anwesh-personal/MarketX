import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!['admin', 'owner', 'superadmin'].includes(me?.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: snapshot } = await supabase
        .from('config_table')
        .select('value')
        .eq('key', 'network_effect_snapshot')
        .single()

    if (!snapshot?.value) {
        return NextResponse.json({ snapshot: null, message: 'No network snapshot available yet. Run the network-effect-monitor job.' })
    }

    return NextResponse.json({ snapshot: snapshot.value })
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
    if (!['superadmin'].includes(me?.role ?? '')) {
        return NextResponse.json({ error: 'Superadmin only' }, { status: 403 })
    }

    const { enqueueAnalytics } = await import('@/lib/queues')
    await enqueueAnalytics({ type: 'network-effect-monitor' })

    return NextResponse.json({ success: true, message: 'Network effect monitor job enqueued' })
}
