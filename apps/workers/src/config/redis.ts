import Redis from 'ioredis'

export const redisConnection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
})

export const redisConfig = {
    connection: redisConnection,
    prefix: 'axiom:',
}
