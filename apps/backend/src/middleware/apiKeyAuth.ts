/**
 * API KEY AUTHENTICATION MIDDLEWARE
 * ==================================
 * Validates API key from header before allowing engine execution
 * 
 * Usage:
 * - Add to protected routes
 * - Reads X-API-Key or Authorization header
 * - Attaches validated user/engine info to request
 */

import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKey/apiKeyService';

// Extend Express Request type to include API key validation result
declare global {
    namespace Express {
        interface Request {
            apiKeyAuth?: {
                valid: boolean;
                userId: string;
                engineId: string;
                orgId: string | null;
                engineName: string;
                permissions: string[];
                usageCount: number;
            };
        }
    }
}

/**
 * Middleware to validate API key
 * Checks X-API-Key header or Authorization: Bearer AXIOM-xxx
 */
export async function apiKeyAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Get API key from headers
        let apiKey = req.headers['x-api-key'] as string;

        // Also check Authorization header
        if (!apiKey) {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer AXIOM-')) {
                apiKey = authHeader.replace('Bearer ', '');
            }
        }

        // No API key provided
        if (!apiKey) {
            res.status(401).json({
                error: 'API key required',
                message: 'Provide API key via X-API-Key header or Authorization: Bearer AXIOM-xxx'
            });
            return;
        }

        // Validate the API key
        const validation = await apiKeyService.validateAPIKey(apiKey);

        if (!validation.valid) {
            res.status(401).json({
                error: 'Invalid API key',
                message: validation.error
            });
            return;
        }

        // Attach validation result to request
        req.apiKeyAuth = {
            valid: true,
            userId: validation.user_id!,
            engineId: validation.engine_id!,
            orgId: validation.org_id || null,
            engineName: validation.engine_name!,
            permissions: validation.permissions || [],
            usageCount: validation.usage_count || 0
        };

        // Check if user has 'execute' permission for execute endpoints
        if (req.path.includes('/execute') && !req.apiKeyAuth.permissions.includes('execute')) {
            res.status(403).json({
                error: 'Permission denied',
                message: 'API key does not have execute permission'
            });
            return;
        }

        next();
    } catch (error: any) {
        console.error('API key auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Optional API key middleware - doesn't fail if no key provided
 * Useful for routes that work with or without auth
 */
export async function optionalApiKeyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        let apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer AXIOM-')) {
                apiKey = authHeader.replace('Bearer ', '');
            }
        }

        if (apiKey) {
            const validation = await apiKeyService.validateAPIKey(apiKey);
            if (validation.valid) {
                req.apiKeyAuth = {
                    valid: true,
                    userId: validation.user_id!,
                    engineId: validation.engine_id!,
                    orgId: validation.org_id || null,
                    engineName: validation.engine_name!,
                    permissions: validation.permissions || [],
                    usageCount: validation.usage_count || 0
                };
            }
        }

        next();
    } catch (error) {
        // Don't fail, just continue without auth
        next();
    }
}

/**
 * Rate limiting check based on API key limits
 * Uses in-memory sliding window rate limiting
 */

// In-memory rate limit store (in production, use Redis)
const rateLimitStore: Map<string, { timestamps: number[]; windowMs: number }> = new Map();

// Default limits
const DEFAULT_RATE_LIMIT = 100; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

export async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    // Get API key identifier
    const apiKey = req.headers['x-api-key'] as string ||
        (req.headers['authorization'] as string)?.replace('Bearer ', '');

    if (!apiKey) {
        // No rate limiting for unauthenticated requests (should be blocked elsewhere)
        next();
        return;
    }

    const now = Date.now();
    const key = `rate:${apiKey.substring(0, 20)}`; // Use prefix of key as identifier

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry) {
        entry = { timestamps: [], windowMs: WINDOW_MS };
        rateLimitStore.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(ts => now - ts < WINDOW_MS);

    // Check if over limit
    if (entry.timestamps.length >= DEFAULT_RATE_LIMIT) {
        const resetTime = Math.ceil((entry.timestamps[0] + WINDOW_MS - now) / 1000);

        res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${DEFAULT_RATE_LIMIT} per minute.`,
            retryAfterSeconds: resetTime
        });
        return;
    }

    // Add current timestamp
    entry.timestamps.push(now);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', DEFAULT_RATE_LIMIT);
    res.setHeader('X-RateLimit-Remaining', DEFAULT_RATE_LIMIT - entry.timestamps.length);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + WINDOW_MS) / 1000));

    next();
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
        entry.timestamps = entry.timestamps.filter(ts => now - ts < WINDOW_MS);
        if (entry.timestamps.length === 0) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export default apiKeyAuthMiddleware;
