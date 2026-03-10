import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const patchSchema = z.object({
    is_active: z.boolean().optional(),
    warmup_status: z.enum(['not_started', 'warming', 'completed']).optional(),
    provider: z.enum(['mailgun', 'ses', 'mailwizz', 'other']).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' })

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const { data: dom, error: domErr } = await supabase
        .from('sending_domains')
        .select(`
            *,
            sending_satellites(id, mailbox_email, status, daily_send_cap, current_daily_sent, warmup_day, is_active, reputation_score, last_send_at)
        `)
        .eq('id', params.id)
        .eq('partner_id', me.org_id)
        .single()
    if (domErr || !dom) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

    return NextResponse.json({ domain: dom })
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { data: dom } = await supabase
        .from('sending_domains')
        .select('id, partner_id')
        .eq('id', params.id)
        .eq('partner_id', me.org_id)
        .single()
    if (!dom) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

    const { data: updated, error: updateErr } = await supabase
        .from('sending_domains')
        .update(parsed.data)
        .eq('id', params.id)
        .select()
        .single()

    if (updateErr) return NextResponse.json({ error: `Update failed: ${updateErr.message}` }, { status: 500 })

    return NextResponse.json({ domain: updated })
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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

    const { data: dom } = await supabase
        .from('sending_domains')
        .select('id, partner_id')
        .eq('id', params.id)
        .eq('partner_id', me.org_id)
        .single()
    if (!dom) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

    const { data: activeSats } = await supabase
        .from('sending_satellites')
        .select('id')
        .eq('domain_id', params.id)
        .eq('is_active', true)
        .limit(1)
    if (activeSats && activeSats.length > 0) {
        return NextResponse.json({ error: 'Cannot delete domain with active satellites. Deactivate all satellites first.' }, { status: 409 })
    }

    const { error: delSatErr } = await supabase
        .from('sending_satellites')
        .delete()
        .eq('domain_id', params.id)

    if (delSatErr) return NextResponse.json({ error: `Failed to remove satellites: ${delSatErr.message}` }, { status: 500 })

    const { error: delErr } = await supabase
        .from('sending_domains')
        .delete()
        .eq('id', params.id)

    if (delErr) return NextResponse.json({ error: `Domain deletion failed: ${delErr.message}` }, { status: 500 })

    return NextResponse.json({ success: true, deleted_domain_id: params.id })
}
