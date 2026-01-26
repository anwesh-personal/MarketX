import { Worker, Job } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { Pool } from 'pg'

/**
 * DREAM STATE WORKER
 * ==================
 * Handles background processing jobs triggered by external systems (MailWiz, etc.)
 * 
 * Job Types:
 * - memory_consolidation: Merge/prune memories
 * - embedding_optimization: Clean vector store
 * - conversation_summary: Compress old conversations
 * - feedback_analysis: Learn from ratings
 * - pattern_precomputation: Cache common queries
 * - cleanup: Remove expired data
 * 
 * NO INTERNAL SCHEDULER - Jobs are queued by external triggers
 */

interface DreamStateJob {
    type: 'memory_consolidation' | 'embedding_optimization' | 'conversation_summary' |
    'feedback_analysis' | 'pattern_precomputation' | 'cleanup' | 'full_cycle'
    orgId: string
    config?: Record<string, any>
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

async function processDreamStateJob(job: Job<DreamStateJob>) {
    const { type, orgId, config } = job.data
    console.log(`🌙 [Dream] Processing ${type} for org ${orgId}`)

    const startTime = Date.now()
    let processed = 0
    let updated = 0
    let deleted = 0

    try {
        switch (type) {
            case 'memory_consolidation':
                // Find and merge duplicate memories
                const duplicates = await pool.query(`
                    SELECT e1.id as id1, e2.id as id2
                    FROM embeddings e1
                    JOIN embeddings e2 ON e1.org_id = e2.org_id 
                        AND e1.id < e2.id
                        AND e1.content = e2.content
                    WHERE e1.org_id = $1
                    LIMIT 100
                `, [orgId])

                for (const dup of duplicates.rows) {
                    await pool.query('DELETE FROM embeddings WHERE id = $1', [dup.id2])
                    deleted++
                }
                processed = duplicates.rows.length
                break

            case 'embedding_optimization':
                // Clean orphaned embeddings
                const orphaned = await pool.query(`
                    DELETE FROM embeddings
                    WHERE org_id = $1 
                    AND source_type = 'conversation'
                    AND source_id NOT IN (SELECT id FROM conversations WHERE org_id = $1)
                    RETURNING id
                `, [orgId])
                deleted = orphaned.rowCount ?? 0
                break

            case 'conversation_summary':
                // Find old conversations to summarize
                const oldConvos = await pool.query(`
                    SELECT id, total_messages FROM conversations
                    WHERE org_id = $1 
                    AND summary IS NULL 
                    AND total_messages > 10
                    AND created_at < NOW() - INTERVAL '7 days'
                    LIMIT 50
                `, [orgId])

                for (const conv of oldConvos.rows) {
                    // Get messages and create summary
                    const messages = await pool.query(`
                        SELECT role, content FROM messages
                        WHERE conversation_id = $1
                        ORDER BY created_at ASC
                        LIMIT 100
                    `, [conv.id])

                    // Simple summary - in production, use LLM
                    const summary = `Conversation with ${messages.rowCount} messages`

                    await pool.query(
                        'UPDATE conversations SET summary = $1 WHERE id = $2',
                        [summary, conv.id]
                    )
                    updated++
                }
                processed = oldConvos.rows.length
                break

            case 'feedback_analysis':
                // Analyze recent feedback patterns
                const feedback = await pool.query(`
                    SELECT rating, COUNT(*) as count
                    FROM feedback
                    WHERE org_id = $1 
                    AND created_at > NOW() - INTERVAL '7 days'
                    GROUP BY rating
                `, [orgId])
                processed = feedback.rows.length
                break

            case 'pattern_precomputation':
                // Find common queries to cache
                const patterns = await pool.query(`
                    SELECT query_text, COUNT(*) as count
                    FROM rag_metrics
                    WHERE org_id = $1
                    GROUP BY query_text
                    HAVING COUNT(*) > 3
                    ORDER BY count DESC
                    LIMIT 20
                `, [orgId])
                processed = patterns.rows.length
                break

            case 'cleanup':
                // Clean expired caches
                await pool.query(`DELETE FROM response_cache WHERE expires_at < NOW()`)
                await pool.query(`DELETE FROM query_cache WHERE expires_at < NOW()`)
                await pool.query(`
                    DELETE FROM retry_queue 
                    WHERE status IN ('completed', 'failed') 
                    AND created_at < NOW() - INTERVAL '7 days'
                `)
                break

            case 'full_cycle':
                // Run all jobs in sequence
                console.log('🌙 Running full dream cycle...')
                for (const jobType of ['memory_consolidation', 'embedding_optimization',
                    'conversation_summary', 'feedback_analysis', 'cleanup'] as const) {
                    await processDreamStateJob({
                        ...job,
                        data: { type: jobType, orgId, config }
                    } as Job<DreamStateJob>)
                }
                break
        }

        const duration = Date.now() - startTime
        console.log(`🌙 [Dream] ${type} completed: processed=${processed}, updated=${updated}, deleted=${deleted}, ${duration}ms`)

        // Record in dream_jobs table
        await pool.query(`
            INSERT INTO dream_jobs (type, org_id, status, progress, result, completed_at)
            VALUES ($1, $2, 'completed', 100, $3, NOW())
        `, [type, orgId, JSON.stringify({ processed, updated, deleted, duration })])

        return { type, processed, updated, deleted, duration }

    } catch (error) {
        console.error(`❌ [Dream] ${type} failed:`, error)

        await pool.query(`
            INSERT INTO dream_jobs (type, org_id, status, error)
            VALUES ($1, $2, 'failed', $3)
        `, [type, orgId, (error as Error).message])

        throw error
    }
}

const worker = new Worker(QueueName.DREAM_STATE, processDreamStateJob, {
    ...redisConfig,
    concurrency: 2, // Lower concurrency - background tasks
    limiter: {
        max: 5,
        duration: 1000,
    },
})

worker.on('completed', (job) => {
    console.log(`✅ Dream Job ${job.id} completed:`, job.returnvalue)
})

worker.on('failed', (job, err) => {
    console.error(`❌ Dream Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ Dream Job ${job.id} progress: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('Dream Worker error:', err)
})

console.log('🌙 Dream State Worker started')

export default worker
