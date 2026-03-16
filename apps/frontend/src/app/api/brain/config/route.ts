import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: agent } = await supabaseAdmin
            .from('brain_agents')
            .select('rag_top_k, rag_min_confidence, rag_reranking, rag_hybrid_weight, rag_fts_weight')
            .eq('org_id', ctx.orgId)
            .in('status', ['active', 'configuring'])
            .limit(1)
            .maybeSingle()

        if (agent) {
            return NextResponse.json({
                ragConfig: {
                    topK: agent.rag_top_k,
                    minSimilarity: agent.rag_min_confidence,
                    rerankingEnabled: agent.rag_reranking,
                    hybridWeight: agent.rag_hybrid_weight,
                    ftsWeight: agent.rag_fts_weight,
                }
            })
        }

        const { data: template, error } = await supabaseAdmin
            .from('brain_templates')
            .select('config')
            .eq('is_default', true)
            .limit(1)
            .maybeSingle()

        if (error) throw error

        return NextResponse.json({
            ragConfig: template?.config?.rag || {}
        })
    } catch (error: any) {
        console.error('Brain config API error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch config' }, { status: 500 })
    }
}
