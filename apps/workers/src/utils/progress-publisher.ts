/**
 * PROGRESS PUBLISHER
 * Publishes workflow execution progress to Redis for SSE streaming
 */

import Redis from 'ioredis';

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redis: Redis | null = null;

function getRedisClient(): Redis {
    if (!redis) {
        const redisUrl = process.env.REDIS_URL;

        if (redisUrl) {
            redis = new Redis(redisUrl);
        } else {
            redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
            });
        }

        redis.on('error', (err) => {
            console.error('Redis client error:', err);
        });

        redis.on('connect', () => {
            console.log('✅ Progress publisher connected to Redis');
        });
    }

    return redis;
}

// ============================================================================
// PROGRESS UPDATE INTERFACE
// ============================================================================

export interface ProgressUpdate {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    progress: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    nodeIndex: number;
    totalNodes: number;
    tokens?: number;
    words?: number;
    cost?: number;
    aiResponse?: string;
    error?: string;
    nodeResults?: Record<string, any>;
}

// ============================================================================
// PUBLISH FUNCTION
// ============================================================================

/**
 * Publish progress update to Redis for SSE streaming
 * 
 * @param executionId - Execution ID
 * @param update - Progress update object
 */
export async function publishProgress(
    executionId: string,
    update: ProgressUpdate
): Promise<void> {
    try {
        const client = getRedisClient();
        const channel = `execution:${executionId}:progress`;

        // Publish to Redis pub/sub
        await client.publish(channel, JSON.stringify({
            ...update,
            timestamp: new Date().toISOString()
        }));

        // Also log for debugging
        console.log(`📡 [${executionId}] ${update.nodeName} (${update.status}) - ${update.progress}%`);
    } catch (error) {
        console.error('Failed to publish progress:', error);
        // Don't throw - progress publishing failure shouldn't break execution
    }
}

/**
 * Publish final execution result
 */
export async function publishExecutionComplete(
    executionId: string,
    result: {
        success: boolean;
        output?: any;
        tokensUsed?: number;
        cost?: number;
        durationMs?: number;
        error?: string;
    }
): Promise<void> {
    try {
        const client = getRedisClient();
        const channel = `execution:${executionId}:complete`;

        await client.publish(channel, JSON.stringify({
            ...result,
            timestamp: new Date().toISOString()
        }));

        console.log(`✅ [${executionId}] Execution complete - published result`);
    } catch (error) {
        console.error('Failed to publish completion:', error);
    }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeProgressPublisher(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
        console.log('📡 Progress publisher disconnected from Redis');
    }
}
