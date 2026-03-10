import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { invalidateConfigCache } from '@/lib/platform-config'

const CONFIG_CATEGORIES: Record<string, string[]> = {
    send_pacing: [
        'send_pacing_daily_cap',
        'send_pacing_global_daily_cap',
        'send_pacing_warmup_min_volume',
        'send_pacing_warmup_default_days',
        'send_pacing_ramp_strategy',
    ],
    deliverability: [
        'deliverability_bounce_rate_warning',
        'deliverability_bounce_rate_critical',
        'deliverability_complaint_rate_warning',
        'deliverability_complaint_rate_critical',
        'deliverability_open_rate_low',
        'deliverability_reputation_penalty_bounce',
        'deliverability_reputation_penalty_complaint',
        'deliverability_auto_pause_reputation',
    ],
    domains: [
        'domain_default_warmup_days',
        'domain_max_satellites_per_domain',
        'domain_max_domains_per_org',
    ],
    confidence: [
        'confidence_formula_v1',
    ],
    allocation: [
        'allocation_min_exploration',
        'allocation_step_size',
    ],
    promotion: [
        'promotion_min_sample_size',
        'promotion_min_confidence',
        'promotion_negative_rate_max',
        'promotion_booked_call_rate_min',
    ],
}

const updateSchema = z.object({
    key: z.string().min(1).max(200),
    value: z.any(),
    description: z.string().optional(),
})

const bulkUpdateSchema = z.object({
    configs: z.array(updateSchema).min(1).max(100),
})

async function getSuperadmin(supabase: any) {
    const token = (await supabase.auth.getSession())?.data?.session?.access_token
    if (!token) return null
    const { data } = await supabase.from('superadmins').select('id, email, is_active').eq('is_active', true).limit(1).single()
    return data
}

export async function GET(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const key = url.searchParams.get('key')

    let query = supabase
        .from('config_table')
        .select('*')
        .order('key', { ascending: true })

    if (key) {
        query = query.eq('key', key)
    } else if (category && CONFIG_CATEGORIES[category]) {
        query = query.in('key', CONFIG_CATEGORIES[category])
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const grouped: Record<string, any[]> = {}
    for (const [cat, keys] of Object.entries(CONFIG_CATEGORIES)) {
        grouped[cat] = (data ?? []).filter(d => keys.includes(d.key))
    }
    const uncategorized = (data ?? []).filter(d =>
        !Object.values(CONFIG_CATEGORIES).flat().includes(d.key)
    )
    if (uncategorized.length > 0) grouped['other'] = uncategorized

    return NextResponse.json({
        configs: data ?? [],
        grouped,
        categories: Object.keys(CONFIG_CATEGORIES),
    })
}

export async function PUT(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const singleParsed = updateSchema.safeParse(body)
    if (singleParsed.success) {
        const { key, value, description } = singleParsed.data
        const jsonValue = typeof value === 'object' ? value : { value }

        const { data: upserted, error } = await supabase
            .from('config_table')
            .upsert({
                key,
                value: jsonValue,
                description: description ?? key,
            }, { onConflict: 'key' })
            .select()
            .single()

        if (error) return NextResponse.json({ error: `Upsert failed: ${error.message}` }, { status: 500 })
        invalidateConfigCache(key)
        return NextResponse.json({ config: upserted })
    }

    const bulkParsed = bulkUpdateSchema.safeParse(body)
    if (bulkParsed.success) {
        const rows = bulkParsed.data.configs.map(c => ({
            key: c.key,
            value: typeof c.value === 'object' ? c.value : { value: c.value },
            description: c.description ?? c.key,
        }))

        const { data: upserted, error } = await supabase
            .from('config_table')
            .upsert(rows, { onConflict: 'key' })
            .select()

        if (error) return NextResponse.json({ error: `Bulk upsert failed: ${error.message}` }, { status: 500 })
        invalidateConfigCache()
        return NextResponse.json({ configs: upserted, updated_count: upserted?.length ?? 0 })
    }

    return NextResponse.json({ error: 'Validation failed', details: singleParsed.error.flatten() }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const url = new URL(req.url)
    const key = url.searchParams.get('key')
    if (!key) return NextResponse.json({ error: 'key query parameter required' }, { status: 400 })

    const protectedKeys = [
        'confidence_formula_v1', 'allocation_min_exploration', 'promotion_min_sample_size',
    ]
    if (protectedKeys.includes(key)) {
        return NextResponse.json({ error: `Config key '${key}' is protected and cannot be deleted` }, { status: 403 })
    }

    const { error } = await supabase.from('config_table').delete().eq('key', key)
    if (error) return NextResponse.json({ error: `Delete failed: ${error.message}` }, { status: 500 })

    invalidateConfigCache(key)
    return NextResponse.json({ success: true, deleted_key: key })
}
