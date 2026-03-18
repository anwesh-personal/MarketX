/**
 * Engine API Key Authentication
 *
 * Validates `x-api-key: axm_live_*` or `Authorization: Bearer axm_live_*` headers
 * against engine_instances.api_key_hash (SHA-256).
 *
 * Used by client-facing engine execution routes so deployed engines can be
 * invoked with the API key generated at deploy time.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface EngineAuthContext {
    engineId: string
    engineName: string
    orgId: string | null
    assignedUserId: string | null
    bundleId: string | null
    brainAgentId: string | null
    apiKeyMode: string
    snapshot: Record<string, any> | null
    overrides: Record<string, any> | null
    config: Record<string, any> | null
    status: string
}

function extractApiKey(request: NextRequest): string | null {
    const apiKeyHeader = request.headers.get('x-api-key')
    if (apiKeyHeader?.startsWith('axm_live_')) return apiKeyHeader

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer axm_live_')) return authHeader.substring(7)

    return null
}

export async function authenticateEngineApiKey(request: NextRequest): Promise<EngineAuthContext | null> {
    const apiKey = extractApiKey(request)
    if (!apiKey) return null

    const hash = createHash('sha256').update(apiKey).digest('hex')

    const { data: engine, error } = await supabase
        .from('engine_instances')
        .select('id, name, org_id, assigned_user_id, bundle_id, brain_agent_id, api_key_mode, snapshot, overrides, config, status')
        .eq('api_key_hash', hash)
        .single()

    if (error || !engine) return null

    if (engine.status !== 'active') return null

    return {
        engineId: engine.id,
        engineName: engine.name,
        orgId: engine.org_id,
        assignedUserId: engine.assigned_user_id,
        bundleId: engine.bundle_id,
        brainAgentId: engine.brain_agent_id,
        apiKeyMode: engine.api_key_mode,
        snapshot: engine.snapshot,
        overrides: engine.overrides,
        config: engine.config,
        status: engine.status,
    }
}
