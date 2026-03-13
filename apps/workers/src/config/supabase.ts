/**
 * Supabase config for workers. Fail fast at startup if URL or service key is missing.
 * Use this instead of inline env with empty fallbacks so we don't createClient('', '') and fail later.
 */

export function getSupabaseConfig(): { url: string; serviceKey: string } {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || typeof url !== 'string' || url.trim() === '') {
        throw new Error(
            'FATAL: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set. Refusing to start with empty URL.'
        )
    }
    if (!serviceKey || typeof serviceKey !== 'string' || serviceKey.trim() === '') {
        throw new Error(
            'FATAL: SUPABASE_SERVICE_ROLE_KEY must be set. Refusing to start with empty key.'
        )
    }

    return { url: url.trim(), serviceKey: serviceKey.trim() }
}
