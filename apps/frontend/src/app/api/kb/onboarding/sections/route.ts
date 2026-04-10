/**
 * KB Sections API — Review Actions
 *
 * PUT  /api/kb/onboarding/sections — Approve, reject, or edit a section
 * POST /api/kb/onboarding/sections — Lock the entire KB (all sections must be approved)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'
import { TOTAL_SECTIONS } from '@/lib/kb-section-registry'

// ─── PUT: Section actions (approve / reject / edit) ─────────────
export async function PUT(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { questionnaire_id, section_number, action, content, reviewer_notes } = body

        if (!questionnaire_id || section_number === undefined || section_number === null) {
            return NextResponse.json({ success: false, error: 'questionnaire_id and section_number are required' }, { status: 400 })
        }

        if (!['approve', 'reject', 'edit'].includes(action)) {
            return NextResponse.json({ success: false, error: 'action must be approve, reject, or edit' }, { status: 400 })
        }

        // Verify ownership and load section
        const { data: section, error: secErr } = await supabaseAdmin
            .from('kb_master_sections')
            .select('id, status, content, edit_history')
            .eq('questionnaire_id', questionnaire_id)
            .eq('section_number', section_number)
            .eq('org_id', ctx.orgId)
            .single()

        if (secErr || !section) {
            return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 })
        }

        // Validate state transitions
        const allowedTransitions: Record<string, string[]> = {
            approve: ['draft', 'rejected'], // Can approve drafts and previously rejected
            reject: ['draft'],               // Can only reject drafts
            edit: ['draft', 'approved'],     // Can edit drafts and approved (will revert to draft)
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
                updatePayload.reviewed_by = ctx.userId
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
                updatePayload.reviewed_by = ctx.userId
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

                // Track edit history
                const editHistory = Array.isArray(section.edit_history) ? section.edit_history : []
                editHistory.push({
                    edited_by: ctx.userId,
                    edited_at: now,
                    previous_length: section.content?.length || 0,
                    new_length: content.length,
                })

                updatePayload.content = content
                updatePayload.status = 'draft' // Edited content goes back to draft for re-approval
                updatePayload.edit_history = editHistory
                updatePayload.reviewer_notes = null
                break
        }

        const { error: upErr } = await supabaseAdmin
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
        console.error('KB sections PUT error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── POST: Lock the entire KB ───────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { questionnaire_id, action } = body

        if (action !== 'lock') {
            return NextResponse.json({ success: false, error: 'Only action "lock" is supported via POST' }, { status: 400 })
        }

        if (!questionnaire_id) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }

        // Verify all sections are approved
        const { data: sections } = await supabaseAdmin
            .from('kb_master_sections')
            .select('section_number, status')
            .eq('questionnaire_id', questionnaire_id)
            .eq('org_id', ctx.orgId)

        if (!sections || sections.length === 0) {
            return NextResponse.json({ success: false, error: 'No sections found' }, { status: 404 })
        }

        const notApproved = sections.filter(s => s.status !== 'approved' && s.status !== 'locked')
        if (notApproved.length > 0) {
            return NextResponse.json({
                success: false,
                error: `Cannot lock KB — ${notApproved.length} section(s) are not approved: ${
                    notApproved.map(s => `Section ${s.section_number} (${s.status})`).join(', ')
                }`,
                unapproved_sections: notApproved.map(s => ({
                    section_number: s.section_number,
                    status: s.status,
                })),
            }, { status: 409 })
        }

        // Lock all sections
        const { error: lockSecErr } = await supabaseAdmin
            .from('kb_master_sections')
            .update({ status: 'locked' })
            .eq('questionnaire_id', questionnaire_id)
            .eq('org_id', ctx.orgId)

        if (lockSecErr) throw lockSecErr

        // Lock the questionnaire
        const { error: lockQrErr } = await supabaseAdmin
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
    } catch (error: any) {
        console.error('KB sections POST error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
