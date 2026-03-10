import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const createSchema = z.object({
    org_id: z.string().uuid(),
    offer_id: z.string().uuid(),
    name: z.string().min(3).max(255),
    taxonomy_segments: z.array(z.string().min(1)).min(1).max(420),
    revenue_band_min: z.number().nonnegative(),
    revenue_band_max: z.number().positive(),
    employee_band_min: z.number().int().nonnegative().optional(),
    employee_band_max: z.number().int().positive().optional(),
    geographies: z.array(z.string().min(2)).optional().default([]),
    primary_industries: z.array(z.string().min(2)).min(1),
    seniority_levels: z.array(z.string().min(2)).optional().default([]),
    buying_roles: z.array(z.string().min(2)).optional().default([]),
    in_market_signals: z.array(z.string().min(2)).optional().default([]),
    required_technologies: z.array(z.string().min(2)).optional().default([]),
    exclusions: z.object({
        industries: z.array(z.string().min(2)).optional().default([]),
        geographies: z.array(z.string().min(2)).optional().default([]),
        company_keywords: z.array(z.string().min(2)).optional().default([]),
    }).optional().default({ industries: [], geographies: [], company_keywords: [] }),
    notes: z.string().max(4000).optional(),
    external_icp_id: z.string().uuid().optional(),
})

function coverageScore(input: z.infer<typeof createSchema>): number {
    let score = 0
    if (input.taxonomy_segments.length >= 20) score += 0.2
    if (input.primary_industries.length >= 2) score += 0.15
    if (input.seniority_levels.length >= 2) score += 0.1
    if (input.buying_roles.length >= 2) score += 0.15
    if (input.in_market_signals.length >= 2) score += 0.15
    if (input.required_technologies.length >= 1) score += 0.1
    if (input.geographies.length >= 1) score += 0.05
    if ((input.exclusions?.industries?.length ?? 0) + (input.exclusions?.geographies?.length ?? 0) > 0) score += 0.1
    return Math.min(1, Number(score.toFixed(2)))
}

export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })

    const mode = req.nextUrl.searchParams.get('mode')
    const orgId = req.nextUrl.searchParams.get('org_id')
    if (mode === 'options') {
        if (!orgId) return NextResponse.json({ error: 'org_id is required for options mode' }, { status: 400 })
        const { data: offers, error: offersError } = await supabase
            .from('offer')
            .select('id, name')
            .eq('partner_id', orgId)
            .order('created_at', { ascending: false })
        if (offersError) return NextResponse.json({ error: offersError.message }, { status: 500 })
        return NextResponse.json({ offers: offers ?? [] })
    }
    const limit = Math.max(1, Math.min(200, Number(req.nextUrl.searchParams.get('limit') ?? 100)))

    let query = supabase
        .from('icp')
        .select('id, partner_id, offer_id, external_icp_id, name, criteria, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (orgId) query = query.eq('partner_id', orgId)

    const { data: icps, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!icps?.length) return NextResponse.json({ icps: [] })

    const icpIds = icps.map((i) => i.id)
    const [{ data: pools }, { data: decisions }] = await Promise.all([
        supabase.from('identity_pool').select('id, icp_id').in('icp_id', icpIds).eq('is_active', true),
        supabase.from('contact_decisions').select('id, icp_id, decision').in('icp_id', icpIds),
    ])

    const poolCount = new Map<string, number>()
    for (const p of pools ?? []) poolCount.set(p.icp_id, (poolCount.get(p.icp_id) ?? 0) + 1)

    const decisionCount = new Map<string, { contactNow: number; delay: number; suppress: number }>()
    for (const d of decisions ?? []) {
        const entry = decisionCount.get(d.icp_id) ?? { contactNow: 0, delay: 0, suppress: 0 }
        if (d.decision === 'CONTACT_NOW') entry.contactNow += 1
        if (d.decision === 'DELAY') entry.delay += 1
        if (d.decision === 'SUPPRESS') entry.suppress += 1
        decisionCount.set(d.icp_id, entry)
    }

    return NextResponse.json({
        icps: icps.map((i) => ({
            ...i,
            identity_pool_count: poolCount.get(i.id) ?? 0,
            decisions: decisionCount.get(i.id) ?? { contactNow: 0, delay: 0, suppress: 0 },
        })),
    })
}

export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    const input = parsed.data

    if (input.revenue_band_max <= input.revenue_band_min) {
        return NextResponse.json({ error: 'Invalid revenue band: max must be greater than min' }, { status: 400 })
    }

    const { data: offer, error: offerError } = await supabase
        .from('offer')
        .select('id')
        .eq('id', input.offer_id)
        .eq('partner_id', input.org_id)
        .single()
    if (offerError || !offer) return NextResponse.json({ error: 'Offer not found for org' }, { status: 404 })

    const criteria = {
        segmentation_version: 'v1',
        taxonomy_segments: input.taxonomy_segments,
        firmographics: {
            revenue_band: { min: input.revenue_band_min, max: input.revenue_band_max },
            employee_band: (typeof input.employee_band_min === 'number' && typeof input.employee_band_max === 'number')
                ? { min: input.employee_band_min, max: input.employee_band_max }
                : null,
            geographies: input.geographies,
            primary_industries: input.primary_industries,
            required_technologies: input.required_technologies,
        },
        persona: {
            seniority_levels: input.seniority_levels,
            buying_roles: input.buying_roles,
        },
        intent: {
            in_market_signals: input.in_market_signals,
        },
        exclusions: input.exclusions,
        notes: input.notes ?? null,
        quality: {
            coverage_score: coverageScore(input),
            generated_at: new Date().toISOString(),
            generated_by_admin_id: admin.id,
        },
    }

    const { data: icp, error: insertError } = await supabase
        .from('icp')
        .insert({
            partner_id: input.org_id,
            offer_id: input.offer_id,
            external_icp_id: input.external_icp_id ?? null,
            name: input.name,
            criteria,
            status: 'active',
        })
        .select('id, partner_id, offer_id, external_icp_id, name, criteria, status, created_at')
        .single()

    if (insertError || !icp) return NextResponse.json({ error: `Failed to create ICP: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
    return NextResponse.json({ success: true, icp }, { status: 201 })
}
