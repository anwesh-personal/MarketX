import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queues } from '@/lib/worker-queues'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const { brainTemplateId } = body as { brainTemplateId?: string }

        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('id, user_id, org_id')
            .eq('id', conversationId)
            .single()

        if (convError || !conv) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        if (conv.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const orgId = (conv as { org_id?: string }).org_id
        if (!orgId) {
            return NextResponse.json({ error: 'Conversation has no org context' }, { status: 400 })
        }

        await queues.learningLoop.add(
            'conversation-memory-extraction',
            {
                type: 'conversation-memory-extraction',
                conversationId,
                orgId,
                userId: user.id,
                brainTemplateId: brainTemplateId ?? null,
            },
            { jobId: `push-brain-${conversationId}-${Date.now()}` }
        )

        return NextResponse.json({
            success: true,
            message: 'Conversation queued for brain processing. Memory extraction will run in the background.',
        })
    } catch (error: any) {
        console.error('Push to brain error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to push to brain' },
            { status: 500 }
        )
    }
}
