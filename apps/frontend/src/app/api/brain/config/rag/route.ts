import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

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

export async function PATCH(request: NextRequest) {
    try {
        const gate = await requireFeature(request, 'can_train_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { topK, minSimilarity, weights, rerankingEnabled, hybridSearch } = body

        const { data: agent, error: agentError } = await supabase
            .from('brain_agents')
            .select('id, config')
            .eq('org_id', ctx.orgId)
            .eq('is_active', true)
            .single()

        if (agentError || !agent) {
            return NextResponse.json({ error: 'No active brain agent for this organization' }, { status: 404 })
        }

        const currentConfig = agent.config || {}
        const currentRag = currentConfig.rag || {}

        const updatedRag = {
            ...currentRag,
            ...(topK !== undefined && { topK }),
            ...(minSimilarity !== undefined && { minSimilarity }),
            ...(weights !== undefined && { weights: { ...currentRag.weights, ...weights } }),
            ...(rerankingEnabled !== undefined && { rerankingEnabled }),
            ...(hybridSearch !== undefined && { hybridSearch })
        }

        const updatedConfig = {
            ...currentConfig,
            rag: updatedRag
        }

        const { error: updateError } = await supabase
            .from('brain_agents')
            .update({
                config: updatedConfig,
                updated_at: new Date().toISOString()
            })
            .eq('id', agent.id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, ragConfig: updatedRag })
    } catch (error: any) {
        console.error('Update RAG config error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update RAG configuration' },
            { status: 500 }
        )
    }
}
