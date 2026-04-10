/**
 * KB Onboarding — Submit Questionnaire
 *
 * POST /api/kb/onboarding/submit
 *
 * Marks the questionnaire as "submitted" and triggers constraint enforcement.
 * If all constraints pass → status = "ready_for_generation"
 * If any constraint fails → status = "needs_revision" with specific failure details
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { questionnaire_id } = body

        if (!questionnaire_id) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }

        // Load the questionnaire
        const { data: qr, error: qrErr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('*')
            .eq('id', questionnaire_id)
            .eq('org_id', ctx.orgId)
            .single()

        if (qrErr || !qr) {
            return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 })
        }

        if (qr.status === 'locked') {
            return NextResponse.json({ success: false, error: 'Questionnaire is already locked' }, { status: 409 })
        }

        // Load segments
        const { data: segments } = await supabaseAdmin
            .from('kb_icp_segments')
            .select('*')
            .eq('questionnaire_id', questionnaire_id)

        // Load artifacts
        const { data: artifacts } = await supabaseAdmin
            .from('kb_artifact_uploads')
            .select('id, category')
            .eq('questionnaire_id', questionnaire_id)

        // Run constraint enforcement
        const constraintResults = runConstraintEnforcement(qr, segments || [], artifacts || [])
        const allPassed = Object.values(constraintResults).every((c: any) => c.passed)

        // Update status
        const newStatus = allPassed ? 'ready_for_generation' : 'needs_revision'

        const { error: updateErr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .update({
                status: newStatus,
                submitted_at: new Date().toISOString(),
                constraint_results: constraintResults,
            })
            .eq('id', questionnaire_id)

        if (updateErr) throw updateErr

        return NextResponse.json({
            success: true,
            status: newStatus,
            all_passed: allPassed,
            constraints: constraintResults,
        })
    } catch (error: any) {
        console.error('KB questionnaire submit error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── Constraint Enforcement Engine ──────────────────────────────

interface ConstraintResult {
    passed: boolean
    reason?: string
    fields?: string[]
}

function runConstraintEnforcement(
    qr: any,
    segments: any[],
    artifacts: any[],
): Record<string, ConstraintResult> {
    const results: Record<string, ConstraintResult> = {}

    // CE-1: ICP Clarity
    // Each segment must have specific industry + size + at least 3 pain points
    if (segments.length === 0) {
        results['CE-1'] = {
            passed: false,
            reason: 'No ICP segments defined. Define at least 1 ICP segment with specific industries, company sizes, and pain points.',
            fields: ['icp_segments'],
        }
    } else {
        const weakSegments = segments.filter(s => {
            const industries = Array.isArray(s.target_industries) ? s.target_industries : []
            const sizes = Array.isArray(s.company_size) ? s.company_size : []
            const painLen = (s.pain_points || '').trim().length
            return industries.length === 0 || sizes.length === 0 || painLen < 50
        })
        if (weakSegments.length > 0) {
            results['CE-1'] = {
                passed: false,
                reason: `ICP segment(s) "${weakSegments.map((s: any) => s.segment_name).join(', ')}" need more detail: specific industries, company sizes, and at least 50 characters describing pain points.`,
                fields: weakSegments.map((s: any) => `segment_${s.id}`),
            }
        } else {
            results['CE-1'] = { passed: true }
        }
    }

    // CE-2: Buying Role Definition
    // Each segment must have economic buyer + champion + operational owner
    const missingRoles = segments.filter(s =>
        !s.economic_buyer_title?.trim() ||
        !s.champion_title?.trim() ||
        !s.operational_owner_title?.trim()
    )
    if (segments.length === 0 || missingRoles.length > 0) {
        results['CE-2'] = {
            passed: false,
            reason: segments.length === 0
                ? 'No ICP segments defined — cannot validate buying roles.'
                : `Segment(s) "${missingRoles.map((s: any) => s.segment_name).join(', ')}" are missing buying role definitions (economic buyer, champion, operational owner).`,
            fields: ['buying_roles'],
        }
    } else {
        results['CE-2'] = { passed: true }
    }

    // CE-3: Value Proposition Strength
    // Must have real_buy_reason (50+ chars) + top_differentiator (30+ chars) + measurable_outcomes (50+ chars)
    const vpFails: string[] = []
    if (!qr.real_buy_reason || qr.real_buy_reason.trim().length < 50) vpFails.push('real_buy_reason')
    if (!qr.top_differentiator || qr.top_differentiator.trim().length < 30) vpFails.push('top_differentiator')
    if (!qr.measurable_outcomes || qr.measurable_outcomes.trim().length < 50) vpFails.push('measurable_outcomes')

    if (vpFails.length > 0) {
        results['CE-3'] = {
            passed: false,
            reason: `Value proposition is too weak. Fields need more detail: ${vpFails.join(', ')}. Provide specific outcomes, clear differentiation, and real reasons buyers sign.`,
            fields: vpFails,
        }
    } else {
        results['CE-3'] = { passed: true }
    }

    // CE-4: Proof Point Verification
    // Must have at least 1 case study upload OR measurable outcomes with numbers
    const hasCaseStudyUpload = artifacts.some(a => a.category === 'case_study')
    const hasQuantifiedResults = /\d+%|\$\d|[0-9]+x|\d+ (days|weeks|months|hours)/.test(qr.measurable_outcomes || '')

    if (!hasCaseStudyUpload && !hasQuantifiedResults) {
        results['CE-4'] = {
            passed: false,
            reason: 'No proof points found. Upload at least one case study, OR include specific numbers in your measurable outcomes (e.g., "reduced costs by 34%" or "saved 6 weeks").',
            fields: ['measurable_outcomes', 'artifacts_case_study'],
        }
    } else {
        results['CE-4'] = { passed: true }
    }

    // CE-5: Sales Process Definition
    // Must have qualification + disqualification criteria
    const qualLen = (qr.qualification_criteria || '').trim().length
    const disqualLen = (qr.disqualification_criteria || '').trim().length

    if (qualLen < 30 || disqualLen < 20) {
        results['CE-5'] = {
            passed: false,
            reason: 'Sales process needs clearer qualification and disqualification criteria. Be specific about what makes a lead qualified or disqualified.',
            fields: ['qualification_criteria', 'disqualification_criteria'],
        }
    } else {
        results['CE-5'] = { passed: true }
    }

    // CE-6: Objection Coverage
    // Must list at least 3 distinct objections
    const objections = (qr.top_objections || '').trim()
    const objectionCount = objections.split(/\n|[0-9]+[\.\)]/g).filter((l: string) => l.trim().length > 10).length

    if (objectionCount < 3) {
        results['CE-6'] = {
            passed: false,
            reason: `Only ${objectionCount} objections detected (need at least 3). List your top 5 objections with handling strategies.`,
            fields: ['top_objections', 'objection_responses'],
        }
    } else {
        results['CE-6'] = { passed: true }
    }

    // CE-7: Artifact Completeness
    // At least 1 artifact uploaded
    if (!artifacts || artifacts.length === 0) {
        results['CE-7'] = {
            passed: false,
            reason: 'No supporting materials uploaded. Upload at least one document (sales deck, case study, or competitive analysis).',
            fields: ['artifacts'],
        }
    } else {
        results['CE-7'] = { passed: true }
    }

    return results
}
