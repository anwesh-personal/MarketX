/**
 * AXIOM Worker Redis Configuration
 * 
 * Standalone Redis configuration for workers.
 */

import Redis from 'ioredis';

// ============================================================================
// REDIS CONFIGURATION
// ============================================================================

function buildRedisConfig() {
    if (process.env.REDIS_URL) {
        const url = new URL(process.env.REDIS_URL);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        };
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    };
}

export const redisConfig = buildRedisConfig();


// ============================================================================
// REDIS CONNECTION (Lazy Initialization)
// ============================================================================

let _redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
    if (!_redisConnection) {
        if (process.env.REDIS_URL) {
            _redisConnection = new Redis(process.env.REDIS_URL, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });
        } else {
            _redisConnection = new Redis(redisConfig);
        }

        _redisConnection.on('error', (err) => {
            console.error('❌ Redis connection error:', err.message);
        });

        _redisConnection.on('connect', () => {
            console.log('✅ Redis connected');
        });
    }
    return _redisConnection;
}

// For backwards compatibility
export const redisConnection = new Proxy({} as Redis, {
    get(target, prop: string) {
        const conn = getRedisConnection();
        const value = conn[prop as keyof Redis];
        if (typeof value === 'function') {
            return value.bind(conn);
        }
        return value;
    },
});
