import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { createClient } from '@/lib/supabase/server'


export async function GET(req: NextRequest) {
    const supabase = createClient()
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })

    const url = new URL(req.url)
    const orgId = url.searchParams.get('org_id')
    const status = url.searchParams.get('status')
    const beliefId = url.searchParams.get('belief_id')

    if (beliefId) {
        const { data: belief } = await supabase
            .from('belief')
            .select('*')
            .eq('id', beliefId)
            .single()
        if (!belief) return NextResponse.json({ error: 'Belief not found' }, { status: 404 })

        const { data: promotionLogs } = await supabase
            .from('belief_promotion_log')
            .select('*')
            .eq('belief_id', beliefId)
            .order('created_at', { ascending: false })
            .limit(50)

        const { data: gateSnapshots } = await supabase
            .from('belief_gate_snapshot')
            .select('*')
            .eq('belief_id', beliefId)
            .order('created_at', { ascending: false })
            .limit(20)

        const { data: competition } = await supabase
            .from('belief_competition')
            .select('*')
            .or(`champion_belief_id.eq.${beliefId},challenger_belief_id.eq.${beliefId}`)
            .limit(1)
            .single()

        const { data: flows } = await supabase
            .from('flow')
            .select('id, version_no, status, metadata, created_at')
            .eq('belief_id', beliefId)
            .order('created_at', { ascending: false })

        const { data: signals } = await supabase
            .from('signal_event')
            .select('event_type')
            .eq('belief_id', beliefId)
        const signalCounts: Record<string, number> = {}
        for (const s of (signals ?? [])) {
            signalCounts[s.event_type] = (signalCounts[s.event_type] ?? 0) + 1
        }

        return NextResponse.json({
            belief,
            promotion_history: promotionLogs ?? [],
            gate_snapshots: gateSnapshots ?? [],
            competition,
            flows: flows ?? [],
            signal_counts: signalCounts,
        })
    }

    let query = supabase
        .from('belief')
        .select(`
            id, partner_id, brief_id, icp_id, offer_id,
            angle, statement, lane, status,
            confidence_score, allocation_weight,
            created_at, updated_at
        `)
        .order('updated_at', { ascending: false })
        .limit(200)

    if (orgId) query = query.eq('partner_id', orgId)
    if (status) query = query.eq('status', status)

    const { data: beliefs, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const statusCounts: Record<string, number> = {}
    for (const b of (beliefs ?? [])) {
        statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1
    }

    return NextResponse.json({
        beliefs: beliefs ?? [],
        status_distribution: statusCounts,
        total: (beliefs ?? []).length,
    })
}
