/**
 * KB Onboarding Questionnaire API — Main CRUD
 *
 * GET  /api/kb/onboarding — Load current questionnaire for the org
 * POST /api/kb/onboarding — Create a new questionnaire (if none exists)
 * PUT  /api/kb/onboarding — Save a step's data (auto-save per step)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'
import { getStepColumns } from '@/lib/kb-section-registry'

// ─── GET: Load saved questionnaire for this org ──────────────────
export async function GET() {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        // Fetch the most recent questionnaire for this org
        const { data: questionnaire, error } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('*')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) throw error

        if (!questionnaire) {
            return NextResponse.json({ success: true, questionnaire: null })
        }

        // Also fetch ICP segments for this questionnaire
        const { data: segments, error: segErr } = await supabaseAdmin
            .from('kb_icp_segments')
            .select('*')
            .eq('questionnaire_id', questionnaire.id)
            .order('sort_order', { ascending: true })

        if (segErr) throw segErr

        // Fetch artifact uploads
        const { data: artifacts, error: artErr } = await supabaseAdmin
            .from('kb_artifact_uploads')
            .select('id, category, file_name, file_size, file_type, extraction_status, created_at')
            .eq('questionnaire_id', questionnaire.id)
            .order('created_at', { ascending: true })

        if (artErr) throw artErr

        return NextResponse.json({
            success: true,
            questionnaire,
            segments: segments || [],
            artifacts: artifacts || [],
        })
    } catch (error: any) {
        console.error('KB questionnaire GET error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── POST: Create a new questionnaire ──────────────────────────
export async function POST() {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        // Check if one already exists that isn't locked
        const { data: existing } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('id, status')
            .eq('org_id', ctx.orgId)
            .neq('status', 'locked')
            .limit(1)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({
                success: false,
                error: 'An active questionnaire already exists for this organization',
                questionnaire_id: existing.id,
            }, { status: 409 })
        }

        // Create new questionnaire
        const { data, error } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .insert({
                org_id: ctx.orgId,
                created_by: ctx.userId,
                current_step: 1,
                status: 'in_progress',
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, questionnaire: data }, { status: 201 })
    } catch (error: any) {
        console.error('KB questionnaire POST error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── PUT: Save a step's data (auto-save) ────────────────────────
export async function PUT(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { questionnaire_id, step, data: stepData } = body

        if (!questionnaire_id) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }
        if (!step || step < 1 || step > 9) {
            return NextResponse.json({ success: false, error: 'step must be between 1 and 9' }, { status: 400 })
        }
        if (!stepData || typeof stepData !== 'object') {
            return NextResponse.json({ success: false, error: 'data object is required' }, { status: 400 })
        }

        // Verify ownership
        const { data: qr, error: qrErr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('id, org_id, status')
            .eq('id', questionnaire_id)
            .single()

        if (qrErr || !qr) {
            return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 })
        }

        if (qr.org_id !== ctx.orgId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
        }

        if (qr.status === 'locked') {
            return NextResponse.json({ success: false, error: 'Questionnaire is locked and cannot be edited' }, { status: 409 })
        }

        // Build column updates based on which step is being saved
        // Only update columns that belong to this step — prevents cross-step overwrites
        const allowedColumns = getStepColumns(step)
        const updatePayload: Record<string, any> = {}

        for (const col of allowedColumns) {
            if (col in stepData) {
                updatePayload[col] = stepData[col]
            }
        }

        // Always update current_step if we're advancing
        updatePayload.current_step = Math.max(step, qr.status === 'in_progress' ? step : 1)

        const { data: updated, error: upErr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .update(updatePayload)
            .eq('id', questionnaire_id)
            .select()
            .single()

        if (upErr) throw upErr

        return NextResponse.json({ success: true, questionnaire: updated })
    } catch (error: any) {
        console.error('KB questionnaire PUT error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}



