import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function runNetworkEffectMonitor() {
    const { data: partners } = await supabase
        .from('partner')
        .select('id')
        .eq('status', 'active')
    const totalPartners = partners?.length ?? 0

    const { data: globalKB } = await supabase
        .from('knowledge_object')
        .select('id')
        .eq('scope', 'global')
        .eq('promotion_status', 'active')
    const globalKBCount = globalKB?.length ?? 0

    const { data: candidateKB } = await supabase
        .from('knowledge_object')
        .select('id')
        .eq('scope', 'candidate_global')
    const candidateCount = candidateKB?.length ?? 0

    const { data: localKB } = await supabase
        .from('knowledge_object')
        .select('id, partner_id')
        .eq('scope', 'local')
        .eq('promotion_status', 'active')
    const localCount = localKB?.length ?? 0
    const partnersWithKB = new Set((localKB ?? []).map(k => k.partner_id)).size

    const { data: recentSignals } = await supabase
        .from('signal_event')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    const weeklySignals = recentSignals?.length ?? 0

    const { data: recentDecisions } = await supabase
        .from('agent_decision_log')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    const weeklyDecisions = recentDecisions?.length ?? 0

    const { data: recentRollups } = await supabase
        .from('partner_daily_rollup')
        .select('partner_id, total_sends, total_bookings, total_revenue_cents')
        .gte('rollup_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

    let totalSends30d = 0
    let totalBookings30d = 0
    let totalRevenue30d = 0
    for (const r of (recentRollups ?? [])) {
        totalSends30d += r.total_sends
        totalBookings30d += r.total_bookings
        totalRevenue30d += r.total_revenue_cents
    }

    const networkHealthScore = calculateNetworkHealth({
        totalPartners, globalKBCount, candidateCount,
        localCount, partnersWithKB, weeklySignals, weeklyDecisions,
        totalSends30d, totalBookings30d,
    })

    const snapshot = {
        timestamp: new Date().toISOString(),
        total_partners: totalPartners,
        partners_with_kb: partnersWithKB,
        global_kb_objects: globalKBCount,
        candidate_kb_objects: candidateCount,
        local_kb_objects: localCount,
        weekly_signals: weeklySignals,
        weekly_agent_decisions: weeklyDecisions,
        monthly_sends: totalSends30d,
        monthly_bookings: totalBookings30d,
        monthly_revenue_cents: totalRevenue30d,
        network_health_score: networkHealthScore,
    }

    await supabase.from('config_table').upsert({
        key: 'network_effect_snapshot',
        value: snapshot,
        description: 'Latest network effect health snapshot',
    }, { onConflict: 'key' })

    return { success: true, snapshot }
}

function calculateNetworkHealth(data: {
    totalPartners: number; globalKBCount: number; candidateCount: number;
    localCount: number; partnersWithKB: number; weeklySignals: number;
    weeklyDecisions: number; totalSends30d: number; totalBookings30d: number;
}): number {
    let score = 0

    if (data.totalPartners >= 2) score += 10
    if (data.totalPartners >= 5) score += 10
    if (data.totalPartners >= 10) score += 10

    if (data.globalKBCount >= 1) score += 10
    if (data.globalKBCount >= 5) score += 5
    if (data.globalKBCount >= 20) score += 5

    if (data.candidateCount >= 1) score += 5
    if (data.candidateCount >= 10) score += 5

    const kbCoverage = data.totalPartners > 0 ? data.partnersWithKB / data.totalPartners : 0
    if (kbCoverage >= 0.5) score += 10
    if (kbCoverage >= 0.8) score += 5

    if (data.weeklySignals >= 100) score += 5
    if (data.weeklySignals >= 1000) score += 5
    if (data.weeklySignals >= 10000) score += 5

    if (data.weeklyDecisions >= 50) score += 5
    if (data.weeklyDecisions >= 500) score += 5

    return Math.min(100, score)
}
