/**
 * GET /api/brain/runtime
 * Returns the active brain runtime for the authenticated user's organization.
 * Single source of truth: deployed brain_agents. Used by chat, Writer Studio, and workflow UI.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveBrainRuntime } from '@/services/brain/BrainRuntimeResolver'
import { requireFeature } from '@/lib/requireFeature'

export async function GET(req: NextRequest) {
    try {
        const gate = await requireFeature(req, 'can_chat_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
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

        const runtime = await getActiveBrainRuntime(userRecord.org_id, user.id)
        if (!runtime) {
            return NextResponse.json(
                { error: 'No active brain agent deployed for your organization', runtime: null },
                { status: 404 }
            )
        }

        return NextResponse.json({
            runtime: {
                agentId: runtime.agentId,
                templateId: runtime.templateId,
                templateVersion: runtime.templateVersion,
                name: runtime.name,
                toolsGranted: runtime.toolsGranted,
                preferredProvider: runtime.preferredProvider,
                preferredModel: runtime.preferredModel,
                rag: runtime.rag,
                maxTurns: runtime.maxTurns,
                emailDefaults: runtime.emailDefaults,
                selfHealing: runtime.selfHealing,
            },
        })
    } catch (error: any) {
        console.error('Brain runtime API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to load brain runtime' },
            { status: 500 }
        )
    }
}
