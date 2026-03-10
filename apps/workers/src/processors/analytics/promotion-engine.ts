import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PROMOTION_LADDER = ['HYP', 'TEST', 'SW', 'IW', 'RW', 'GW'] as const

interface PromotionRunInput {
    orgId?: string
    lookbackDays?: number
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export async function runPromotionEngine(input: PromotionRunInput) {
    const lookbackDays = clamp(input.lookbackDays ?? 14, 1, 90)

    const { data: cfgRows } = await supabase
        .from('config_table')
        .select('key, value')
        .in('key', [
            'promotion_min_sample_size',
            'promotion_min_confidence',
            'promotion_negative_rate_max',
            'promotion_booked_call_rate_min',
            'allocation_min_exploration',
        ])
    const cfg = new Map((cfgRows ?? []).map((r: any) => [r.key, Number(r.value?.value ?? 0)]))
    const minSample = cfg.get('promotion_min_sample_size') ?? 50
    const minConfidence = cfg.get('promotion_min_confidence') ?? 0.60
    const maxNegRate = cfg.get('promotion_negative_rate_max') ?? 0.25
    const minBookedRate = cfg.get('promotion_booked_call_rate_min') ?? 0.02
    const minExploration = cfg.get('allocation_min_exploration') ?? 0.10

    let beliefQuery = supabase
        .from('belief')
        .select('id, partner_id, status, confidence_score, allocation_weight')
        .in('status', ['TEST', 'SW', 'IW', 'RW'])
    if (input.orgId) beliefQuery = beliefQuery.eq('partner_id', input.orgId)

    const { data: beliefs, error: bErr } = await beliefQuery
    if (bErr) throw bErr
    if (!beliefs?.length) return { success: true, evaluated: 0, promoted: 0, blocked: 0 }

    let promoted = 0
    let blocked = 0

    for (const belief of beliefs) {
        const currentIdx = PROMOTION_LADDER.indexOf(belief.status as any)
        if (currentIdx < 0 || currentIdx >= PROMOTION_LADDER.length - 1) continue
        const nextStatus = PROMOTION_LADDER[currentIdx + 1]

        const { data: signals } = await supabase
            .from('signal_event')
            .select('event_type')
            .eq('belief_id', belief.id)
        const total = signals?.length ?? 0
        const byType: Record<string, number> = {}
        for (const s of (signals ?? [])) {
            byType[s.event_type] = (byType[s.event_type] ?? 0) + 1
        }

        const sends = byType['send'] ?? 0
        const bookings = byType['booking'] ?? 0
        const negReplies = byType['reply'] ?? 0
        const bookedRate = sends > 0 ? bookings / sends : 0
        const negRate = sends > 0 ? negReplies / sends : 0
        const confidence = Number(belief.confidence_score ?? 0)

        const checks: Record<string, { passed: boolean; actual: number; threshold: number }> = {
            sample_size: { passed: total >= minSample, actual: total, threshold: minSample },
            confidence_score: { passed: confidence >= minConfidence, actual: confidence, threshold: minConfidence },
            negative_rate: { passed: negRate <= maxNegRate, actual: negRate, threshold: maxNegRate },
            booked_call_rate: { passed: bookedRate >= minBookedRate, actual: bookedRate, threshold: minBookedRate },
            min_exploration: { passed: Number(belief.allocation_weight) >= minExploration, actual: Number(belief.allocation_weight), threshold: minExploration },
        }

        const allPassed = Object.values(checks).every(c => c.passed)

        await supabase.from('belief_gate_snapshot').insert({
            belief_id: belief.id,
            snapshot: { checks, target_status: nextStatus, from_status: belief.status, engine: 'automated' },
            passed: allPassed,
        })

        if (allPassed) {
            await supabase
                .from('belief')
                .update({ status: nextStatus })
                .eq('id', belief.id)

            await supabase.from('belief_promotion_log').insert({
                belief_id: belief.id,
                from_status: belief.status,
                to_status: nextStatus,
                reason: `Automated promotion — all gates passed`,
                meta: { checks, engine: 'promotion-worker' },
            })
            promoted++
        } else {
            const failed = Object.entries(checks).filter(([, c]) => !c.passed).map(([k]) => k)
            await supabase.from('belief_promotion_log').insert({
                belief_id: belief.id,
                from_status: belief.status,
                to_status: belief.status,
                reason: `Automated check — blocked: ${failed.join(', ')}`,
                meta: { checks, engine: 'promotion-worker' },
            })
            blocked++
        }
    }

    return { success: true, evaluated: beliefs.length, promoted, blocked, lookbackDays }
}
