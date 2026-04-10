/**
 * KB Onboarding — ICP Segments CRUD
 *
 * GET    /api/kb/onboarding/segments?questionnaire_id=xxx — List segments
 * POST   /api/kb/onboarding/segments — Add a new segment
 * PUT    /api/kb/onboarding/segments — Update a segment
 * DELETE /api/kb/onboarding/segments — Remove a segment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

// ─── GET: List segments for a questionnaire ─────────────────────
export async function GET(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const questionnaireId = request.nextUrl.searchParams.get('questionnaire_id')
        if (!questionnaireId) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('kb_icp_segments')
            .select('*')
            .eq('questionnaire_id', questionnaireId)
            .eq('org_id', ctx.orgId)
            .order('sort_order', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, segments: data || [] })
    } catch (error: any) {
        console.error('ICP segments GET error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── POST: Add a new ICP segment ────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { questionnaire_id, segment } = body

        if (!questionnaire_id) {
            return NextResponse.json({ success: false, error: 'questionnaire_id is required' }, { status: 400 })
        }

        if (!segment?.segment_name?.trim()) {
            return NextResponse.json({ success: false, error: 'segment_name is required' }, { status: 400 })
        }

        // Verify questionnaire belongs to this org
        const { data: qr } = await supabaseAdmin
            .from('kb_questionnaire_responses')
            .select('id, org_id, status')
            .eq('id', questionnaire_id)
            .eq('org_id', ctx.orgId)
            .single()

        if (!qr) {
            return NextResponse.json({ success: false, error: 'Questionnaire not found' }, { status: 404 })
        }

        if (qr.status === 'locked') {
            return NextResponse.json({ success: false, error: 'Questionnaire is locked' }, { status: 409 })
        }

        // Get current max sort_order
        const { data: existing } = await supabaseAdmin
            .from('kb_icp_segments')
            .select('sort_order')
            .eq('questionnaire_id', questionnaire_id)
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle()

        const nextOrder = (existing?.sort_order ?? -1) + 1

        const { data, error } = await supabaseAdmin
            .from('kb_icp_segments')
            .insert({
                questionnaire_id,
                org_id: ctx.orgId,
                segment_name: segment.segment_name,
                target_industries: segment.target_industries || [],
                company_size: segment.company_size || [],
                revenue_range: segment.revenue_range || [],
                geographies: segment.geographies || [],
                pain_points: segment.pain_points || '',
                buying_triggers: segment.buying_triggers || '',
                decision_criteria: segment.decision_criteria || '',
                exclusions: segment.exclusions || null,
                economic_buyer_title: segment.economic_buyer_title || null,
                economic_buyer_concerns: segment.economic_buyer_concerns || null,
                champion_title: segment.champion_title || null,
                champion_motivations: segment.champion_motivations || null,
                operational_owner_title: segment.operational_owner_title || null,
                operational_owner_concerns: segment.operational_owner_concerns || null,
                technical_evaluator_title: segment.technical_evaluator_title || null,
                technical_evaluator_focus: segment.technical_evaluator_focus || null,
                resistor_description: segment.resistor_description || null,
                sort_order: nextOrder,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, segment: data }, { status: 201 })
    } catch (error: any) {
        console.error('ICP segment POST error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── PUT: Update an existing ICP segment ────────────────────────
export async function PUT(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { segment_id, segment } = body

        if (!segment_id) {
            return NextResponse.json({ success: false, error: 'segment_id is required' }, { status: 400 })
        }

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('kb_icp_segments')
            .select('id, org_id, questionnaire_id')
            .eq('id', segment_id)
            .eq('org_id', ctx.orgId)
            .single()

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 })
        }

        // Build update payload (only update provided fields)
        const allowedFields = [
            'segment_name', 'target_industries', 'company_size', 'revenue_range',
            'geographies', 'pain_points', 'buying_triggers', 'decision_criteria',
            'exclusions', 'economic_buyer_title', 'economic_buyer_concerns',
            'champion_title', 'champion_motivations', 'operational_owner_title',
            'operational_owner_concerns', 'technical_evaluator_title',
            'technical_evaluator_focus', 'resistor_description', 'sort_order',
        ]

        const updatePayload: Record<string, any> = {}
        for (const field of allowedFields) {
            if (field in segment) {
                updatePayload[field] = segment[field]
            }
        }

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('kb_icp_segments')
            .update(updatePayload)
            .eq('id', segment_id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, segment: data })
    } catch (error: any) {
        console.error('ICP segment PUT error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// ─── DELETE: Remove an ICP segment ──────────────────────────────
export async function DELETE(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const segmentId = request.nextUrl.searchParams.get('segment_id')
        if (!segmentId) {
            return NextResponse.json({ success: false, error: 'segment_id is required' }, { status: 400 })
        }

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('kb_icp_segments')
            .select('id, org_id')
            .eq('id', segmentId)
            .eq('org_id', ctx.orgId)
            .single()

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 })
        }

        const { error } = await supabaseAdmin
            .from('kb_icp_segments')
            .delete()
            .eq('id', segmentId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('ICP segment DELETE error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
