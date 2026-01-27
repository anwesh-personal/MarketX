import { Worker, Job } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { Pool } from 'pg'

/**
 * LEARNING LOOP WORKER
 * ====================
 * Handles the daily learning optimization from Document 07-Ops:
 * - analyze: Analyze yesterday's performance data
 * - promote: Promote winning variants
 * - demote: Demote poor performers
 * - update_kb: Update knowledge base preferences
 * - full_loop: Run complete learning loop
 * 
 * NO INTERNAL SCHEDULER - Jobs queued by MailWiz/external triggers
 */

interface LearningLoopJob {
    type: 'analyze' | 'promote' | 'demote' | 'update_kb' | 'full_loop'
    orgId?: string // Optional - runs for all orgs if not specified
    config?: Record<string, any> // Dynamic config for pipeline steps
}

interface VariantPerformance {
    variantId: string
    bookedCalls: number
    replies: number
    clicks: number
    bounces: number
    score: number
}

interface LearningLoopResult {
    type: string
    variantCount?: number
    variants?: VariantPerformance[]
    promotedCount?: number
    promoted?: string[]
    demotedCount?: number
    demoted?: string[]
    patternsUpdated?: number | null
    status?: string
    message?: string
    analyzed?: number
    duration?: number
}

const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
})

async function processLearningLoopJob(job: Job<LearningLoopJob>): Promise<LearningLoopResult> {
    const { type, orgId, config } = job.data
    const minSamples = config?.minSampleSize || 50
    const promoteThreshold = config?.promotionThreshold || 0.7
    const demoteThreshold = config?.demotionThreshold || 0.3

    console.log(`📊 [Learning] Processing ${type}${orgId ? ` for org ${orgId}` : ' for all orgs'}`)

    const startTime = Date.now()

    try {
        switch (type) {
            case 'analyze': {
                // Get variant performance from yesterday
                const performance = await pool.query(`
                    SELECT 
                        variant_id,
                        COUNT(*) FILTER (WHERE event_type = 'BOOKED_CALL') as booked_calls,
                        COUNT(*) FILTER (WHERE event_type = 'REPLY') as replies,
                        COUNT(*) FILTER (WHERE event_type = 'CLICK') as clicks,
                        COUNT(*) FILTER (WHERE event_type = 'BOUNCE') as bounces,
                        COUNT(*) as total_events
                    FROM analytics_events
                    WHERE occurred_at >= NOW() - INTERVAL '24 hours'
                    ${orgId ? 'AND org_id = $1' : ''}
                    GROUP BY variant_id
                    HAVING COUNT(*) >= $${orgId ? '2' : '1'}
                `, orgId ? [orgId, minSamples] : [minSamples])

                const variants: VariantPerformance[] = performance.rows.map(row => ({
                    variantId: row.variant_id,
                    bookedCalls: parseInt(row.booked_calls) || 0,
                    replies: parseInt(row.replies) || 0,
                    clicks: parseInt(row.clicks) || 0,
                    bounces: parseInt(row.bounces) || 0,
                    score: calculateScore(row)
                }))

                console.log(`📊 Analyzed ${variants.length} variants`)

                return { type, variantCount: variants.length, variants }
            }

            case 'promote': {
                // Promote high-performing variants
                const variants = (job.data.config as any)?.variants || []
                const promoted: string[] = []

                for (const v of variants as VariantPerformance[]) {
                    if (v.score >= promoteThreshold) {
                        await pool.query(`
                            UPDATE knowledge_bases
                            SET metadata = jsonb_set(
                                COALESCE(metadata, '{}'),
                                '{promotedVariants}',
                                COALESCE(metadata->'promotedVariants', '[]') || $1::jsonb
                            )
                            WHERE is_active = true
                        `, [JSON.stringify([v.variantId])])

                        promoted.push(v.variantId)
                    }
                }

                console.log(`📊 Promoted ${promoted.length} variants`)

                return { type, promotedCount: promoted.length, promoted }
            }

            case 'demote': {
                // Demote poorly-performing variants
                const variants = (job.data.config as any)?.variants || []
                const demoted: string[] = []

                for (const v of variants as VariantPerformance[]) {
                    if (v.score <= demoteThreshold && v.bounces > v.clicks) {
                        await pool.query(`
                            UPDATE knowledge_bases
                            SET metadata = jsonb_set(
                                COALESCE(metadata, '{}'),
                                '{demotedVariants}',
                                COALESCE(metadata->'demotedVariants', '[]') || $1::jsonb
                            )
                            WHERE is_active = true
                        `, [JSON.stringify([v.variantId])])

                        demoted.push(v.variantId)
                    }
                }

                console.log(`📊 Demoted ${demoted.length} variants`)

                return { type, demotedCount: demoted.length, demoted }
            }

            case 'update_kb': {
                // Update KB with learned preferences
                const topPatterns = await pool.query(`
                    SELECT 
                        keyword,
                        COUNT(*) as usage_count,
                        AVG(CASE WHEN event_type = 'BOOKED_CALL' THEN 1 ELSE 0 END) as success_rate
                    FROM analytics_events ae
                    CROSS JOIN LATERAL unnest(string_to_array(ae.payload->>'keywords', ',')) as keyword
                    WHERE occurred_at >= NOW() - INTERVAL '7 days'
                    GROUP BY keyword
                    HAVING COUNT(*) >= 10
                    ORDER BY success_rate DESC
                    LIMIT 20
                `)

                // Store patterns for future use
                await pool.query(`
                    UPDATE knowledge_bases
                    SET metadata = jsonb_set(
                        COALESCE(metadata, '{}'),
                        '{learnedPatterns}',
                        $1::jsonb
                    )
                    WHERE is_active = true
                `, [JSON.stringify(topPatterns.rows)])

                console.log(`📊 Updated KB with ${topPatterns.rowCount} patterns`)

                return { type, patternsUpdated: topPatterns.rowCount }
            }

            case 'full_loop': {
                // Run the complete learning loop (Document 07-Ops)
                console.log('📊 Running full learning loop...')

                // Step 1: Analyze - Get variant performance from yesterday
                const performance = await pool.query(`
                    SELECT 
                        variant_id,
                        COUNT(*) FILTER (WHERE event_type = 'BOOKED_CALL') as booked_calls,
                        COUNT(*) FILTER (WHERE event_type = 'REPLY') as replies,
                        COUNT(*) FILTER (WHERE event_type = 'CLICK') as clicks,
                        COUNT(*) FILTER (WHERE event_type = 'BOUNCE') as bounces,
                        COUNT(*) as total_events
                    FROM analytics_events
                    WHERE occurred_at >= NOW() - INTERVAL '24 hours'
                    ${orgId ? 'AND org_id = $1' : ''}
                    GROUP BY variant_id
                    HAVING COUNT(*) >= $${orgId ? '2' : '1'}
                `, orgId ? [orgId, minSamples] : [minSamples])

                const variants: VariantPerformance[] = performance.rows.map((row: any) => ({
                    variantId: row.variant_id,
                    bookedCalls: parseInt(row.booked_calls) || 0,
                    replies: parseInt(row.replies) || 0,
                    clicks: parseInt(row.clicks) || 0,
                    bounces: parseInt(row.bounces) || 0,
                    score: calculateScore(row)
                }))

                console.log(`📊 Analyzed ${variants.length} variants`)

                if (!variants.length) {
                    console.log('📊 No variants to process')
                    return { type: 'full_loop', status: 'no_data', message: 'Insufficient data for learning' }
                }

                // Step 2: Promote winners
                const promoted: string[] = []
                for (const v of variants) {
                    if (v.score >= promoteThreshold) {
                        await pool.query(`
                            UPDATE knowledge_bases
                            SET metadata = jsonb_set(
                                COALESCE(metadata, '{}'),
                                '{promotedVariants}',
                                COALESCE(metadata->'promotedVariants', '[]') || $1::jsonb
                            )
                            WHERE is_active = true
                        `, [JSON.stringify([v.variantId])])
                        promoted.push(v.variantId)
                    }
                }
                console.log(`📊 Promoted ${promoted.length} variants`)

                // Step 3: Demote losers
                const demoted: string[] = []
                for (const v of variants) {
                    if (v.score <= demoteThreshold && v.bounces > v.clicks) {
                        await pool.query(`
                            UPDATE knowledge_bases
                            SET metadata = jsonb_set(
                                COALESCE(metadata, '{}'),
                                '{demotedVariants}',
                                COALESCE(metadata->'demotedVariants', '[]') || $1::jsonb
                            )
                            WHERE is_active = true
                        `, [JSON.stringify([v.variantId])])
                        demoted.push(v.variantId)
                    }
                }
                console.log(`📊 Demoted ${demoted.length} variants`)

                // Step 4: Update KB with learned patterns
                const topPatterns = await pool.query(`
                    SELECT 
                        keyword,
                        COUNT(*) as usage_count,
                        AVG(CASE WHEN event_type = 'BOOKED_CALL' THEN 1 ELSE 0 END) as success_rate
                    FROM analytics_events ae
                    CROSS JOIN LATERAL unnest(string_to_array(ae.payload->>'keywords', ',')) as keyword
                    WHERE occurred_at >= NOW() - INTERVAL '7 days'
                    GROUP BY keyword
                    HAVING COUNT(*) >= 10
                    ORDER BY success_rate DESC
                    LIMIT 20
                `)

                await pool.query(`
                    UPDATE knowledge_bases
                    SET metadata = jsonb_set(
                        COALESCE(metadata, '{}'),
                        '{learnedPatterns}',
                        $1::jsonb
                    )
                    WHERE is_active = true
                `, [JSON.stringify(topPatterns.rows)])

                console.log(`📊 Updated KB with ${topPatterns.rowCount} patterns`)

                const duration = Date.now() - startTime

                console.log(`📊 Learning loop complete in ${duration}ms`)

                return {
                    type: 'full_loop',
                    status: 'completed',
                    analyzed: variants.length,
                    promotedCount: promoted.length,
                    demotedCount: demoted.length,
                    patternsUpdated: topPatterns.rowCount,
                    duration
                }
            }
        }

    } catch (error) {
        console.error(`❌ [Learning] ${type} failed:`, error)
        throw error
    }
}

function calculateScore(row: any): number {
    const bookedCalls = parseInt(row.booked_calls) || 0
    const replies = parseInt(row.replies) || 0
    const clicks = parseInt(row.clicks) || 0
    const bounces = parseInt(row.bounces) || 0
    const total = parseInt(row.total_events) || 1

    // Weighted scoring: booked calls are most valuable
    const score = (bookedCalls * 10 + replies * 5 + clicks * 2 - bounces * 3) / total
    return Math.max(0, Math.min(1, (score + 5) / 10)) // Normalize to 0-1
}

const worker = new Worker(QueueName.LEARNING_LOOP, processLearningLoopJob, {
    connection: redisConfig,
    concurrency: 1, // Learning loop should run serially
    limiter: {
        max: 1,
        duration: 60000, // Max 1 per minute
    },
})

worker.on('completed', (job) => {
    console.log(`✅ Learning Loop Job ${job.id} completed:`, job.returnvalue)
})

worker.on('failed', (job, err) => {
    console.error(`❌ Learning Loop Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ Learning Loop Job ${job.id} progress: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('Learning Loop Worker error:', err)
})

console.log('📊 Learning Loop Worker started')

export default worker
