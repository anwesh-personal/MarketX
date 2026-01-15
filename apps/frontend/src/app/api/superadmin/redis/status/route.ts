import { NextRequest, NextResponse } from 'next/server'
import { queues } from '../../../../../../workers/src/config/queues'
import { redisConnection } from '../../../../../../workers/src/config/redis'

export async function GET(request: NextRequest) {
    try {
        // Get Redis info
        const redisInfo = await redisConnection.info()
        const redisPing = await redisConnection.ping()

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
            version: infoLines.find(l => l.startsWith('redis_version:'))?.split(':')[1] || 'unknown',
            uptime: infoLines.find(l => l.startsWith('uptime_in_seconds:'))?.split(':')[1] || '0',
            connectedClients: infoLines.find(l => l.startsWith('connected_clients:'))?.split(':')[1] || '0',
            usedMemory: infoLines.find(l => l.startsWith('used_memory_human:'))?.split(':')[1] || '0',
            totalCommands: infoLines.find(l => l.startsWith('total_commands_processed:'))?.split(':')[1] || '0',
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
