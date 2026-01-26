import Redis from 'ioredis'

// Lazy Redis connection - only created when actually accessed at runtime
let _redisConnection: Redis | null = null

export function getRedisConnection(): Redis {
    if (!_redisConnection) {
        _redisConnection = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        })
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
