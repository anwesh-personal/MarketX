import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { recomputeBeliefConfidence } from './confidence-engine'
import { rebalanceBeliefAllocations } from './allocation-engine'
import { runPromotionEngine } from './promotion-engine'
import { runNetworkLearning } from './network-learning'
import { runDailyRollup } from './rollup-engine'
import { runSelfHealingLoop } from './self-healing'
import { runNetworkEffectMonitor } from './network-effect-monitor'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AnalyticsJob {
    type: 'daily' | 'hourly' | 'realtime' | 'belief-confidence' | 'allocation-engine' | 'promotion-engine' | 'network-learning' | 'daily-rollup' | 'self-healing' | 'network-effect-monitor'
    date?: string
    orgId?: string
    lookbackDays?: number
    objectType?: string
}

export async function aggregateAnalytics(job: Job<AnalyticsJob>) {
    const { type, date } = job.data

    if (type === 'belief-confidence') {
        job.updateProgress(10)
        const result = await recomputeBeliefConfidence({
            orgId: job.data.orgId,
            lookbackDays: job.data.lookbackDays,
        })
        job.updateProgress(100)
        return { type, ...result }
    }

    if (type === 'allocation-engine') {
        job.updateProgress(10)
        const result = await rebalanceBeliefAllocations({
            orgId: job.data.orgId,
            lookbackDays: job.data.lookbackDays,
        })
        job.updateProgress(100)
        return { type, ...result }
    }

    if (type === 'promotion-engine') {
        job.updateProgress(10)
        const result = await runPromotionEngine({
            orgId: job.data.orgId,
            lookbackDays: job.data.lookbackDays,
        })
        job.updateProgress(100)
        return { type, ...result }
    }

    if (type === 'daily-rollup') {
        job.updateProgress(10)
        const result = await runDailyRollup({
            orgId: job.data.orgId,
            date: job.data.date,
        })
        job.updateProgress(100)
        return { type, ...result }
    }

    if (type === 'self-healing') {
        job.updateProgress(10)
        const result = await runSelfHealingLoop({
            orgId: job.data.orgId,
            lookbackDays: job.data.lookbackDays,
        })
        job.updateProgress(100)
        return { type, ...result }
    }

    if (type === 'network-effect-monitor') {
        job.updateProgress(10)
        const result = await runNetworkEffectMonitor()
        job.updateProgress(100)
        return { type, ...result }
    }

    if (type === 'network-learning') {
        job.updateProgress(10)
        const result = await runNetworkLearning({
            objectType: job.data.objectType,
        })
        job.updateProgress(100)
        return { type, ...result }
    }

    const targetDate = date || new Date().toISOString().split('T')[0]

    console.log(`📊 Aggregating ${type} analytics for ${targetDate}`)

    try {
        // 1. Aggregate brain request logs
        job.updateProgress(20)
        await aggregateBrainMetrics(targetDate)

        // 2. Refresh materialized views
        job.updateProgress(80)
        const { error: refreshError } = await supabase.rpc('refresh_brain_stats')

        if (refreshError && !refreshError.message.includes('does not exist')) {
            console.warn('Could not refresh materialized views:', refreshError)
        }

        job.updateProgress(100)

        console.log(`✅ Analytics aggregated for ${targetDate}`)

        return {
            success: true,
            date: targetDate,
            type,
        }
    } catch (error: any) {
        console.error(`❌ Analytics aggregation failed for ${targetDate}:`, error)
        throw error
    }
}

async function aggregateBrainMetrics(date: string) {
    const { data, error } = await supabase
        .from('brain_request_logs')
        .select('brain_template_id, response_time_ms, tokens_used, feedback_rating')
        .gte('created_at', `${date}T00:00:00Z`)
        .lt('created_at', `${date}T23:59:59Z`)

    if (error) {
        console.warn('Could not fetch brain request logs:', error)
        return
    }

    if (!data || data.length === 0) {
        console.log(`No brain requests for ${date}`)
        return
    }

    const metrics: Record<string, any> = {}

    data.forEach((log) => {
        const brainId = log.brain_template_id
        if (!metrics[brainId]) {
            metrics[brainId] = {
                requests: 0,
                totalResponseTime: 0,
                totalTokens: 0,
                ratings: [],
            }
        }

        metrics[brainId].requests++
        metrics[brainId].totalResponseTime += log.response_time_ms || 0
        metrics[brainId].totalTokens += log.tokens_used || 0
        if (log.feedback_rating) {
            metrics[brainId].ratings.push(log.feedback_rating)
        }
    })

    // Store aggregated metrics
    const records = Object.entries(metrics).map(([brainId, m]: [string, any]) => ({
        brain_template_id: brainId,
        date,
        total_requests: m.requests,
        avg_response_time: m.totalResponseTime / m.requests,
        total_tokens: m.totalTokens,
        avg_rating: m.ratings.length > 0
            ? m.ratings.reduce((a: number, b: number) => a + b, 0) / m.ratings.length
            : null,
    }))

    console.log(`Upserting ${records.length} brain metrics`)

    const { error: upsertError } = await supabase
        .from('brain_daily_metrics')
        .upsert(records)

    if (upsertError && !upsertError.message.includes('does not exist')) {
        console.warn('Could not upsert brain metrics:', upsertError)
    }
}
