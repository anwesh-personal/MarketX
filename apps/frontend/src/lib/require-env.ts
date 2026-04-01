/**
 * ENVIRONMENT VARIABLE VALIDATION
 * ================================
 * Validates that a required environment variable exists.
 * Throws a clear, actionable error instead of silently falling back to localhost.
 *
 * Usage:
 *   const host = requireEnv('REDIS_HOST')
 *   // Throws: "FATAL: Required environment variable REDIS_HOST is not set..."
 */

/**
 * Returns the value of the given env var, or throws a clear error if missing.
 * Use this for env vars that MUST exist in production — no silent fallbacks.
 */
export function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value || value.trim() === '') {
        throw new Error(
            `FATAL: Required environment variable ${name} is not set. ` +
            `Check your .env.local (development) or Vercel/server environment (production). ` +
            `The application cannot function without this value.`
        )
    }
    return value
}

/**
 * Returns the value of the given env var, or null if not set.
 * Use this for env vars that are genuinely optional (feature flags, optional integrations).
 * DO NOT use this as a lazy escape hatch to avoid requireEnv().
 */
export function optionalEnv(name: string): string | null {
    const value = process.env[name]
    return value && value.trim() !== '' ? value : null
}
