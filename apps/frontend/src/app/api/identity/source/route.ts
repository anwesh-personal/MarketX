import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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
    icp_id: z.string().uuid(),
    source: z.enum(['manual_import', 'imt', 'enrichment', 'api']).optional().default('api'),
    candidates: z.array(candidateSchema).min(1).max(500),
})

function getDomain(email: string): string {
    const idx = email.indexOf('@')
    return idx > -1 ? email.slice(idx + 1).toLowerCase() : ''
}

function toRoleValue(v?: string): string {
    return (v || '').trim().toLowerCase()
}

function isSuppressed(email: string, domain: string, globalSet: Set<string>, globalDomains: Set<string>, partnerSet: Set<string>, partnerDomains: Set<string>) {
    return globalSet.has(email) || partnerSet.has(email) || globalDomains.has(domain) || partnerDomains.has(domain)
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
        return NextResponse.json({ error: 'Only admin/owner can source identities' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

    const parsed = sourceSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    const { data: icp, error: icpError } = await supabase
        .from('icp')
        .select('id, partner_id, criteria')
        .eq('id', input.icp_id)
        .eq('partner_id', me.org_id)
        .single()
    if (icpError || !icp) return NextResponse.json({ error: 'ICP not found for this org' }, { status: 404 })

    const [{ data: globalSupp }, { data: partnerSupp }] = await Promise.all([
        supabase
            .from('global_contact_suppression')
            .select('email, domain')
            .eq('is_active', true),
        supabase
            .from('partner_contact_suppression')
            .select('email, domain')
            .eq('partner_id', me.org_id)
            .eq('is_active', true),
    ])

    const globalEmailSet = new Set((globalSupp ?? []).map((s) => (s.email || '').toLowerCase()).filter(Boolean))
    const globalDomainSet = new Set((globalSupp ?? []).map((s) => (s.domain || '').toLowerCase()).filter(Boolean))
    const partnerEmailSet = new Set((partnerSupp ?? []).map((s) => (s.email || '').toLowerCase()).filter(Boolean))
    const partnerDomainSet = new Set((partnerSupp ?? []).map((s) => (s.domain || '').toLowerCase()).filter(Boolean))

    const criteria = (icp.criteria as any) || {}
    const allowedIndustries = new Set(((criteria.firmographics?.primary_industries ?? []) as string[]).map((v) => v.toLowerCase()))
    const allowedGeographies = new Set(((criteria.firmographics?.geographies ?? []) as string[]).map((v) => v.toLowerCase()))
    const allowedSeniority = new Set(((criteria.persona?.seniority_levels ?? []) as string[]).map((v) => v.toLowerCase()))
    const allowedRoles = new Set(((criteria.persona?.buying_roles ?? []) as string[]).map((v) => v.toLowerCase()))
    const minRevenue = Number(criteria.firmographics?.revenue_band?.min ?? 0)
    const maxRevenue = Number(criteria.firmographics?.revenue_band?.max ?? Number.MAX_SAFE_INTEGER)

    const toUpsert = []
    let suppressedCount = 0
    let rejectedCount = 0

    for (const c of input.candidates) {
        const email = c.email.toLowerCase()
        const domain = getDomain(email)
        const suppressed = isSuppressed(email, domain, globalEmailSet, globalDomainSet, partnerEmailSet, partnerDomainSet)

        if (suppressed) {
            suppressedCount += 1
            continue
        }

        // Fitness checks from ICP criteria
        if (allowedIndustries.size && c.industry && !allowedIndustries.has(c.industry.toLowerCase())) { rejectedCount += 1; continue }
        if (allowedGeographies.size && c.country && !allowedGeographies.has(c.country.toLowerCase())) { rejectedCount += 1; continue }
        if (allowedSeniority.size && c.seniority_level && !allowedSeniority.has(toRoleValue(c.seniority_level))) { rejectedCount += 1; continue }
        if (allowedRoles.size && c.buying_role && !allowedRoles.has(toRoleValue(c.buying_role))) { rejectedCount += 1; continue }
        if (typeof c.annual_revenue === 'number' && (c.annual_revenue < minRevenue || c.annual_revenue > maxRevenue)) { rejectedCount += 1; continue }

        toUpsert.push({
            partner_id: me.org_id,
            icp_id: icp.id,
            source: input.source,
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
        return NextResponse.json({
            success: true,
            imported: 0,
            suppressed: suppressedCount,
            rejected: rejectedCount,
            message: 'No candidates passed suppression/hygiene filters',
        })
    }

    const { data: rows, error: upsertError } = await supabase
        .from('identity_pool')
        .upsert(toUpsert, { onConflict: 'partner_id,icp_id,email' })
        .select('id, email, company_name, title, verification_status, identity_confidence')

    if (upsertError) {
        return NextResponse.json({ error: `Failed to upsert identity pool: ${upsertError.message}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        imported: rows?.length ?? 0,
        suppressed: suppressedCount,
        rejected: rejectedCount,
        identities: rows ?? [],
    }, { status: 201 })
}
