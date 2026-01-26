import { NextRequest, NextResponse } from 'next/server'
import { queues } from '@/lib/worker-queues'
import { getRedisConnection } from '@/lib/redis'

// Prevent static generation - this route requires runtime Redis connection
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // Get Redis info
        const redis = getRedisConnection()
        const redisInfo = await redis.info()
        const redisPing = await redis.ping()

        // Get queue stats for all queues
        const queueStats = await Promise.all(
            Object.entries(queues).map(async ([name, queue]) => {
                const [waiting, active, completed, failed, delayed] = await Promise.all([
                    queue.getWaitingCount(),
                    queue.getActiveCount(),
                    queue.getCompletedCount(),
                    queue.getFailedCount(),
                    queue.getDelayedCount(),
                ])

                // Get recent jobs
                const recentJobs = await queue.getJobs(['completed', 'failed'], 0, 4)

                return {
                    name,
                    waiting,
                    active,
                    completed,
                    failed,
                    delayed,
                    total: waiting + active + completed + failed + delayed,
                    recentJobs: recentJobs.map(job => ({
                        id: job.id,
                        name: job.name,
                        state: job.finishedOn ? (job.failedReason ? 'failed' : 'completed') : 'active',
                        timestamp: job.timestamp,
                        processedOn: job.processedOn,
                        finishedOn: job.finishedOn,
                        failedReason: job.failedReason,
                    }))
                }
            })
        )

        // Parse Redis info
        const infoLines = redisInfo.split('\r\n')
        const redisStats = {
            version: infoLines.find((l: string) => l.startsWith('redis_version:'))?.split(':')[1] || 'unknown',
            uptime: infoLines.find((l: string) => l.startsWith('uptime_in_seconds:'))?.split(':')[1] || '0',
            connectedClients: infoLines.find((l: string) => l.startsWith('connected_clients:'))?.split(':')[1] || '0',
            usedMemory: infoLines.find((l: string) => l.startsWith('used_memory_human:'))?.split(':')[1] || '0',
            totalCommands: infoLines.find((l: string) => l.startsWith('total_commands_processed:'))?.split(':')[1] || '0',
        }

        return NextResponse.json({
            connected: redisPing === 'PONG',
            redis: redisStats,
            queues: queueStats,
        })
    } catch (error: any) {
        console.error('Redis status check failed:', error)
        return NextResponse.json({
            connected: false,
            error: error.message,
            queues: [],
        })
    }
}
