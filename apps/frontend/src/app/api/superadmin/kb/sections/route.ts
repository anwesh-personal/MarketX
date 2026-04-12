/**
 * Superadmin KB Sections API — Review Actions (org-scoped)
 *
 * PUT  /api/superadmin/kb/sections — Approve, reject, edit a section for any org
 * POST /api/superadmin/kb/sections — Lock KB, bulk approve, or regenerate single section
 *
 * Unlike the member API, this accepts org_id in the body and validates
 * via getSuperadmin() instead of cookie-based getAuthContext().
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { createClient } from '@supabase/supabase-js'
import { TOTAL_SECTIONS, KB_SECTIONS } from '@/lib/kb-section-registry'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── PUT: Section actions (approve / reject / edit) ─────────────
export async function PUT(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { org_id, questionnaire_id, section_number, action, content, reviewer_notes } = body

        if (!org_id || !questionnaire_id || section_number === undefined || section_number === null) {
            return NextResponse.json({
                success: false,
                error: 'org_id, questionnaire_id, and section_number are required',
            }, { status: 400 })
        }

        if (!['approve', 'reject', 'edit'].includes(action)) {
            return NextResponse.json({ success: false, error: 'action must be approve, reject, or edit' }, { status: 400 })
        }

        // Load section (no ownership check — superadmin has access to all)
        const { data: section, error: secErr } = await supabase
            .from('kb_master_sections')
            .select('id, status, content, edit_history')
            .eq('questionnaire_id', questionnaire_id)
            .eq('section_number', section_number)
            .eq('org_id', org_id)
            .single()

        if (secErr || !section) {
            return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 })
        }

        // Validate state transitions
        const allowedTransitions: Record<string, string[]> = {
            approve: ['draft', 'rejected'],
            reject: ['draft'],
            edit: ['draft', 'approved'],
        }

        if (!allowedTransitions[action]?.includes(section.status)) {
            return NextResponse.json({
                success: false,
                error: `Cannot ${action} a section with status "${section.status}". Allowed from: ${allowedTransitions[action]?.join(', ')}`,
            }, { status: 409 })
        }

        const now = new Date().toISOString()
        const updatePayload: Record<string, any> = {}

        switch (action) {
            case 'approve':
                updatePayload.status = 'approved'
                updatePayload.reviewed_by = admin.id
                updatePayload.reviewed_at = now
                updatePayload.reviewer_notes = null
                break

            case 'reject':
                if (!reviewer_notes?.trim()) {
                    return NextResponse.json({
                        success: false,
                        error: 'reviewer_notes is required when rejecting a section',
                    }, { status: 400 })
                }
                updatePayload.status = 'rejected'
                updatePayload.reviewed_by = admin.id
                updatePayload.reviewed_at = now
                updatePayload.reviewer_notes = reviewer_notes
                break

            case 'edit':
                if (!content?.trim()) {
                    return NextResponse.json({
                        success: false,
                        error: 'content is required when editing a section',
                    }, { status: 400 })
                }

                // Track edit history — preserve what the AI generated
                const editHistory = Array.isArray(section.edit_history) ? section.edit_history : []
                editHistory.push({
                    edited_by: admin.id,
                    edited_by_email: admin.email,
                    edited_at: now,
                    previous_content: section.content,
                    previous_length: section.content?.length || 0,
                    new_length: content.length,
                })

                updatePayload.content = content
                updatePayload.status = 'draft'
                updatePayload.edit_history = editHistory
                updatePayload.reviewer_notes = null
                break
        }

        const { error: upErr } = await supabase
            .from('kb_master_sections')
            .update(updatePayload)
            .eq('id', section.id)

        if (upErr) throw upErr

        return NextResponse.json({
            success: true,
            action,
            section_number,
            new_status: updatePayload.status,
        })
    } catch (error: any) {
        console.error('Superadmin KB sections PUT error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── POST: Lock KB / Bulk Approve / Regenerate Section ──────────
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { org_id, questionnaire_id, action, section_numbers } = body

        if (!org_id || !questionnaire_id) {
            return NextResponse.json({
                success: false,
                error: 'org_id and questionnaire_id are required',
            }, { status: 400 })
        }

        // ─── BULK APPROVE ─────────────────────────────────────────
        if (action === 'bulk_approve') {
            const { data: draftSections, error: fetchErr } = await supabase
                .from('kb_master_sections')
                .select('id, section_number, status')
                .eq('questionnaire_id', questionnaire_id)
                .eq('org_id', org_id)
                .in('status', ['draft', 'rejected'])

            if (fetchErr) throw fetchErr

            if (!draftSections || draftSections.length === 0) {
                return NextResponse.json({
                    success: true,
                    message: 'No sections to approve — all are already approved or locked.',
                    approved_count: 0,
                })
            }

            const now = new Date().toISOString()
            const ids = draftSections.map(s => s.id)

            const { error: updateErr } = await supabase
                .from('kb_master_sections')
                .update({
                    status: 'approved',
                    reviewed_by: admin.id,
                    reviewed_at: now,
                    reviewer_notes: null,
                })
                .in('id', ids)

            if (updateErr) throw updateErr

            return NextResponse.json({
                success: true,
                message: `Bulk approved ${ids.length} section(s).`,
                approved_count: ids.length,
                approved_sections: draftSections.map(s => s.section_number),
            })
        }

        // ─── LOCK ─────────────────────────────────────────────────
        if (action === 'lock') {
            const { data: sections } = await supabase
                .from('kb_master_sections')
                .select('section_number, status')
                .eq('questionnaire_id', questionnaire_id)
                .eq('org_id', org_id)

            if (!sections || sections.length === 0) {
                return NextResponse.json({ success: false, error: 'No sections found' }, { status: 404 })
            }

            const notApproved = sections.filter(s => s.status !== 'approved' && s.status !== 'locked')
            if (notApproved.length > 0) {
                return NextResponse.json({
                    success: false,
                    error: `Cannot lock — ${notApproved.length} section(s) not approved: ${
                        notApproved.map(s => `Section ${s.section_number} (${s.status})`).join(', ')
                    }`,
                    unapproved_sections: notApproved,
                }, { status: 409 })
            }

            const { error: lockSecErr } = await supabase
                .from('kb_master_sections')
                .update({ status: 'locked' })
                .eq('questionnaire_id', questionnaire_id)
                .eq('org_id', org_id)

            if (lockSecErr) throw lockSecErr

            const { error: lockQrErr } = await supabase
                .from('kb_questionnaire_responses')
                .update({
                    status: 'locked',
                    locked_at: new Date().toISOString(),
                })
                .eq('id', questionnaire_id)

            if (lockQrErr) throw lockQrErr

            return NextResponse.json({
                success: true,
                message: `Knowledge Base locked. ${sections.length} sections are now the source of truth.`,
            })
        }

        // ─── REGENERATE SPECIFIC SECTIONS ─────────────────────────
        if (action === 'regenerate_sections') {
            if (!Array.isArray(section_numbers) || section_numbers.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'section_numbers array is required for regenerate_sections action',
                }, { status: 400 })
            }

            // Verify these sections exist and are in a regenerable state
            const { data: targetSections, error: fetchErr } = await supabase
                .from('kb_master_sections')
                .select('id, section_number, status')
                .eq('questionnaire_id', questionnaire_id)
                .eq('org_id', org_id)
                .in('section_number', section_numbers)

            if (fetchErr) throw fetchErr

            const locked = targetSections?.filter(s => s.status === 'locked') || []
            if (locked.length > 0) {
                return NextResponse.json({
                    success: false,
                    error: `Cannot regenerate locked sections: ${locked.map(s => s.section_number).join(', ')}`,
                }, { status: 409 })
            }

            // Delete these specific sections so the worker can recreate them
            const { error: delErr } = await supabase
                .from('kb_master_sections')
                .delete()
                .eq('questionnaire_id', questionnaire_id)
                .eq('org_id', org_id)
                .in('section_number', section_numbers)

            if (delErr) throw delErr

            // Re-create placeholder rows for just these sections
            const sectionInserts = section_numbers.map((num: number) => {
                const def = KB_SECTIONS.find(s => s.number === num)
                return {
                    org_id,
                    questionnaire_id,
                    section_number: num,
                    section_title: def?.title || `Section ${num}`,
                    content: '',
                    status: 'pending',
                    generation_pass: def?.pass || 1,
                    generation_type: def?.type || 'full',
                    version: 1,
                }
            })

            const { error: insertErr } = await supabase
                .from('kb_master_sections')
                .insert(sectionInserts)

            if (insertErr) throw insertErr

            // Update questionnaire status to generating
            await supabase
                .from('kb_questionnaire_responses')
                .update({ status: 'generating' })
                .eq('id', questionnaire_id)

            // Enqueue regeneration job
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
                            org_id,
                            user_id: admin.id,
                            // The orchestrator will see existing sections and skip them
                            // It only generates sections with status 'pending'
                        },
                    }),
                })
            } catch (workerErr) {
                console.error('Failed to enqueue KB regeneration job:', workerErr)
                return NextResponse.json({
                    success: false,
                    error: 'Failed to reach worker service.',
                }, { status: 502 })
            }

            return NextResponse.json({
                success: true,
                message: `Regeneration started for ${section_numbers.length} section(s): ${section_numbers.join(', ')}`,
                section_numbers,
            })
        }

        // ─── TRIGGER FULL GENERATION ──────────────────────────────
        if (action === 'generate') {
            // Load questionnaire
            const { data: qr, error: qrErr } = await supabase
                .from('kb_questionnaire_responses')
                .select('id, org_id, status')
                .eq('id', questionnaire_id)
                .eq('org_id', org_id)
                .single()

            if (qrErr || !qr) {
                return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 })
            }

            const retriggerable = ['ready_for_generation', 'generation_partial_failure', 'generation_failed']
            if (!retriggerable.includes(qr.status)) {
                return NextResponse.json({
                    success: false,
                    error: `Cannot generate — status is "${qr.status}". Must be: ${retriggerable.join(', ')}`,
                }, { status: 400 })
            }

            // Clean stale sections on retry
            if (['generation_partial_failure', 'generation_failed'].includes(qr.status)) {
                await supabase
                    .from('kb_master_sections')
                    .delete()
                    .eq('questionnaire_id', questionnaire_id)
                    .eq('org_id', org_id)
            }

            // Update status
            await supabase
                .from('kb_questionnaire_responses')
                .update({ status: 'generating', constraint_results: {} })
                .eq('id', questionnaire_id)

            // Create placeholder rows
            const sectionInserts = KB_SECTIONS.map(s => ({
                org_id,
                questionnaire_id,
                section_number: s.number,
                section_title: s.title,
                content: '',
                status: 'pending',
                generation_pass: s.pass,
                generation_type: s.type,
                version: 1,
            }))

            const { error: insertErr } = await supabase
                .from('kb_master_sections')
                .insert(sectionInserts)

            if (insertErr) throw insertErr

            // Enqueue
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
                            org_id,
                            user_id: admin.id,
                        },
                    }),
                })
            } catch (workerErr) {
                // Revert status
                await supabase
                    .from('kb_questionnaire_responses')
                    .update({ status: qr.status })
                    .eq('id', questionnaire_id)

                return NextResponse.json({
                    success: false,
                    error: 'Failed to reach worker service.',
                }, { status: 502 })
            }

            return NextResponse.json({
                success: true,
                message: `KB generation started. ${TOTAL_SECTIONS} sections will be generated.`,
            })
        }

        return NextResponse.json({
            success: false,
            error: `Unknown action: ${action}. Supported: generate, lock, bulk_approve, regenerate_sections`,
        }, { status: 400 })

    } catch (error: any) {
        console.error('Superadmin KB sections POST error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
