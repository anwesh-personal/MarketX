import Redis from 'ioredis'
import { requireEnv } from './require-env'

// Lazy Redis connection - only created when actually accessed at runtime
let _redisConnection: Redis | null = null

export function getRedisConnection(): Redis {
    if (!_redisConnection) {
        // Use REDIS_URL if available (Railway format), otherwise use separate host/port
        if (process.env.REDIS_URL) {
            _redisConnection = new Redis(process.env.REDIS_URL, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            })
        } else {
            _redisConnection = new Redis({
                host: requireEnv('REDIS_HOST'),
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            })
        }
    }
    return _redisConnection
}

// Legacy export - still works but now lazy
export const redisConnection = {
    get info() {
        return getRedisConnection().info.bind(getRedisConnection())
    },
    get ping() {
        return getRedisConnection().ping.bind(getRedisConnection())
    },
    get get() {
        return getRedisConnection().get.bind(getRedisConnection())
    },
    get set() {
        return getRedisConnection().set.bind(getRedisConnection())
    },
    get del() {
        return getRedisConnection().del.bind(getRedisConnection())
    },
    get keys() {
        return getRedisConnection().keys.bind(getRedisConnection())
    },
}

export const redisConfig = {
    get connection() {
        return getRedisConnection()
    },
    prefix: 'axiom:',
}
