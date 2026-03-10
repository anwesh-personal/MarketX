import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const candidateSchema = z.object({
    external_person_id: z.string().optional(),
    full_name: z.string().min(2),
    email: z.string().email(),
    company_name: z.string().optional(),
    title: z.string().optional(),
    seniority_level: z.string().optional(),
    buying_role: z.string().optional(),
    country: z.string().optional(),
    industry: z.string().optional(),
    annual_revenue: z.number().nonnegative().optional(),
    employee_count: z.number().int().nonnegative().optional(),
    technologies: z.array(z.string()).optional().default([]),
    identity_confidence: z.number().min(0).max(1).optional(),
    in_market_signals: z.array(z.string()).optional().default([]),
    verification_status: z.enum(['verified', 'risky', 'invalid', 'unknown']).optional(),
})

const sourceSchema = z.object({
    source: z.enum(['manual_import', 'imt', 'enrichment', 'api']).optional().default('api'),
    candidates: z.array(candidateSchema).min(1).max(500),
})

function domainOf(email: string) {
    const idx = email.indexOf('@')
    return idx > -1 ? email.slice(idx + 1).toLowerCase() : ''
}

function lowerSet(values: Array<string | null | undefined>) {
    return new Set(values.map((v) => (v || '').toLowerCase()).filter(Boolean))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = sourceSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const icpId = params.id
    const { data: icp, error: icpError } = await supabase
        .from('icp')
        .select('id, partner_id, criteria')
        .eq('id', icpId)
        .single()
    if (icpError || !icp) return NextResponse.json({ error: 'ICP not found' }, { status: 404 })

    const [{ data: globalSupp }, { data: partnerSupp }] = await Promise.all([
        supabase.from('global_contact_suppression').select('email, domain').eq('is_active', true),
        supabase.from('partner_contact_suppression').select('email, domain').eq('partner_id', icp.partner_id).eq('is_active', true),
    ])

    const globalEmailSet = lowerSet((globalSupp ?? []).map((s) => s.email))
    const globalDomainSet = lowerSet((globalSupp ?? []).map((s) => s.domain))
    const partnerEmailSet = lowerSet((partnerSupp ?? []).map((s) => s.email))
    const partnerDomainSet = lowerSet((partnerSupp ?? []).map((s) => s.domain))

    const criteria = (icp.criteria as any) || {}
    const allowedIndustries = lowerSet(criteria.firmographics?.primary_industries ?? [])
    const allowedGeographies = lowerSet(criteria.firmographics?.geographies ?? [])
    const allowedSeniority = lowerSet(criteria.persona?.seniority_levels ?? [])
    const allowedRoles = lowerSet(criteria.persona?.buying_roles ?? [])
    const minRevenue = Number(criteria.firmographics?.revenue_band?.min ?? 0)
    const maxRevenue = Number(criteria.firmographics?.revenue_band?.max ?? Number.MAX_SAFE_INTEGER)

    const toUpsert = []
    let suppressed = 0
    let rejected = 0

    for (const c of parsed.data.candidates) {
        const email = c.email.toLowerCase()
        const domain = domainOf(email)

        if (
            globalEmailSet.has(email) || partnerEmailSet.has(email) ||
            globalDomainSet.has(domain) || partnerDomainSet.has(domain)
        ) {
            suppressed += 1
            continue
        }

        if (allowedIndustries.size && c.industry && !allowedIndustries.has(c.industry.toLowerCase())) { rejected += 1; continue }
        if (allowedGeographies.size && c.country && !allowedGeographies.has(c.country.toLowerCase())) { rejected += 1; continue }
        if (allowedSeniority.size && c.seniority_level && !allowedSeniority.has(c.seniority_level.toLowerCase())) { rejected += 1; continue }
        if (allowedRoles.size && c.buying_role && !allowedRoles.has(c.buying_role.toLowerCase())) { rejected += 1; continue }
        if (typeof c.annual_revenue === 'number' && (c.annual_revenue < minRevenue || c.annual_revenue > maxRevenue)) { rejected += 1; continue }

        toUpsert.push({
            partner_id: icp.partner_id,
            icp_id: icp.id,
            source: parsed.data.source,
            external_person_id: c.external_person_id ?? null,
            full_name: c.full_name,
            email,
            domain,
            company_name: c.company_name ?? null,
            title: c.title ?? null,
            seniority_level: c.seniority_level ?? null,
            buying_role: c.buying_role ?? null,
            country: c.country ?? null,
            industry: c.industry ?? null,
            annual_revenue: c.annual_revenue ?? null,
            employee_count: c.employee_count ?? null,
            technologies: c.technologies ?? [],
            verification_status: c.verification_status ?? 'unknown',
            identity_confidence: c.identity_confidence ?? 0.5,
            in_market_signals: c.in_market_signals ?? [],
            is_active: true,
            is_suppressed: false,
            suppression_reason: null,
        })
    }

    if (!toUpsert.length) {
        return NextResponse.json({ success: true, imported: 0, suppressed, rejected })
    }

    const { data: rows, error: upsertError } = await supabase
        .from('identity_pool')
        .upsert(toUpsert, { onConflict: 'partner_id,icp_id,email' })
        .select('id, email, company_name, title, verification_status, identity_confidence')

    if (upsertError) return NextResponse.json({ error: `Failed to upsert identity pool: ${upsertError.message}` }, { status: 500 })

    return NextResponse.json({
        success: true,
        imported: rows?.length ?? 0,
        suppressed,
        rejected,
        identities: rows ?? [],
    }, { status: 201 })
}
