/**
 * Worker Management API Server
 * 
 * Exposes REST endpoints for queue management and trigger handling.
 * Frontend calls this API instead of connecting to Redis directly.
 * 
 * Endpoints:
 * - GET  /api/health         - Health check
 * - GET  /api/stats          - All queue statistics
 * - GET  /api/redis          - Redis server info
 * - POST /api/action         - Queue actions (pause, resume, clean)
 * - POST /api/jobs/:id/retry - Retry a failed job
 * 
 * Trigger Endpoints:
 * - GET  /api/triggers       - List registered triggers
 * - POST /api/triggers       - Register new trigger
 * - DELETE /api/triggers/:id - Delete trigger
 * - ALL  /api/webhook/:id    - Webhook trigger endpoint
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { triggerService } from '../triggers'
import { QueueName } from '../config/queues'

// Use canonical queue names from config (no colons allowed in BullMQ names)
const QUEUE_NAMES = [
    QueueName.KB_PROCESSING,           // 'kb-processing'
    QueueName.CONVERSATION_SUMMARY,    // 'conversation-summary'
    QueueName.ANALYTICS,               // 'analytics'
    QueueName.LEARNING_LOOP,           // 'learning-loop'
    QueueName.DREAM_STATE,             // 'dream-state'
    QueueName.FINE_TUNING,             // 'fine-tuning'
    QueueName.WORKFLOW_EXECUTION,      // 'workflow-execution'
    QueueName.ENGINE_EXECUTION,        // 'engine-execution'
    QueueName.SCHEDULED_TASK,          // 'scheduled-task'
    QueueName.IMT_EMAIL_REPLY,         // 'imt-email-reply' - Phase 4 Option B
]

// Get connection options for BullMQ (uses object format, not Redis instance)
function getConnectionOptions() {
    if (process.env.REDIS_URL) {
        // Parse REDIS_URL for BullMQ compatibility
        const url = new URL(process.env.REDIS_URL)
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            maxRetriesPerRequest: null,
        }
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    }
}

// Create Redis connection for direct queries (redis info, etc)
function createRedisConnection(): Redis {
    if (process.env.REDIS_URL) {
        return new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        })
    }
    return new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    })
}

// Singleton Redis connection for direct queries
let redisConnection: Redis | null = null
function getRedisConnection(): Redis {
    if (!redisConnection) {
        redisConnection = createRedisConnection()
    }
    return redisConnection
}

// Lazy-initialized queues
let queues: Map<string, Queue> | null = null

function getQueues(): Map<string, Queue> {
    if (!queues) {
        queues = new Map()
        const connectionOptions = getConnectionOptions()
        for (const name of QUEUE_NAMES) {
            queues.set(name, new Queue(name, {
                connection: connectionOptions,
                prefix: 'axiom:',
            }))
        }
    }
    return queues
}

// Create Express app
const app = express()

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
}))
app.use(express.json())

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[API] ${req.method} ${req.path}`)
    next()
})

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * Health check
 */
app.get('/api/health', async (req: Request, res: Response) => {
    try {
        const redis = getRedisConnection()
        const ping = await redis.ping()
        res.json({
            status: 'healthy',
            redis: ping === 'PONG',
            timestamp: new Date().toISOString(),
        })
    } catch (error: any) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        })
    }
})

/**
 * Redis server info
 */
app.get('/api/redis', async (req: Request, res: Response) => {
    try {
        const redis = getRedisConnection()
        const info = await redis.info()
        const ping = await redis.ping()

        // Parse Redis info
        const lines = info.split('\r\n')
        const stats = {
            version: lines.find(l => l.startsWith('redis_version:'))?.split(':')[1] || 'unknown',
            uptime: lines.find(l => l.startsWith('uptime_in_seconds:'))?.split(':')[1] || '0',
            connectedClients: lines.find(l => l.startsWith('connected_clients:'))?.split(':')[1] || '0',
            usedMemory: lines.find(l => l.startsWith('used_memory_human:'))?.split(':')[1] || '0',
            totalCommands: lines.find(l => l.startsWith('total_commands_processed:'))?.split(':')[1] || '0',
            peakMemory: lines.find(l => l.startsWith('used_memory_peak_human:'))?.split(':')[1] || '0',
        }

        res.json({
            connected: ping === 'PONG',
            stats,
        })
    } catch (error: any) {
        res.status(500).json({
            connected: false,
            error: error.message,
        })
    }
})

/**
 * All queue statistics
 */
app.get('/api/stats', async (req: Request, res: Response) => {
    try {
        const queueMap = getQueues()
        const stats = await Promise.all(
            Array.from(queueMap.entries()).map(async ([name, queue]) => {
                const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
                    queue.getWaitingCount(),
                    queue.getActiveCount(),
                    queue.getCompletedCount(),
                    queue.getFailedCount(),
                    queue.getDelayedCount(),
                    queue.isPaused(),
                ])

                // Get recent jobs
                const recentJobs = await queue.getJobs(['completed', 'failed'], 0, 9)

                return {
                    name,
                    waiting,
                    active,
                    completed,
                    failed,
                    delayed,
                    total: waiting + active + completed + failed + delayed,
                    isPaused: paused,
                    recentJobs: recentJobs.map(job => ({
                        id: job.id,
                        name: job.name,
                        state: job.finishedOn ? (job.failedReason ? 'failed' : 'completed') : 'active',
                        timestamp: job.timestamp,
                        processedOn: job.processedOn,
                        finishedOn: job.finishedOn,
                        failedReason: job.failedReason,
                        progress: job.progress,
                    })),
                }
            })
        )

        res.json({ queues: stats })
    } catch (error: any) {
        console.error('[API] Stats error:', error)
        res.status(500).json({ error: error.message })
    }
})

/**
 * Queue actions: pause, resume, clean, obliterate
 */
app.post('/api/action', async (req: Request, res: Response) => {
    try {
        const { queueName, action } = req.body

        if (!queueName || !QUEUE_NAMES.includes(queueName as QueueName)) {
            return res.status(400).json({ error: 'Invalid queue name' })
        }

        const queueMap = getQueues()
        const queue = queueMap.get(queueName)
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' })
        }

        switch (action) {
            case 'pause':
                await queue.pause()
                return res.json({ success: true, message: `Queue "${queueName}" paused` })

            case 'resume':
                await queue.resume()
                return res.json({ success: true, message: `Queue "${queueName}" resumed` })

            case 'clean-completed':
                const cleanedCompleted = await queue.clean(0, 1000, 'completed')
                return res.json({ success: true, message: `Cleaned ${cleanedCompleted.length} completed jobs` })

            case 'clean-failed':
                const cleanedFailed = await queue.clean(0, 1000, 'failed')
                return res.json({ success: true, message: `Cleaned ${cleanedFailed.length} failed jobs` })

            case 'clean-delayed':
                const cleanedDelayed = await queue.clean(0, 1000, 'delayed')
                return res.json({ success: true, message: `Cleaned ${cleanedDelayed.length} delayed jobs` })

            case 'obliterate':
                await queue.obliterate({ force: true })
                return res.json({ success: true, message: `Queue "${queueName}" completely reset` })

            default:
                return res.status(400).json({ error: `Invalid action: ${action}` })
        }
    } catch (error: any) {
        console.error('[API] Action error:', error)
        res.status(500).json({ error: error.message })
    }
})

/**
 * Retry a failed job
 */
app.post('/api/jobs/:jobId/retry', async (req: Request, res: Response) => {
    try {
        const jobId = req.params.jobId as string
        const { queueName } = req.body

        if (!queueName || !QUEUE_NAMES.includes(queueName as QueueName)) {
            return res.status(400).json({ error: 'Invalid queue name' })
        }

        const queueMap = getQueues()
        const queue = queueMap.get(queueName)
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' })
        }

        const job = await queue.getJob(jobId)
        if (!job) {
            return res.status(404).json({ error: 'Job not found' })
        }

        await job.retry()
        res.json({ success: true, message: `Job ${jobId} queued for retry` })
    } catch (error: any) {
        console.error('[API] Retry error:', error)
        res.status(500).json({ error: error.message })
    }
})

/**
 * Get specific job details
 */
app.get('/api/jobs/:jobId', async (req: Request, res: Response) => {
    try {
        const jobId = req.params.jobId as string
        const { queueName } = req.query

        if (!queueName || !QUEUE_NAMES.includes(queueName as QueueName)) {
            return res.status(400).json({ error: 'Invalid queue name' })
        }

        const queueMap = getQueues()
        const queue = queueMap.get(queueName as string)
        if (!queue) {
            return res.status(404).json({ error: 'Queue not found' })
        }

        const job = await queue.getJob(jobId)
        if (!job) {
            return res.status(404).json({ error: 'Job not found' })
        }

        const state = await job.getState()

        res.json({
            id: job.id,
            name: job.name,
            state,
            data: job.data,
            progress: job.progress,
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            returnvalue: job.returnvalue,
        })
    } catch (error: any) {
        console.error('[API] Job details error:', error)
        res.status(500).json({ error: error.message })
    }
})

// =============================================================================
// TRIGGER SERVICE INTEGRATION
// =============================================================================

// Mount trigger service router for webhook and trigger management endpoints
app.use('/api', triggerService.getRouter())

// Initialize trigger service with workflow queue on startup
const workflowQueue = getQueues().get(QueueName.WORKFLOW_EXECUTION)
if (workflowQueue) {
    triggerService.initialize(workflowQueue)
    console.log('🎯 Trigger service initialized with workflow queue')
}

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
})

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[API] Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

// Export for use in index.ts
export function startApiServer(port: number = 3100): void {
    app.listen(port, '0.0.0.0', () => {
        console.log(`🌐 Worker Management API running on port ${port}`)
        console.log(`   Health:   http://localhost:${port}/api/health`)
        console.log(`   Stats:    http://localhost:${port}/api/stats`)
        console.log(`   Triggers: http://localhost:${port}/api/triggers`)
        console.log(`   Webhooks: http://localhost:${port}/api/webhook/:triggerId`)
    })
}

export default app
