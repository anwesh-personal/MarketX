import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuthContext(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    const { data: userRecord } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
    if (!userRecord?.org_id) return null
    return { userId: user.id, orgId: userRecord.org_id }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: feedback, error } = await supabase
            .from('brain_request_logs')
            .select('id, request_type, feedback_rating, metadata, created_at')
            .eq('org_id', ctx.orgId)
            .not('feedback_rating', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) throw error

        const formattedFeedback = (feedback || []).map((f: any) => ({
            id: f.id,
            rating: f.feedback_rating,
            query: f.metadata?.query || f.metadata?.message || 'N/A',
            comment: f.metadata?.feedback_comment || null,
            created_at: f.created_at
        }))

        return NextResponse.json({ feedback: formattedFeedback })
    } catch (error: any) {
        console.error('Training feedback API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch feedback' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { requestLogId, rating, comment } = body

        if (!requestLogId || rating === undefined) {
            return NextResponse.json({ error: 'requestLogId and rating are required' }, { status: 400 })
        }

        const { data: log, error: fetchError } = await supabase
            .from('brain_request_logs')
            .select('id, metadata')
            .eq('id', requestLogId)
            .eq('org_id', ctx.orgId)
            .single()

        if (fetchError || !log) {
            return NextResponse.json({ error: 'Request log not found' }, { status: 404 })
        }

        const updatedMetadata = {
            ...(log.metadata || {}),
            feedback_comment: comment || null
        }

        const { error: updateError } = await supabase
            .from('brain_request_logs')
            .update({
                feedback_rating: rating,
                metadata: updatedMetadata
            })
            .eq('id', requestLogId)

        if (updateError) throw updateError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Submit feedback error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to submit feedback' },
            { status: 500 }
        )
    }
}
