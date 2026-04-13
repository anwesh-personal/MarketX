/**
 * Superadmin KB API — Org-Scoped Questionnaire Management
 *
 * GET  /api/superadmin/kb?org_id=xxx — Load questionnaire for a specific org
 * GET  /api/superadmin/kb              — List all orgs with KB status (dashboard)
 *
 * This is the superadmin counterpart to /api/kb/onboarding/route.ts.
 * Uses getSuperadmin() auth — no cookie-based user context.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
    const admin = await getSuperadmin(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = request.nextUrl.searchParams.get('org_id')

    // ─── If org_id provided: return that org's questionnaire + sections ──
    if (orgId) {
        const { data: questionnaire, error } = await supabase
            .from('kb_questionnaire_responses')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!questionnaire) {
            return NextResponse.json({
                success: true,
                questionnaire: null,
                message: 'No questionnaire found for this organization',
            })
        }

        // Also grab sections if they exist
        const { data: sections } = await supabase
            .from('kb_master_sections')
            .select('section_number, section_title, status, content, generation_pass, generation_type, reviewer_notes, generation_duration_ms, provider_used, model_used, reviewed_by, reviewed_at, edit_history, ai_grade')
            .eq('questionnaire_id', questionnaire.id)
            .eq('org_id', orgId)
            .order('section_number', { ascending: true })

        // Load org name for display
        const { data: org } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', orgId)
            .single()

        return NextResponse.json({
            success: true,
            questionnaire,
            sections: sections || [],
            organization: org,
        })
    }

    // ─── No org_id: return dashboard of all orgs with KB status ─────
    const { data: orgs, error: orgsErr } = await supabase
        .from('organizations')
        .select('id, name, slug, plan, status')
        .eq('status', 'active')
        .order('name', { ascending: true })

    if (orgsErr) {
        return NextResponse.json({ error: orgsErr.message }, { status: 500 })
    }

    // Fetch questionnaire status for each org (batch query)
    const orgIds = orgs.map(o => o.id)
    const { data: questionnaires } = await supabase
        .from('kb_questionnaire_responses')
        .select('id, org_id, status, created_at, submitted_at, locked_at, company_name')
        .in('org_id', orgIds)
        .order('created_at', { ascending: false })

    // Group by org (take latest per org)
    const qrByOrg = new Map<string, any>()
    for (const qr of (questionnaires || [])) {
        if (!qrByOrg.has(qr.org_id)) {
            qrByOrg.set(qr.org_id, qr)
        }
    }

    // Get section counts per questionnaire
    const qrIds = [...qrByOrg.values()].map(q => q.id)
    const { data: sectionCounts } = qrIds.length > 0
        ? await supabase
            .from('kb_master_sections')
            .select('questionnaire_id, status')
            .in('questionnaire_id', qrIds)
        : { data: [] }

    // Aggregate section stats per questionnaire
    const sectionStats = new Map<string, { total: number; approved: number; failed: number; draft: number }>()
    for (const s of (sectionCounts || [])) {
        if (!sectionStats.has(s.questionnaire_id)) {
            sectionStats.set(s.questionnaire_id, { total: 0, approved: 0, failed: 0, draft: 0 })
        }
        const stat = sectionStats.get(s.questionnaire_id)!
        stat.total++
        if (s.status === 'approved' || s.status === 'locked') stat.approved++
        if (s.status === 'failed') stat.failed++
        if (s.status === 'draft') stat.draft++
    }

    const dashboard = orgs.map(org => {
        const qr = qrByOrg.get(org.id)
        const stats = qr ? sectionStats.get(qr.id) : null

        return {
            org_id: org.id,
            org_name: org.name,
            org_slug: org.slug,
            org_plan: org.plan,
            questionnaire_id: qr?.id || null,
            questionnaire_status: qr?.status || 'not_started',
            company_name: qr?.company_name || null,
            submitted_at: qr?.submitted_at || null,
            locked_at: qr?.locked_at || null,
            sections: stats || null,
        }
    })

    return NextResponse.json({
        success: true,
        dashboard,
    })
}
