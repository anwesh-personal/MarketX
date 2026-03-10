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

    const allowedRoles = ['admin', 'owner', 'superadmin']
    if (!allowedRoles.includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: { org_id?: string } = {}
    try { body = await req.json() } catch { /* optional body */ }

    const targetOrg = me.role === 'superadmin' && body.org_id ? body.org_id : me.org_id

    const { data: resetResult, error: resetError } = await supabase
        .from('sending_satellites')
        .update({ current_daily_sent: 0 })
        .eq('partner_id', targetOrg)
        .select('id')

    if (resetError) {
        return NextResponse.json({ error: `Reset failed: ${resetError.message}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        satellites_reset: resetResult?.length ?? 0,
        target_org: targetOrg,
    })
}
