/**
 * KB Generation — Trigger & Progress API
 *
 * POST /api/kb/onboarding/generate — Trigger KB generation (enqueue to BullMQ)
 * GET  /api/kb/onboarding/generate?questionnaire_id=xxx — Poll generation progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'
import {
    KB_SECTIONS, getSectionTitle, getSectionPass, getSectionType, TOTAL_SECTIONS,
} from '@/lib/kb-section-registry'

// ─── POST: Trigger KB generation ────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { questionnaire_id } = body

        if (!questionnaire_id) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }

        // Load questionnaire and verify status
        const { data: qr, error: qrErr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('id, org_id, status')
            .eq('id', questionnaire_id)
            .eq('org_id', ctx.orgId)
            .single()

        if (qrErr || !qr) {
            return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 })
        }

        const retriggerable = ['ready_for_generation', 'generation_partial_failure', 'generation_failed']
        if (!retriggerable.includes(qr.status)) {
            return NextResponse.json({
                success: false,
                error: `Cannot generate KB — questionnaire status is "${qr.status}". Must be one of: ${retriggerable.join(', ')}.`,
            }, { status: 400 })
        }

        // ── CRITICAL: Clean up stale section rows on retry ──────────
        // On retry from partial/full failure, previous rows exist.
        // Delete them so we start clean — no unique constraint violations.
        if (['generation_partial_failure', 'generation_failed'].includes(qr.status)) {
            const { error: deleteErr } = await supabaseAdmin
                .from('kb_master_sections')
                .delete()
                .eq('questionnaire_id', questionnaire_id)
                .eq('org_id', ctx.orgId)

            if (deleteErr) {
                console.error('Failed to clean up stale sections:', deleteErr)
                throw deleteErr
            }
        }

        // Update status to generating
        await supabaseAdmin
            .from('kb_questionnaire_responses')
            .update({ status: 'generating', constraint_results: {} })
            .eq('id', questionnaire_id)

        // Create placeholder section rows from registry (not hardcoded loop)
        const sectionInserts = KB_SECTIONS.map(s => ({
            org_id: ctx.orgId,
            questionnaire_id,
            section_number: s.number,
            section_title: s.title,
            content: '',
            status: 'pending',
            generation_pass: s.pass,
            generation_type: s.type,
            version: 1,
        }))

        const { error: insertErr } = await supabaseAdmin
            .from('kb_master_sections')
            .insert(sectionInserts)

        if (insertErr) throw insertErr

        // Enqueue to BullMQ via worker API
        try {
            const workerUrl = process.env.WORKER_URL || 'http://localhost:3002'
            await fetch(`${workerUrl}/api/enqueue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.WORKER_API_SECRET}`,
                },
                body: JSON.stringify({
                    queue: 'KB_GENERATION',
                    job: {
                        type: 'kb_generation',
                        questionnaire_id,
                        org_id: ctx.orgId,
                        user_id: ctx.userId,
                    },
                }),
            })
        } catch (workerErr) {
            console.error('Failed to enqueue KB generation job:', workerErr)
            // Revert status so user can retry
            await supabaseAdmin
                .from('kb_questionnaire_responses')
                .update({ status: qr.status })
                .eq('id', questionnaire_id)

            return NextResponse.json({
                success: false,
                error: 'Failed to reach worker service. The generation could not be started.',
            }, { status: 502 })
        }

        return NextResponse.json({
            success: true,
            message: `KB generation started. ${TOTAL_SECTIONS} sections will be generated sequentially.`,
            questionnaire_id,
        })
    } catch (error: any) {
        console.error('KB generate POST error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── GET: Poll generation progress ─────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const questionnaireId = request.nextUrl.searchParams.get('questionnaire_id')
        if (!questionnaireId) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }

        // Get questionnaire status + failure report
        const { data: qr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('id, status, constraint_results')
            .eq('id', questionnaireId)
            .eq('org_id', ctx.orgId)
            .single()

        if (!qr) {
            return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 })
        }

        // Get section statuses — include content + reviewer_notes for full review context
        const { data: sections } = await supabaseAdmin
            .from('kb_master_sections')
            .select('section_number, section_title, status, content, generation_pass, generation_type, reviewer_notes, generation_duration_ms, provider_used, model_used')
            .eq('questionnaire_id', questionnaireId)
            .eq('org_id', ctx.orgId)
            .order('section_number', { ascending: true })

        const allSections = sections || []
        const completed = allSections.filter(s => ['draft', 'approved', 'locked'].includes(s.status)).length
        const generating = allSections.filter(s => s.status === 'generating').length
        const failed = allSections.filter(s => s.status === 'failed').length
        const pending = allSections.filter(s => s.status === 'pending').length

        // Build failure details for the frontend
        const failedSections = allSections
            .filter(s => s.status === 'failed')
            .map(s => ({
                section_number: s.section_number,
                section_title: s.section_title,
                error: s.reviewer_notes || 'Unknown error',
            }))

        // Surface failure report if it exists
        const failureReport = (['generation_partial_failure', 'generation_failed'].includes(qr.status))
            ? qr.constraint_results
            : null

        return NextResponse.json({
            success: true,
            questionnaire_status: qr.status,
            progress: {
                total: TOTAL_SECTIONS,
                completed,
                generating,
                failed,
                pending,
                percentage: Math.round((completed / TOTAL_SECTIONS) * 100),
            },
            sections: allSections,
            ...(failed > 0 && { failed_sections: failedSections }),
            ...(failureReport && { failure_report: failureReport }),
        })
    } catch (error: any) {
        console.error('KB generate GET error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
