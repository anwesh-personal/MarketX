import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SelfHealingInput {
    orgId?: string
    lookbackDays?: number
}

export async function runSelfHealingLoop(input: SelfHealingInput) {
    const lookbackDays = input.lookbackDays ?? 7
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

    let partnerQuery = supabase.from('partner').select('id').eq('status', 'active')
    if (input.orgId) partnerQuery = partnerQuery.eq('id', input.orgId)
    const { data: partners } = await partnerQuery
    if (!partners?.length) return { success: true, partners_processed: 0 }

    let totalBeliefsBoosted = 0
    let totalGapsDetected = 0
    let totalKBUpdated = 0
    let totalSatellitesActivated = 0

    for (const partner of partners) {
        const pid = partner.id

        // 1. Identify winning beliefs and boost their angle weights in local KB
        const { data: beliefs } = await supabase
            .from('belief')
            .select('id, angle, status, confidence_score, allocation_weight')
            .eq('partner_id', pid)
            .in('status', ['SW', 'IW', 'RW', 'GW'])
            .gte('confidence_score', 0.6)
            .order('confidence_score', { ascending: false })
            .limit(20)

        for (const belief of (beliefs ?? [])) {
            if (!belief.angle) continue

            const { data: signals } = await supabase
                .from('signal_event')
                .select('event_type')
                .eq('belief_id', belief.id)
                .gte('created_at', since)

            const byType: Record<string, number> = {}
            for (const s of (signals ?? [])) byType[s.event_type] = (byType[s.event_type] ?? 0) + 1

            const sends = byType['send'] ?? 0
            const replies = byType['reply'] ?? 0
            const bookings = byType['booking'] ?? 0
            if (sends < 10) continue

            const replyRate = replies / sends
            const bookingRate = bookings / sends

            const { data: existingKO } = await supabase
                .from('knowledge_object')
                .select('id, confidence, sample_size, pattern_data')
                .eq('partner_id', pid)
                .eq('scope', 'local')
                .eq('object_type', 'angle_performance')
                .eq('title', `Angle: ${belief.angle}`)
                .limit(1)
                .single()

            if (existingKO) {
                const newSampleSize = existingKO.sample_size + sends
                const blendFactor = sends / newSampleSize
                const oldConf = Number(existingKO.confidence)
                const newConf = Number((oldConf * (1 - blendFactor) + Number(belief.confidence_score) * blendFactor).toFixed(4))

                await supabase
                    .from('knowledge_object')
                    .update({
                        confidence: newConf,
                        sample_size: newSampleSize,
                        pattern_data: {
                            ...existingKO.pattern_data,
                            reply_rate: replyRate,
                            booking_rate: bookingRate,
                            last_heal_at: new Date().toISOString(),
                        },
                        last_observed_at: new Date().toISOString(),
                        evidence_count: (existingKO as any).evidence_count + 1,
                    })
                    .eq('id', existingKO.id)
                totalKBUpdated++
            } else {
                await supabase
                    .from('knowledge_object')
                    .insert({
                        partner_id: pid,
                        scope: 'local',
                        object_type: 'angle_performance',
                        title: `Angle: ${belief.angle}`,
                        description: `Auto-generated from winning belief performance`,
                        confidence: Number(belief.confidence_score),
                        sample_size: sends,
                        pattern_data: {
                            angle_key: belief.angle,
                            reply_rate: replyRate,
                            booking_rate: bookingRate,
                            belief_status: belief.status,
                            auto_generated: true,
                        },
                        evidence_count: 1,
                        evidence_sources: [{ source: 'self-healing', belief_id: belief.id, at: new Date().toISOString() }],
                        revalidation_cycle: 'medium',
                        next_revalidation_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    })
                totalKBUpdated++
            }
            totalBeliefsBoosted++
        }

        // 2. Detect knowledge gaps from low-confidence RAG retrievals
        const { data: gaps } = await supabase
            .from('knowledge_gaps')
            .select('id, query, context, confidence')
            .eq('org_id', pid)
            .gte('created_at', since)
            .order('confidence', { ascending: true })
            .limit(20)

        for (const gap of (gaps ?? [])) {
            const { data: existingGapKO } = await supabase
                .from('knowledge_object')
                .select('id')
                .eq('partner_id', pid)
                .eq('scope', 'local')
                .eq('object_type', 'general')
                .eq('title', `Gap: ${(gap.query ?? '').slice(0, 100)}`)
                .limit(1)

            if (!existingGapKO?.length) {
                await supabase
                    .from('knowledge_object')
                    .insert({
                        partner_id: pid,
                        scope: 'local',
                        object_type: 'general',
                        title: `Gap: ${(gap.query ?? '').slice(0, 100)}`,
                        description: `Knowledge gap detected — low-confidence retrieval needs filling`,
                        confidence: 0,
                        sample_size: 1,
                        pattern_data: { gap_id: gap.id, query: gap.query, context: gap.context, gap_confidence: gap.confidence },
                        promotion_status: 'active',
                        revalidation_cycle: 'fast',
                        next_revalidation_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    })
                totalGapsDetected++
            }
        }

        // 3. Scale expansion: activate next satellite if health is good
        const { data: inactiveSats } = await supabase
            .from('sending_satellites')
            .select('id, status, warmup_day, warmup_target_days')
            .eq('partner_id', pid)
            .eq('is_active', false)
            .in('status', ['provisioning', 'warming'])
            .order('created_at', { ascending: true })
            .limit(1)

        if (inactiveSats?.length) {
            const { data: activeSats } = await supabase
                .from('sending_satellites')
                .select('id')
                .eq('partner_id', pid)
                .eq('is_active', true)

            const { data: latestRollup } = await supabase
                .from('partner_daily_rollup')
                .select('bounce_rate, reply_rate, booking_rate, total_revenue_cents, total_sends')
                .eq('partner_id', pid)
                .order('rollup_date', { ascending: false })
                .limit(1)
                .single()

            const r = latestRollup
            const healthyDeliverability = r && Number(r.bounce_rate) < 0.03
            const healthyEngagement = r && Number(r.reply_rate) > 0.02
            const healthyRevenue = r && r.total_sends > 0 && (r.total_revenue_cents / 100) / (r.total_sends / 1000) > 10

            if (healthyDeliverability && healthyEngagement) {
                const sat = inactiveSats[0]
                await supabase
                    .from('sending_satellites')
                    .update({ is_active: true, status: 'warming' })
                    .eq('id', sat.id)
                totalSatellitesActivated++
            }
        }
    }

    return {
        success: true,
        partners_processed: partners.length,
        beliefs_boosted: totalBeliefsBoosted,
        kb_updated: totalKBUpdated,
        gaps_detected: totalGapsDetected,
        satellites_activated: totalSatellitesActivated,
    }
}
