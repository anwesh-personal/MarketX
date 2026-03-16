import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const PROVIDER_TYPES = ['mailwizz', 'mailgun', 'ses', 'sendgrid', 'postmark', 'sparkpost', 'smtp', 'custom'] as const

const createSchema = z.object({
    partner_id: z.string().uuid().optional().nullable(),
    scope: z.enum(['global', 'organization']).default('organization'),
    provider_type: z.enum(PROVIDER_TYPES),
    display_name: z.string().min(1).max(200),
    is_active: z.boolean().default(false),
    is_default: z.boolean().default(false),
    priority: z.number().int().min(0).max(100).default(0),

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
    webhook_events: z.array(z.string()).default([]),

    provider_settings: z.record(z.any()).default({}),

    max_sends_per_day: z.number().int().min(0).optional().nullable(),
    max_sends_per_hour: z.number().int().min(0).optional().nullable(),
    max_batch_size: z.number().int().min(1).max(10000).default(500),
    rate_limit_per_second: z.number().int().min(1).max(1000).default(10),

    warmup_enabled: z.boolean().default(true),
    warmup_start_volume: z.number().int().min(1).default(50),
    warmup_increment_pct: z.number().min(1).max(100).default(20),
    warmup_target_days: z.number().int().min(1).max(90).default(21),

    notes: z.string().optional().nullable(),
})


export async function GET(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const url = new URL(req.url)
    const orgId = url.searchParams.get('org_id')
    const scope = url.searchParams.get('scope')
    const providerType = url.searchParams.get('provider_type')

    let query = supabase
        .from('email_provider_configs')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

    if (orgId) query = query.eq('partner_id', orgId)
    if (scope) query = query.eq('scope', scope)
    if (providerType) query = query.eq('provider_type', providerType)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const sanitized = (data ?? []).map(p => ({
        ...p,
        api_key: p.api_key ? maskSecret(p.api_key) : null,
        api_secret: p.api_secret ? maskSecret(p.api_secret) : null,
        api_token: p.api_token ? maskSecret(p.api_token) : null,
        smtp_password: p.smtp_password ? maskSecret(p.smtp_password) : null,
        webhook_secret: p.webhook_secret ? maskSecret(p.webhook_secret) : null,
    }))

    return NextResponse.json({ providers: sanitized })
}

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const data = parsed.data

    if (data.scope === 'organization' && !data.partner_id) {
        return NextResponse.json({ error: 'partner_id required for organization-scoped provider' }, { status: 400 })
    }
    if (data.scope === 'global') {
        data.partner_id = null
    }

    const { data: created, error: createErr } = await supabase
        .from('email_provider_configs')
        .insert({
            ...data,
            created_by: admin.id,
        })
        .select()
        .single()

    if (createErr) return NextResponse.json({ error: `Creation failed: ${createErr.message}` }, { status: 500 })

    return NextResponse.json({ provider: created }, { status: 201 })
}

function maskSecret(secret: string): string {
    if (secret.length <= 8) return '****'
    return secret.slice(0, 4) + '****' + secret.slice(-4)
}
