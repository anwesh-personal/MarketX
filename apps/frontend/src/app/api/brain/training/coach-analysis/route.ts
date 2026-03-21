/**
 * POST /api/brain/training/coach-analysis
 *
 * Triggers Marketing Coach analysis for an organization.
 * Analyzes campaign metrics from signal_event and updates Brain learnings.
 *
 * This endpoint can be called by:
 *   - Superadmin manually
 *   - Scheduled cron job
 *   - Webhook after significant metric changes
 *
 * Input:
 *   - org_id: Optional org ID (superadmin only, defaults to user's org)
 *   - days: Analysis period in days (default: 30)
 *   - update_beliefs: Whether to update belief scores (default: true)
 *   - save_learnings: Whether to save learnings to Brain (default: true)
 *
 * Response:
 *   - Analysis results including top performers, underperformers, and updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { marketingCoachService } from '@/services/brain/MarketingCoachService'
import { requireActiveBrainRuntime } from '@/services/brain/BrainRuntimeResolver'
import { requireFeature } from '@/lib/requireFeature'

interface CoachAnalysisRequest {
    org_id?: string
    days?: number
    update_beliefs?: boolean
    save_learnings?: boolean
}

export async function POST(req: NextRequest) {
    try {
        const gate = await requireFeature(req, 'can_train_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userRecord } = await supabase
            .from('users')
            .select('org_id, role')
            .eq('id', user.id)
            .single()

        if (!userRecord?.org_id) {
            return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({})) as CoachAnalysisRequest

        let targetOrgId = userRecord.org_id

        if (body.org_id && body.org_id !== userRecord.org_id) {
            if (userRecord.role !== 'superadmin') {
                return NextResponse.json(
                    { error: 'Only superadmin can analyze other organizations' },
                    { status: 403 }
                )
            }
            targetOrgId = body.org_id
        }

        await requireActiveBrainRuntime(targetOrgId)

        const result = await marketingCoachService.runAnalysis(targetOrgId, {
            days: body.days ?? 30,
            updateBeliefs: body.update_beliefs ?? true,
            saveLearnings: body.save_learnings ?? true,
        })

        return NextResponse.json({
            success: true,
            analysis: {
                org_id: result.org_id,
                analysis_date: result.analysis_date,
                period_days: result.period_days,
                metrics_snapshot: {
                    total_events: result.metrics_snapshot.total_events,
                    sends: result.metrics_snapshot.sends,
                    open_rate: result.metrics_snapshot.open_rate.toFixed(1) + '%',
                    click_rate: result.metrics_snapshot.click_rate.toFixed(1) + '%',
                    reply_rate: result.metrics_snapshot.reply_rate.toFixed(1) + '%',
                    booking_rate: result.metrics_snapshot.booking_rate.toFixed(1) + '%',
                    bounce_rate: result.metrics_snapshot.bounce_rate.toFixed(1) + '%',
                },
                learnings_count: result.learnings.length,
                top_performers: result.learnings
                    .filter(l => l.learning_type === 'insight')
                    .slice(0, 5)
                    .map(l => ({
                        title: l.title,
                        description: l.description,
                        confidence: l.confidence,
                    })),
                warnings: result.warnings,
                belief_updates: result.belief_updates.map(u => ({
                    belief_id: u.belief_id,
                    change: u.new_confidence > u.old_confidence ? 'boosted' : 'reduced',
                    reason: u.reason,
                })),
                recommendations: result.recommendations,
            },
        })

    } catch (error: any) {
        console.error('Coach analysis error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    try {
        const gate = await requireFeature(req, 'can_train_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userRecord } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!userRecord?.org_id) {
            return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
        }

        const searchParams = req.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') ?? '20')
        const category = searchParams.get('category') ?? undefined

        const learnings = await marketingCoachService.getRecentLearnings(userRecord.org_id, {
            limit,
            category,
        })

        return NextResponse.json({
            success: true,
            learnings,
            count: learnings.length,
        })

    } catch (error: any) {
        console.error('Get learnings error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
