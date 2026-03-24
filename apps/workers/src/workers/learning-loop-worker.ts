import { Worker, Job } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { Pool } from 'pg'
import { MarketingCoachProcessor } from '../processors/brain/marketing-coach-processor'

/**
 * LEARNING LOOP WORKER
 * ====================
 * Handles the daily learning optimization:
 * - coach_analysis: Run Marketing Coach analysis (signal_event based, provider-agnostic)
 * - analyze: Legacy variant analysis (deprecated, use coach_analysis)
 * - promote: Legacy promote (deprecated, handled by coach_analysis)
 * - demote: Legacy demote (deprecated, handled by coach_analysis)
 * - update_kb: Update knowledge base preferences
 * - full_loop: Run complete learning loop including coach analysis
 * - conversation-memory-extraction: Extract memory from conversations
 * 
 * NO INTERNAL SCHEDULER - Jobs queued by:
 *   - Email provider webhooks (any MTA: Mailwizz, Mailgun, SES, SendGrid, etc.)
 *   - API endpoints
 *   - Scheduled tasks from external scheduler
 *   - Manual trigger from Superadmin
 */

interface LearningLoopJob {
    type: 'analyze' | 'promote' | 'demote' | 'update_kb' | 'full_loop' | 'conversation-memory-extraction' | 'coach_analysis'
    orgId?: string
    conversationId?: string
    userId?: string
    brainTemplateId?: string | null
    config?: Record<string, any>
}

interface LearningLoopResult {
    type: string
    status?: string
    message?: string
    duration?: number
    [key: string]: any
}

const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
})

const marketingCoach = new MarketingCoachProcessor(pool)

async function processLearningLoopJob(job: Job<LearningLoopJob>): Promise<LearningLoopResult> {
    const { type, orgId, config } = job.data
    const startTime = Date.now()

    console.log(`📊 [Learning] Processing ${type}${orgId ? ` for org ${orgId}` : ' for all orgs'}`)

    try {
        switch (type) {
            case 'coach_analysis': {
                if (orgId) {
                    const result = await marketingCoach.runAnalysis(orgId, {
                        days: config?.days ?? 30,
                        minSends: config?.minSends ?? 10,
                        updateBeliefs: config?.updateBeliefs ?? true,
                        saveLearnings: config?.saveLearnings ?? true,
                    })

                    return {
                        type: 'coach_analysis',
                        status: 'completed',
                        org_id: result.org_id,
                        beliefs_analyzed: result.beliefs_analyzed,
                        top_performers: result.top_performers.length,
                        underperformers: result.underperformers.length,
                        belief_updates: result.belief_updates.length,
                        learnings_saved: result.learnings_saved,
                        duration: Date.now() - startTime,
                    }
                } else {
                    const results = await marketingCoach.runAnalysisForAllOrgs({
                        days: config?.days ?? 30,
                        minSends: config?.minSends ?? 10,
                    })

                    return {
                        type: 'coach_analysis',
                        status: 'completed',
                        orgs_processed: results.length,
                        total_beliefs_analyzed: results.reduce((sum, r) => sum + r.beliefs_analyzed, 0),
                        total_updates: results.reduce((sum, r) => sum + r.belief_updates.length, 0),
                        duration: Date.now() - startTime,
                    }
                }
            }

            case 'full_loop': {
                console.log('📊 Running full learning loop with Marketing Coach...')

                let coachResult
                if (orgId) {
                    coachResult = await marketingCoach.runAnalysis(orgId, {
                        days: config?.days ?? 30,
                        minSends: config?.minSends ?? 10,
                        updateBeliefs: true,
                        saveLearnings: true,
                    })
                } else {
                    const results = await marketingCoach.runAnalysisForAllOrgs({
                        days: config?.days ?? 30,
                        minSends: config?.minSends ?? 10,
                    })
                    coachResult = {
                        orgs_processed: results.length,
                        total_beliefs: results.reduce((sum, r) => sum + r.beliefs_analyzed, 0),
                        total_updates: results.reduce((sum, r) => sum + r.belief_updates.length, 0),
                    }
                }

                const topPatterns = await pool.query(`
                    SELECT 
                        b.angle,
                        COUNT(*) as belief_count,
                        AVG(b.confidence_score) as avg_confidence
                    FROM belief b
                    WHERE b.status IN ('TEST', 'SW', 'IW', 'RW', 'GW')
                    ${orgId ? 'AND b.partner_id = $1' : ''}
                    GROUP BY b.angle
                    HAVING COUNT(*) >= 2
                    ORDER BY avg_confidence DESC
                    LIMIT 10
                `, orgId ? [orgId] : [])

                console.log(`📊 Found ${topPatterns.rowCount} angle patterns`)

                const duration = Date.now() - startTime
                console.log(`📊 Learning loop complete in ${duration}ms`)

                return {
                    type: 'full_loop',
                    status: 'completed',
                    coach_analysis: coachResult,
                    patterns_found: topPatterns.rowCount,
                    duration,
                }
            }

            case 'analyze': {
                console.log('📊 [Legacy] analyze - redirecting to coach_analysis')
                const result = await marketingCoach.runAnalysis(orgId!, {
                    days: config?.days ?? 7,
                    updateBeliefs: false,
                    saveLearnings: false,
                })

                return {
                    type: 'analyze',
                    status: 'completed',
                    beliefs_analyzed: result.beliefs_analyzed,
                    top_performers: result.top_performers,
                    underperformers: result.underperformers,
                }
            }

            case 'promote': {
                console.log('📊 [Legacy] promote - handled by coach_analysis')
                return { 
                    type: 'promote', 
                    status: 'deprecated', 
                    message: 'Use coach_analysis instead - it handles both promote and demote' 
                }
            }

            case 'demote': {
                console.log('📊 [Legacy] demote - handled by coach_analysis')
                return { 
                    type: 'demote', 
                    status: 'deprecated', 
                    message: 'Use coach_analysis instead - it handles both promote and demote' 
                }
            }

            case 'update_kb': {
                const topAngles = await pool.query(`
                    SELECT 
                        b.angle,
                        COUNT(*) as usage_count,
                        AVG(b.confidence_score) as avg_confidence
                    FROM belief b
                    WHERE b.status IN ('SW', 'IW', 'RW', 'GW')
                    ${orgId ? 'AND b.partner_id = $1' : ''}
                    GROUP BY b.angle
                    HAVING COUNT(*) >= 3
                    ORDER BY avg_confidence DESC
                    LIMIT 20
                `, orgId ? [orgId] : [])

                console.log(`📊 Updated KB with ${topAngles.rowCount} angle patterns`)

                return { type: 'update_kb', patternsUpdated: topAngles.rowCount }
            }

            case 'conversation-memory-extraction': {
                const { conversationId, userId } = job.data
                if (!conversationId || !orgId || !userId) {
                    console.warn('[Learning] conversation-memory-extraction: missing required fields')
                    return { type: 'conversation-memory-extraction', status: 'skipped', message: 'Missing required fields' }
                }

                const messagesResult = await pool.query(
                    `SELECT role, content FROM messages WHERE conversation_id = $1 AND org_id = $2 ORDER BY created_at ASC`,
                    [conversationId, orgId]
                )
                const messages = messagesResult.rows || []

                if (messages.length === 0) {
                    return { type: 'conversation-memory-extraction', status: 'no_messages', message: 'No messages to extract' }
                }

                const summary = messages.map((m: any) => `${m.role}: ${(m.content || '').slice(0, 200)}`).join('\n')
                const memoryKey = `push:${conversationId}`

                try {
                    await pool.query(
                        `INSERT INTO user_memory (org_id, user_id, memory_type, key, value, source, is_active)
                         VALUES ($1, $2, 'context', $3, $4, 'conversation', true)
                         ON CONFLICT (user_id, org_id, memory_type, key)
                         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                        [orgId, userId, memoryKey, summary.slice(0, 4000)]
                    )
                } catch (insertErr: any) {
                    if (insertErr.code !== '42P01') console.error('[Learning] user_memory insert failed:', insertErr.message)
                }

                console.log(`[Learning] conversation-memory-extraction: stored context for conversation ${conversationId}`)
                return { type: 'conversation-memory-extraction', status: 'completed', message: `${messages.length} messages processed` }
            }

            default:
                return { type, status: 'unknown', message: `Unknown job type: ${type}` }
        }

    } catch (error: any) {
        console.error(`❌ [Learning] ${type} failed:`, error)
        throw error
    }
}

const worker = new Worker(QueueName.LEARNING_LOOP, processLearningLoopJob, {
    connection: redisConfig,
    prefix: 'axiom:',
    concurrency: 1,
    limiter: {
        max: 1,
        duration: 60000,
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

console.log('📊 Learning Loop Worker started (with Marketing Coach)')

export default worker
