import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const constructSchema = z.object({
    offer_id: z.string().uuid('offer_id must be a valid UUID'),
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

function buildCoverageScore(input: z.infer<typeof constructSchema>): number {
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

function validateBands(min: number, max: number): string | null {
    if (max <= min) return 'max must be greater than min'
    return null
}

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
        return NextResponse.json({ error: 'Only admin/owner can construct ICP' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

    const parsed = constructSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const input = parsed.data
    const revenueBandErr = validateBands(input.revenue_band_min, input.revenue_band_max)
    if (revenueBandErr) {
        return NextResponse.json({ error: `Invalid revenue band: ${revenueBandErr}` }, { status: 400 })
    }
    if (typeof input.employee_band_min === 'number' && typeof input.employee_band_max === 'number') {
        const employeeBandErr = validateBands(input.employee_band_min, input.employee_band_max)
        if (employeeBandErr) {
            return NextResponse.json({ error: `Invalid employee band: ${employeeBandErr}` }, { status: 400 })
        }
    }

    const { data: offer, error: offerError } = await supabase
        .from('offer')
        .select('id, partner_id, name')
        .eq('id', input.offer_id)
        .eq('partner_id', me.org_id)
        .single()
    if (offerError || !offer) {
        return NextResponse.json({ error: 'Offer not found for this org' }, { status: 404 })
    }

    const criteria = {
        segmentation_version: 'v1',
        taxonomy_segments: input.taxonomy_segments,
        firmographics: {
            revenue_band: {
                min: input.revenue_band_min,
                max: input.revenue_band_max,
            },
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
            coverage_score: buildCoverageScore(input),
            generated_at: new Date().toISOString(),
            generated_by_user_id: me.id,
        },
    }

    const payload = {
        partner_id: me.org_id,
        offer_id: input.offer_id,
        external_icp_id: input.external_icp_id ?? null,
        name: input.name,
        criteria,
        status: 'active',
    }

    const { data: inserted, error: insertError } = await supabase
        .from('icp')
        .insert(payload)
        .select('id, partner_id, offer_id, external_icp_id, name, criteria, status, created_at')
        .single()

    if (insertError || !inserted) {
        return NextResponse.json({ error: `Failed to create ICP: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        message: 'ICP constructed successfully',
        icp: inserted,
    }, { status: 201 })
}
