import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { createClient } from '@/lib/supabase/server'


export async function GET(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const url = new URL(req.url)
    const orgId = url.searchParams.get('org_id')
    const agentType = url.searchParams.get('agent_type')
    const entityId = url.searchParams.get('entity_id')
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)

    let query = supabase
        .from('agent_decision_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 500))

    if (orgId) query = query.eq('partner_id', orgId)
    if (agentType) query = query.eq('agent_type', agentType)
    if (entityId) query = query.eq('entity_id', entityId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const agentCounts: Record<string, number> = {}
    for (const d of (data ?? [])) {
        agentCounts[d.agent_type] = (agentCounts[d.agent_type] ?? 0) + 1
    }

    return NextResponse.json({
        decisions: data ?? [],
        total: (data ?? []).length,
        by_agent: agentCounts,
    })
}
