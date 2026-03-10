import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const updateSchema = z.object({
    display_name: z.string().min(1).max(200).optional(),
    is_active: z.boolean().optional(),
    is_default: z.boolean().optional(),
    priority: z.number().int().min(0).max(100).optional(),

    api_base_url: z.string().url().optional().nullable(),
    api_key: z.string().optional().nullable(),
    api_secret: z.string().optional().nullable(),
    api_token: z.string().optional().nullable(),
    smtp_host: z.string().optional().nullable(),
    smtp_port: z.number().int().min(1).max(65535).optional().nullable(),
    smtp_username: z.string().optional().nullable(),
    smtp_password: z.string().optional().nullable(),
    smtp_encryption: z.enum(['tls', 'ssl', 'starttls', 'none']).optional().nullable(),

    webhook_url: z.string().url().optional().nullable(),
    webhook_secret: z.string().optional().nullable(),
    webhook_events: z.array(z.string()).optional(),

    provider_settings: z.record(z.any()).optional(),

    max_sends_per_day: z.number().int().min(0).optional().nullable(),
    max_sends_per_hour: z.number().int().min(0).optional().nullable(),
    max_batch_size: z.number().int().min(1).max(10000).optional(),
    rate_limit_per_second: z.number().int().min(1).max(1000).optional(),

    warmup_enabled: z.boolean().optional(),
    warmup_start_volume: z.number().int().min(1).optional(),
    warmup_increment_pct: z.number().min(1).max(100).optional(),
    warmup_target_days: z.number().int().min(1).max(90).optional(),

    notes: z.string().optional().nullable(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field required' })

async function getSuperadmin(supabase: any) {
    const token = (await supabase.auth.getSession())?.data?.session?.access_token
    if (!token) return null
    const { data } = await supabase.from('superadmins').select('id, email, is_active').eq('is_active', true).limit(1).single()
    return data
}

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const { data, error } = await supabase
        .from('email_provider_configs')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error || !data) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    return NextResponse.json({ provider: data })
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const updates: Record<string, any> = { ...parsed.data }

    Object.keys(updates).forEach(k => {
        if (typeof updates[k] === 'string' && updates[k].includes('****')) {
            delete updates[k]
        }
    })

    const { data: updated, error: updateErr } = await supabase
        .from('email_provider_configs')
        .update(updates)
        .eq('id', params.id)
        .select()
        .single()

    if (updateErr) return NextResponse.json({ error: `Update failed: ${updateErr.message}` }, { status: 500 })

    return NextResponse.json({ provider: updated })
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const { data: existing } = await supabase
        .from('email_provider_configs')
        .select('id, display_name, is_active')
        .eq('id', params.id)
        .single()
    if (!existing) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    if (existing.is_active) {
        return NextResponse.json({ error: 'Cannot delete an active provider. Deactivate first.' }, { status: 409 })
    }

    const { error: delErr } = await supabase
        .from('email_provider_configs')
        .delete()
        .eq('id', params.id)

    if (delErr) return NextResponse.json({ error: `Deletion failed: ${delErr.message}` }, { status: 500 })

    return NextResponse.json({ success: true, deleted_id: params.id })
}
