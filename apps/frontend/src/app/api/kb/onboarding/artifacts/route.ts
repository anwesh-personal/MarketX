/**
 * KB Onboarding — Artifact Upload API
 *
 * GET    /api/kb/onboarding/artifacts?questionnaire_id=xxx — List artifacts
 * POST   /api/kb/onboarding/artifacts — Upload a new artifact
 * DELETE /api/kb/onboarding/artifacts?artifact_id=xxx — Remove an artifact
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

// ─── GET: List artifacts ────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const questionnaireId = request.nextUrl.searchParams.get('questionnaire_id')
        if (!questionnaireId) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('kb_artifact_uploads')
            .select('*')
            .eq('questionnaire_id', questionnaireId)
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, artifacts: data || [] })
    } catch (error: any) {
        console.error('Artifacts GET error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── POST: Upload an artifact ───────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const questionnaireId = formData.get('questionnaire_id') as string
        const category = formData.get('category') as string

        if (!file) {
            return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 })
        }
        if (!questionnaireId) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }
        if (!category) {
            return NextResponse.json({ success: false, error: 'category is required' }, { status: 400 })
        }

        const validCategories = [
            'sales_deck', 'case_study', 'objection_handling', 'competitive_positioning',
            'call_recording', 'email_campaigns', 'website_content', 'internal_docs', 'crm_data',
        ]
        if (!validCategories.includes(category)) {
            return NextResponse.json({ success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, { status: 400 })
        }

        // Verify questionnaire ownership
        const { data: qr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('id, org_id, status')
            .eq('id', questionnaireId)
            .eq('org_id', ctx.orgId)
            .single()

        if (!qr) {
            return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 })
        }

        if (qr.status === 'locked') {
            return NextResponse.json({ success: false, error: 'Questionnaire is locked' }, { status: 409 })
        }

        // Upload file to Supabase storage
        const fileBuffer = await file.arrayBuffer()
        const fileName = `${ctx.orgId}/${questionnaireId}/${Date.now()}-${file.name}`
        const storagePath = `kb-artifacts/${fileName}`

        const { error: uploadErr } = await supabaseAdmin.storage
            .from('kb-artifacts')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: false,
            })

        if (uploadErr) {
            console.error('Storage upload error:', uploadErr)
            throw new Error(`File upload failed: ${uploadErr.message}`)
        }

        // Create artifact record
        const { data, error } = await supabaseAdmin
            .from('kb_artifact_uploads')
            .insert({
                questionnaire_id: questionnaireId,
                org_id: ctx.orgId,
                category,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                storage_path: storagePath,
                extraction_status: 'pending',
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, artifact: data }, { status: 201 })
    } catch (error: any) {
        console.error('Artifact POST error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── DELETE: Remove an artifact ─────────────────────────────────
export async function DELETE(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const artifactId = request.nextUrl.searchParams.get('artifact_id')
        if (!artifactId) {
            return NextResponse.json({ success: false, error: 'artifact_id is required' }, { status: 400 })
        }

        // Verify ownership and get storage path for cleanup
        const { data: artifact } = await supabaseAdmin
            .from('kb_artifact_uploads')
            .select('id, org_id, storage_path')
            .eq('id', artifactId)
            .eq('org_id', ctx.orgId)
            .single()

        if (!artifact) {
            return NextResponse.json({ success: false, error: 'Artifact not found' }, { status: 404 })
        }

        // Delete from storage (best-effort, don't fail if storage delete fails)
        try {
            const storageName = artifact.storage_path.replace('kb-artifacts/', '')
            await supabaseAdmin.storage.from('kb-artifacts').remove([storageName])
        } catch (e) {
            console.warn('Failed to delete artifact from storage:', e)
        }

        // Delete record
        const { error } = await supabaseAdmin
            .from('kb_artifact_uploads')
            .delete()
            .eq('id', artifactId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Artifact DELETE error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
