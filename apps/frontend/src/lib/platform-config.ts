/**
 * Platform Configuration Loader
 *
 * Reads operational config from `config_table` in Supabase.
 * Every threshold, limit, and weight is DB-driven — zero hardcoded defaults in endpoints.
 * If a config key is missing from DB, we throw so it's caught at development time,
 * not silently swallowed with a magic number.
 */

type SupabaseClient = any

interface ConfigRow {
    key: string
    value: any
    description: string
}

const CONFIG_CACHE = new Map<string, { value: any; ts: number }>()
const CACHE_TTL_MS = 60_000

function extractValue(row: ConfigRow | undefined, key: string): any {
    if (!row) throw new Error(`Platform config key "${key}" not found in config_table. Seed it via migration or superadmin UI.`)
    const v = row.value
    if (typeof v === 'object' && v !== null && 'value' in v) return v.value
    if (typeof v === 'object' && v !== null && 'weights' in v) return v.weights
    return v
}

export async function getConfigValue(supabase: SupabaseClient, key: string): Promise<any> {
    const cached = CONFIG_CACHE.get(key)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.value

    const { data, error } = await supabase
        .from('config_table')
        .select('key, value, description')
        .eq('key', key)
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to read config key "${key}": ${error.message}`)
    }

    const val = extractValue(data, key)
    CONFIG_CACHE.set(key, { value: val, ts: Date.now() })
    return val
}

export async function getConfigValues(supabase: SupabaseClient, keys: string[]): Promise<Record<string, any>> {
    const uncached: string[] = []
    const result: Record<string, any> = {}

    for (const k of keys) {
        const cached = CONFIG_CACHE.get(k)
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
            result[k] = cached.value
        } else {
            uncached.push(k)
        }
    }

    if (uncached.length > 0) {
        const { data, error } = await supabase
            .from('config_table')
            .select('key, value, description')
            .in('key', uncached)

        if (error) throw new Error(`Failed to read config keys: ${error.message}`)

        for (const k of uncached) {
            const row = (data ?? []).find((r: ConfigRow) => r.key === k)
            const val = extractValue(row, k)
            CONFIG_CACHE.set(k, { value: val, ts: Date.now() })
            result[k] = val
        }
    }

    return result
}

export function invalidateConfigCache(key?: string) {
    if (key) CONFIG_CACHE.delete(key)
    else CONFIG_CACHE.clear()
}
