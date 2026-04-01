/**
 * InfraConfigService
 *
 * Single source of truth for all infrastructure configuration.
 * Reads from DB (platform_ai_keys + worker_deployment_config).
 * Falls back to env vars only as last resort.
 *
 * Usage (server-side / API routes / workers):
 *   const config = await getInfraConfig()
 *   const redisUrl = config.redisUrl
 *   const openaiKey = config.aiKeys.openai
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Types ─────────────────────────────────────────────────────

export interface InfraConfig {
    // Redis / BullMQ
    redisUrl: string | null
    redisPassword: string | null
    redisTls: boolean
    redisDb: number

    // Worker management API
    workerApiUrl: string
    workerApiSecret: string | null

    // Active deployment target
    activeTarget: 'railway' | 'vps' | 'dedicated' | 'local'

    // Railway
    railwayToken: string | null
    railwayProjectId: string | null
    railwayServiceId: string | null
    railwayEnvironment: string
    railwayDomain: string | null

    // VPS (from vps_servers table via worker_deployment_config.vps_server_id)
    vpsServerId: string | null
    vpsHost: string | null
    vpsPort: number
    vpsUsername: string | null
    vpsPassword: string | null

    // Dedicated server
    dedicatedHost: string | null
    dedicatedPort: number
    dedicatedUsername: string | null
    dedicatedPassword: string | null
    dedicatedSshKey: string | null

    // Queue concurrency
    queueConcurrency: Record<string, number>

    // AI keys
    aiKeys: Record<string, string>  // { openai: 'sk-...', anthropic: 'sk-ant-...', ... }
}

// ── Cache (5 min TTL to avoid DB hit on every request) ────────

let cachedConfig: InfraConfig | null = null
let cacheExpiry: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

export function invalidateInfraCache() {
    cachedConfig = null
    cacheExpiry = 0
}

// ── Main loader ───────────────────────────────────────────────

export async function getInfraConfig(bypassCache = false): Promise<InfraConfig> {
    if (!bypassCache && cachedConfig && Date.now() < cacheExpiry) {
        return cachedConfig
    }

    // Load in parallel
    const [deploymentResult, aiKeysResult, vpsResult] = await Promise.all([
        supabase
            .from('worker_deployment_config')
            .select('*')
            .single(),
        supabase
            .from('platform_ai_keys')
            .select('provider, api_key, base_url')
            .eq('is_active', true),
        supabase
            .from('vps_servers')
            .select('id, host, port, username, password, ssh_key')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle(),
    ])

    const d = deploymentResult.data || {}
    const aiRows = aiKeysResult.data || []

    // Build AI keys map
    const aiKeys: Record<string, string> = {}
    for (const row of aiRows) {
        if (row.api_key) aiKeys[row.provider] = row.api_key
    }

    // Fall back to env vars for AI keys (legacy support)
    if (!aiKeys.openai && process.env.OPENAI_API_KEY) aiKeys.openai = process.env.OPENAI_API_KEY
    if (!aiKeys.anthropic && process.env.ANTHROPIC_API_KEY) aiKeys.anthropic = process.env.ANTHROPIC_API_KEY
    if (!aiKeys.google && process.env.GOOGLE_AI_API_KEY) aiKeys.google = process.env.GOOGLE_AI_API_KEY
    if (!aiKeys.xai && process.env.XAI_API_KEY) aiKeys.xai = process.env.XAI_API_KEY
    if (!aiKeys.mistral && process.env.MISTRAL_API_KEY) aiKeys.mistral = process.env.MISTRAL_API_KEY

    // Determine worker API URL
    let workerApiUrl = d.worker_api_url || process.env.WORKER_API_URL || ''
    if (!workerApiUrl) {
        if (d.active_target === 'railway' && d.railway_domain) {
            const domain = d.railway_domain.startsWith('http') ? d.railway_domain : `https://${d.railway_domain}`
            workerApiUrl = domain
        } else if (d.active_target === 'vps' && vpsResult.data?.host) {
            workerApiUrl = `http://${vpsResult.data.host}:3100`
        } else if (d.active_target === 'dedicated' && d.dedicated_host) {
            workerApiUrl = `http://${d.dedicated_host}:3100`
        } else {
            throw new Error(
                'FATAL: Cannot determine Worker API URL. ' +
                'Set active_target in worker_deployment_config, or set WORKER_API_URL env var.'
            )
        }
    }

    // Build Redis URL — DB first, then env. No silent fallbacks.
    let redisUrl: string | null = d.redis_url || process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || null

    const vps = vpsResult.data

    const config: InfraConfig = {
        redisUrl,
        redisPassword: d.redis_password || process.env.REDIS_PASSWORD || null,
        redisTls: d.redis_tls ?? false,
        redisDb: d.redis_db ?? 0,

        workerApiUrl,
        workerApiSecret: d.worker_api_secret || process.env.WORKER_API_SECRET || null,

        activeTarget: d.active_target || 'local',

        railwayToken: d.railway_token || null,
        railwayProjectId: d.railway_project_id || null,
        railwayServiceId: d.railway_service_id || null,
        railwayEnvironment: d.railway_environment || 'production',
        railwayDomain: d.railway_domain || null,

        vpsServerId: d.vps_server_id || null,
        vpsHost: vps?.host || null,
        vpsPort: vps?.port || 22,
        vpsUsername: vps?.username || null,
        vpsPassword: vps?.password || null,

        dedicatedHost: d.dedicated_host || null,
        dedicatedPort: d.dedicated_port || 22,
        dedicatedUsername: d.dedicated_username || null,
        dedicatedPassword: d.dedicated_password || null,
        dedicatedSshKey: d.dedicated_ssh_key || null,

        queueConcurrency: d.queue_concurrency || {
            'engine-execution': 2,
            'kb-processor': 5,
            'conversation': 3,
            'analytics': 2,
            'dream-state': 2,
            'fine-tuning': 1,
            'learning-loop': 1,
            'workflow-execution': 10,
        },

        aiKeys,
    }

    cachedConfig = config
    cacheExpiry = Date.now() + CACHE_TTL_MS

    return config
}

// ── Redis connection config for BullMQ ────────────────────────

export async function getRedisConnectionConfig() {
    const config = await getInfraConfig()

    if (!config.redisUrl && !config.redisPassword) {
        throw new Error(
            'FATAL: Redis is not configured. ' +
            'Set redis_url in worker_deployment_config, or set REDIS_URL / REDIS_HOST env vars.'
        )
    }

    if (config.redisUrl) {
        try {
            const url = new URL(config.redisUrl)
            return {
                host: url.hostname,
                port: parseInt(url.port) || 6379,
                password: url.password || config.redisPassword || undefined,
                db: config.redisDb,
                tls: config.redisTls ? {} : undefined,
            }
        } catch {
            // URL parse failed — return raw
            return {
                host: config.redisUrl,
                port: 6379,
                password: config.redisPassword || undefined,
            }
        }
    }

    throw new Error(
        'FATAL: Redis URL could not be parsed and no fallback is available. ' +
        'Check your redis_url in worker_deployment_config or REDIS_URL env var.'
    )
}

// ── AI key getter ─────────────────────────────────────────────

export async function getAIKey(provider: string): Promise<string | null> {
    const config = await getInfraConfig()
    return config.aiKeys[provider] || null
}

// ── Save helpers (used by infrastructure settings API) ────────

export async function saveInfraConfig(
    updates: Partial<{
        redis_url: string
        redis_password: string
        redis_tls: boolean
        redis_db: number
        worker_api_url: string
        worker_api_secret: string
        active_target: string
        railway_token: string
        railway_project_id: string
        railway_service_id: string
        railway_environment: string
        railway_domain: string
        dedicated_host: string
        dedicated_port: number
        dedicated_username: string
        dedicated_password: string
        dedicated_ssh_key: string
        queue_concurrency: Record<string, number>
    }>
) {
    const { error } = await supabase
        .from('worker_deployment_config')
        .update(updates)
        .eq('id', (await supabase.from('worker_deployment_config').select('id').single()).data?.id)

    if (!error) invalidateInfraCache()
    return error
}

export async function saveAIKey(
    provider: string,
    apiKey: string,
    baseUrl?: string
) {
    const { error } = await supabase
        .from('platform_ai_keys')
        .upsert({
            provider,
            api_key: apiKey,
            base_url: baseUrl || null,
            is_active: true,
        }, { onConflict: 'provider' })

    if (!error) invalidateInfraCache()
    return error
}

export async function deleteAIKey(provider: string) {
    const { error } = await supabase
        .from('platform_ai_keys')
        .update({ is_active: false })
        .eq('provider', provider)

    if (!error) invalidateInfraCache()
    return error
}
