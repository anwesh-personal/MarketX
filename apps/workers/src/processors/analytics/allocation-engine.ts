import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AllocationRunInput {
    orgId?: string
    lookbackDays?: number
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

export async function rebalanceBeliefAllocations(input: AllocationRunInput) {
    const lookbackDays = Math.max(1, Math.min(90, input.lookbackDays ?? 14))
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: cfgRows } = await supabase
        .from('config_table')
        .select('key, value')
        .in('key', ['allocation_min_exploration', 'allocation_step_size'])

    const cfg = new Map((cfgRows ?? []).map((row: any) => [row.key, row.value]))
    const minExploration = clamp(Number(cfg.get('allocation_min_exploration')?.value ?? 0.1), 0.05, 0.49)
    const stepSize = clamp(Number(cfg.get('allocation_step_size')?.value ?? 0.1), 0.01, 0.25)

    let compQuery = supabase
        .from('belief_competition')
        .select('id, partner_id, champion_belief_id, challenger_belief_id, allocation_champion, allocation_challenger, active')
        .eq('active', true)

    if (input.orgId) compQuery = compQuery.eq('partner_id', input.orgId)
    const { data: competitions, error: competitionsError } = await compQuery
    if (competitionsError) throw competitionsError
    if (!competitions?.length) {
        return { success: true, competitionsProcessed: 0, competitionsRebalanced: 0, lookbackDays }
    }

    const beliefIds = competitions.flatMap((c) => [c.champion_belief_id, c.challenger_belief_id])
    const { data: beliefs, error: beliefsError } = await supabase
        .from('belief')
        .select('id, confidence_score, allocation_weight')
        .in('id', beliefIds)
    if (beliefsError) throw beliefsError

    const beliefMap = new Map((beliefs ?? []).map((b: any) => [b.id, b]))

    const { data: snapshots, error: snapshotsError } = await supabase
        .from('belief_gate_snapshot')
        .select('belief_id, passed, created_at')
        .in('belief_id', beliefIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
    if (snapshotsError) throw snapshotsError

    const gateByBelief = new Map<string, boolean>()
    for (const s of snapshots ?? []) {
        if (!gateByBelief.has(s.belief_id)) gateByBelief.set(s.belief_id, Boolean(s.passed))
    }

    let rebalanced = 0

    for (const comp of competitions) {
        const champion = beliefMap.get(comp.champion_belief_id)
        const challenger = beliefMap.get(comp.challenger_belief_id)
        if (!champion || !challenger) continue

        const championGate = gateByBelief.get(champion.id) ?? false
        const challengerGate = gateByBelief.get(challenger.id) ?? false
        if (!championGate || !challengerGate) continue

        const cScore = Number(champion.confidence_score ?? 0)
        const chScore = Number(challenger.confidence_score ?? 0)

        if (Math.abs(cScore - chScore) < 0.0001) continue
        const winner = cScore > chScore ? 'champion' : 'challenger'

        let allocChampion = Number(comp.allocation_champion ?? 0.5)
        let allocChallenger = Number(comp.allocation_challenger ?? 0.5)

        if (winner === 'champion') {
            allocChampion = clamp(allocChampion + stepSize, minExploration, 1 - minExploration)
            allocChallenger = clamp(1 - allocChampion, minExploration, 1 - minExploration)
            allocChampion = Number((1 - allocChallenger).toFixed(5))
        } else {
            allocChallenger = clamp(allocChallenger + stepSize, minExploration, 1 - minExploration)
            allocChampion = clamp(1 - allocChallenger, minExploration, 1 - minExploration)
            allocChallenger = Number((1 - allocChampion).toFixed(5))
        }

        allocChampion = Number(allocChampion.toFixed(5))
        allocChallenger = Number(allocChallenger.toFixed(5))

        const { error: updateCompError } = await supabase
            .from('belief_competition')
            .update({
                allocation_champion: allocChampion,
                allocation_challenger: allocChallenger,
                updated_at: new Date().toISOString(),
            })
            .eq('id', comp.id)
        if (updateCompError) {
            console.warn(`[allocation-engine] Failed competition update ${comp.id}: ${updateCompError.message}`)
            continue
        }

        const { error: updateChampionError } = await supabase
            .from('belief')
            .update({ allocation_weight: allocChampion, updated_at: new Date().toISOString() })
            .eq('id', champion.id)
        if (updateChampionError) {
            console.warn(`[allocation-engine] Failed belief update ${champion.id}: ${updateChampionError.message}`)
        }

        const { error: updateChallengerError } = await supabase
            .from('belief')
            .update({ allocation_weight: allocChallenger, updated_at: new Date().toISOString() })
            .eq('id', challenger.id)
        if (updateChallengerError) {
            console.warn(`[allocation-engine] Failed belief update ${challenger.id}: ${updateChallengerError.message}`)
        }

        rebalanced += 1
    }

    return {
        success: true,
        competitionsProcessed: competitions.length,
        competitionsRebalanced: rebalanced,
        lookbackDays,
        minExploration,
        stepSize,
    }
}
