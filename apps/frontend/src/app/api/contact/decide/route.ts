import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
    icp_id: z.string().uuid(),
    limit: z.number().int().min(1).max(500).optional().default(100),
    min_confidence: z.number().min(0).max(1).optional().default(0.35),
})

type Decision = 'CONTACT_NOW' | 'DELAY' | 'SUPPRESS'

function decideIdentity(identity: any, minConfidence: number): { decision: Decision; confidence: number; reasonCodes: string[]; rationale: string; recommendedDelayDays?: number } {
    const reasonCodes: string[] = []
    let score = Number(identity.identity_confidence ?? 0.5)

    if (identity.is_suppressed) {
        return {
            decision: 'SUPPRESS',
            confidence: 1,
            reasonCodes: ['SUPPRESSED'],
            rationale: 'Identity is suppressed by compliance or hygiene policy.',
        }
    }

    if (identity.verification_status === 'invalid') {
        return {
            decision: 'SUPPRESS',
            confidence: 0.95,
            reasonCodes: ['INVALID_EMAIL'],
            rationale: 'Identity verification status is invalid.',
        }
    }

    if (identity.verification_status === 'risky') {
        score -= 0.2
        reasonCodes.push('RISKY_VERIFICATION')
    }

    if (Array.isArray(identity.in_market_signals) && identity.in_market_signals.length > 0) {
        score += 0.15
        reasonCodes.push('IN_MARKET_SIGNAL')
    }

    if (!identity.buying_role) reasonCodes.push('UNKNOWN_BUYING_ROLE')
    if (!identity.seniority_level) reasonCodes.push('UNKNOWN_SENIORITY')

    score = Math.max(0, Math.min(1, Number(score.toFixed(5))))

    if (score < minConfidence) {
        return {
            decision: 'DELAY',
            confidence: score,
            reasonCodes: [...reasonCodes, 'LOW_CONFIDENCE'],
            rationale: 'Identity does not meet minimum confidence threshold for immediate outreach.',
            recommendedDelayDays: 14,
        }
    }

    return {
        decision: 'CONTACT_NOW',
        confidence: score,
        reasonCodes: reasonCodes.length ? reasonCodes : ['FIT_OK'],
        rationale: 'Identity meets confidence and hygiene requirements for outreach.',
    }
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
        return NextResponse.json({ error: 'Only admin/owner can run contact decisions' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    const { data: icp, error: icpError } = await supabase
        .from('icp')
        .select('id, partner_id')
        .eq('id', input.icp_id)
        .eq('partner_id', me.org_id)
        .single()
    if (icpError || !icp) return NextResponse.json({ error: 'ICP not found for this org' }, { status: 404 })

    const { data: identities, error: identitiesError } = await supabase
        .from('identity_pool')
        .select('id, partner_id, icp_id, email, verification_status, identity_confidence, in_market_signals, is_suppressed, buying_role, seniority_level')
        .eq('partner_id', me.org_id)
        .eq('icp_id', input.icp_id)
        .eq('is_active', true)
        .order('identity_confidence', { ascending: false })
        .limit(input.limit)

    if (identitiesError) {
        return NextResponse.json({ error: `Failed to load identity pool: ${identitiesError.message}` }, { status: 500 })
    }
    if (!identities?.length) {
        return NextResponse.json({ success: true, decisions: [], message: 'No active identities found for this ICP.' })
    }

    const nowIso = new Date().toISOString()
    const decisionRows = identities.map((identity) => {
        const d = decideIdentity(identity, input.min_confidence)
        return {
            partner_id: me.org_id,
            icp_id: input.icp_id,
            identity_id: identity.id,
            decision: d.decision,
            confidence_score: d.confidence,
            reason_codes: d.reasonCodes,
            rationale: d.rationale,
            recommended_delay_days: d.recommendedDelayDays ?? null,
            decided_at: nowIso,
            meta: {
                min_confidence: input.min_confidence,
                identity_email: identity.email,
            },
        }
    })

    const { data: inserted, error: insertError } = await supabase
        .from('contact_decisions')
        .insert(decisionRows)
        .select('id, identity_id, decision, confidence_score, reason_codes, rationale, recommended_delay_days, decided_at')

    if (insertError) {
        return NextResponse.json({ error: `Failed to persist contact decisions: ${insertError.message}` }, { status: 500 })
    }

    const summary = {
        CONTACT_NOW: inserted?.filter((r) => r.decision === 'CONTACT_NOW').length ?? 0,
        DELAY: inserted?.filter((r) => r.decision === 'DELAY').length ?? 0,
        SUPPRESS: inserted?.filter((r) => r.decision === 'SUPPRESS').length ?? 0,
    }

    return NextResponse.json({
        success: true,
        icp_id: input.icp_id,
        total: inserted?.length ?? 0,
        summary,
        decisions: inserted ?? [],
    }, { status: 201 })
}
