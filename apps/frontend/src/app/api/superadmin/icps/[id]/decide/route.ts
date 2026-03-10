import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const schema = z.object({
    limit: z.number().int().min(1).max(500).optional().default(100),
    min_confidence: z.number().min(0).max(1).optional().default(0.35),
})

type Decision = 'CONTACT_NOW' | 'DELAY' | 'SUPPRESS'

function makeDecision(identity: any, minConfidence: number): { decision: Decision; confidence: number; reasonCodes: string[]; rationale: string; delay?: number } {
    const reasonCodes: string[] = []
    let score = Number(identity.identity_confidence ?? 0.5)

    if (identity.is_suppressed) return { decision: 'SUPPRESS', confidence: 1, reasonCodes: ['SUPPRESSED'], rationale: 'Suppressed identity.' }
    if (identity.verification_status === 'invalid') return { decision: 'SUPPRESS', confidence: 0.95, reasonCodes: ['INVALID_EMAIL'], rationale: 'Invalid verification status.' }
    if (identity.verification_status === 'risky') { score -= 0.2; reasonCodes.push('RISKY_VERIFICATION') }
    if (Array.isArray(identity.in_market_signals) && identity.in_market_signals.length > 0) { score += 0.15; reasonCodes.push('IN_MARKET_SIGNAL') }
    if (!identity.buying_role) reasonCodes.push('UNKNOWN_BUYING_ROLE')
    if (!identity.seniority_level) reasonCodes.push('UNKNOWN_SENIORITY')

    score = Math.max(0, Math.min(1, Number(score.toFixed(5))))
    if (score < minConfidence) {
        return {
            decision: 'DELAY',
            confidence: score,
            reasonCodes: [...reasonCodes, 'LOW_CONFIDENCE'],
            rationale: 'Below minimum confidence threshold.',
            delay: 14,
        }
    }

    return {
        decision: 'CONTACT_NOW',
        confidence: score,
        reasonCodes: reasonCodes.length ? reasonCodes : ['FIT_OK'],
        rationale: 'Meets confidence and hygiene requirements.',
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { body = {} }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const icpId = params.id
    const { data: icp, error: icpError } = await supabase
        .from('icp')
        .select('id, partner_id')
        .eq('id', icpId)
        .single()
    if (icpError || !icp) return NextResponse.json({ error: 'ICP not found' }, { status: 404 })

    const { data: identities, error: identitiesError } = await supabase
        .from('identity_pool')
        .select('id, email, verification_status, identity_confidence, in_market_signals, is_suppressed, buying_role, seniority_level')
        .eq('partner_id', icp.partner_id)
        .eq('icp_id', icp.id)
        .eq('is_active', true)
        .order('identity_confidence', { ascending: false })
        .limit(parsed.data.limit)

    if (identitiesError) return NextResponse.json({ error: identitiesError.message }, { status: 500 })
    if (!identities?.length) return NextResponse.json({ success: true, decisions: [], message: 'No active identities found.' })

    const decidedAt = new Date().toISOString()
    const rows = identities.map((identity) => {
        const d = makeDecision(identity, parsed.data.min_confidence)
        return {
            partner_id: icp.partner_id,
            icp_id: icp.id,
            identity_id: identity.id,
            decision: d.decision,
            confidence_score: d.confidence,
            reason_codes: d.reasonCodes,
            rationale: d.rationale,
            recommended_delay_days: d.delay ?? null,
            decided_at: decidedAt,
            meta: {
                min_confidence: parsed.data.min_confidence,
                identity_email: identity.email,
                decided_by_admin_id: admin.id,
            },
        }
    })

    const { data: inserted, error: insertError } = await supabase
        .from('contact_decisions')
        .insert(rows)
        .select('id, identity_id, decision, confidence_score, reason_codes, rationale, recommended_delay_days, decided_at')

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({
        success: true,
        total: inserted?.length ?? 0,
        summary: {
            CONTACT_NOW: inserted?.filter((r) => r.decision === 'CONTACT_NOW').length ?? 0,
            DELAY: inserted?.filter((r) => r.decision === 'DELAY').length ?? 0,
            SUPPRESS: inserted?.filter((r) => r.decision === 'SUPPRESS').length ?? 0,
        },
        decisions: inserted ?? [],
    }, { status: 201 })
}
