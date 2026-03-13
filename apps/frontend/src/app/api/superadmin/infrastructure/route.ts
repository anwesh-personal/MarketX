/**
 * /api/superadmin/infrastructure
 *
 * GET   → full infra config (sensitive values masked)
 * PATCH → update any infra config fields
 * POST  → test a connection (redis / worker / vps / ai_key)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { getInfraConfig, invalidateInfraCache, saveInfraConfig, saveAIKey, deleteAIKey } from '@/lib/infra-config'

const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function mask(val: string | null | undefined): string | null {
    if (!val) return null
    if (val.length <= 8) return '••••••••'
    return `${val.substring(0, 4)}${'•'.repeat(Math.min(val.length - 8, 20))}${val.substring(val.length - 4)}`
}

// ── GET ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // Raw DB values for the form (masked sensitive)
        const [deployRes, aiRes, vpsRes] = await Promise.all([
            supabase.from('worker_deployment_config').select('*').single(),
            supabase.from('platform_ai_keys').select('provider, api_key, base_url, is_active, last_tested, test_status, test_model, test_error, notes, updated_at'),
            supabase.from('vps_servers').select('id, name, host, port, username, status'),
        ])

        const d = deployRes.data || {}
        const aiRows = aiRes.data || []
        const vpsServers = vpsRes.data || []

        return NextResponse.json({
            deployment: {
                id: d.id,
                active_target: d.active_target || 'local',
                active_target_label: d.active_target_label || null,
                // Redis
                redis_url: mask(d.redis_url),
                redis_url_set: !!d.redis_url,
                redis_password_set: !!d.redis_password,
                redis_tls: d.redis_tls || false,
                redis_db: d.redis_db || 0,
                redis_status: d.redis_status || 'unconfigured',
                redis_last_ping: d.redis_last_ping || null,
                redis_error: d.redis_error || null,
                // Worker API
                worker_api_url: d.worker_api_url || null,
                worker_api_secret_set: !!d.worker_api_secret,
                worker_status: d.worker_status || 'unconfigured',
                worker_last_ping: d.worker_last_ping || null,
                // Railway
                railway_token_set: !!d.railway_token,
                railway_project_id: d.railway_project_id || null,
                railway_service_id: d.railway_service_id || null,
                railway_environment: d.railway_environment || 'production',
                railway_domain: d.railway_domain || null,
                // VPS
                vps_server_id: d.vps_server_id || null,
                // Dedicated
                dedicated_host: d.dedicated_host || null,
                dedicated_port: d.dedicated_port || 22,
                dedicated_username: d.dedicated_username || null,
                dedicated_password_set: !!d.dedicated_password,
                dedicated_ssh_key_set: !!d.dedicated_ssh_key,
                // Scaling
                auto_scale_enabled: d.auto_scale_enabled || false,
                min_workers: d.min_workers || 1,
                max_workers: d.max_workers || 10,
                queue_concurrency: d.queue_concurrency || {},
                // Timestamps
                last_deployment_at: d.last_deployment_at || null,
                last_deployment_status: d.last_deployment_status || null,
            },
            ai_keys: aiRows.map((r: any) => ({
                provider: r.provider,
                api_key_preview: mask(r.api_key),
                api_key_set: !!r.api_key,
                base_url: r.base_url || null,
                is_active: r.is_active,
                last_tested: r.last_tested,
                test_status: r.test_status,
                test_model: r.test_model,
                test_error: r.test_error,
                notes: r.notes,
                updated_at: r.updated_at,
            })),
            vps_servers: vpsServers,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── PATCH — save config ───────────────────────────────────────

export async function PATCH(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { section, ...updates } = body

        if (section === 'ai_key') {
            const { provider, api_key, base_url, delete: shouldDelete } = updates
            if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 })

            if (shouldDelete) {
                await deleteAIKey(provider)
            } else {
                if (!api_key) return NextResponse.json({ error: 'api_key required' }, { status: 400 })
                const err = await saveAIKey(provider, api_key, base_url)
                if (err) throw err
            }

            // Audit
            await logAudit(admin.email, 'ai_key', provider,
                shouldDelete ? 'deleted' : 'updated', admin.email)

            return NextResponse.json({ success: true })
        }

        // Deployment config update
        const allowedFields = [
            'active_target', 'active_target_label',
            'redis_url', 'redis_password', 'redis_tls', 'redis_db',
            'worker_api_url', 'worker_api_secret',
            'railway_token', 'railway_project_id', 'railway_service_id',
            'railway_environment', 'railway_domain',
            'vps_server_id',
            'dedicated_host', 'dedicated_port', 'dedicated_username',
            'dedicated_password', 'dedicated_ssh_key',
            'auto_scale_enabled', 'min_workers', 'max_workers',
            'queue_concurrency',
        ]

        const patch: Record<string, any> = {}
        for (const field of allowedFields) {
            if (field in updates) patch[field] = updates[field]
        }

        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        const err = await saveInfraConfig(patch as any)
        if (err) throw err

        // Audit sensitive changes
        const sensitiveFields = ['redis_url', 'redis_password', 'railway_token', 'dedicated_password', 'dedicated_ssh_key', 'worker_api_secret']
        for (const field of Object.keys(patch)) {
            const isSensitive = sensitiveFields.includes(field)
            await logAudit(admin.email, section || 'deployment', field,
                isSensitive ? '[REDACTED]' : String(patch[field]), admin.email)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── POST — test connection ────────────────────────────────────

export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { test } = await req.json()

        if (test === 'redis') {
            return testRedis()
        }

        if (test === 'worker') {
            return testWorkerApi()
        }

        if (test === 'ai_key') {
            const body = await req.json().catch(() => ({}))
            return testAIKey(body.provider)
        }

        if (test === 'vps') {
            return testVps()
        }

        return NextResponse.json({ error: 'Unknown test type' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── Test helpers ──────────────────────────────────────────────

async function testRedis() {
    try {
        const config = await getInfraConfig(true)

        if (!config.redisUrl) {
            return NextResponse.json({ ok: false, error: 'Redis URL not configured' })
        }

        // Ping via worker API (workers are the Redis clients)
        const workerRes = await fetch(`${config.workerApiUrl}/api/redis`, {
            signal: AbortSignal.timeout(5000),
        })

        if (!workerRes.ok) throw new Error('Worker API not reachable')
        const data = await workerRes.json()

        // Update status in DB
        await supabase.from('worker_deployment_config').update({
            redis_status: data.connected ? 'ok' : 'error',
            redis_last_ping: new Date().toISOString(),
            redis_error: data.connected ? null : (data.error || 'Connection failed'),
        }).eq('id', (await supabase.from('worker_deployment_config').select('id').single()).data?.id)

        invalidateInfraCache()

        return NextResponse.json({
            ok: data.connected,
            stats: data.stats,
            error: data.connected ? null : 'Redis not connected',
        })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message })
    }
}

async function testWorkerApi() {
    try {
        const config = await getInfraConfig(true)
        const url = config.workerApiUrl

        const res = await fetch(`${url}/api/health`, {
            signal: AbortSignal.timeout(5000),
        })

        const ok = res.ok
        const data = await res.json().catch(() => ({}))

        await supabase.from('worker_deployment_config').update({
            worker_status: ok ? 'ok' : 'error',
            worker_last_ping: new Date().toISOString(),
        }).eq('id', (await supabase.from('worker_deployment_config').select('id').single()).data?.id)

        invalidateInfraCache()

        return NextResponse.json({ ok, url, data, error: ok ? null : 'Worker API not responding' })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message })
    }
}

async function testAIKey(provider: string) {
    if (!provider) return NextResponse.json({ ok: false, error: 'provider required' })

    try {
        const config = await getInfraConfig(true)
        const key = config.aiKeys[provider]
        if (!key) return NextResponse.json({ ok: false, error: `No API key for ${provider}` })

        // Quick test call per provider
        let ok = false
        let testModel = ''
        let error = null

        if (provider === 'openai') {
            testModel = 'gpt-4o-mini'
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${key}` },
                signal: AbortSignal.timeout(8000),
            })
            ok = res.ok
            if (!ok) error = `HTTP ${res.status}`
        } else if (provider === 'anthropic') {
            testModel = 'claude-3-5-haiku-20241022'
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: testModel, max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] }),
                signal: AbortSignal.timeout(10000),
            })
            ok = res.ok
            if (!ok) error = `HTTP ${res.status}`
        } else if (provider === 'google') {
            testModel = 'gemini-2.0-flash'
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
                signal: AbortSignal.timeout(10000),
            })
            ok = res.ok
            if (!ok) error = `HTTP ${res.status}`
        } else {
            ok = true // unknown provider — assume ok
            testModel = 'unknown'
        }

        // Update test status
        await supabase.from('platform_ai_keys').update({
            last_tested: new Date().toISOString(),
            test_status: ok ? 'ok' : 'error',
            test_model: testModel,
            test_error: error,
        }).eq('provider', provider)

        invalidateInfraCache()

        return NextResponse.json({ ok, provider, test_model: testModel, error })
    } catch (e: any) {
        await supabase.from('platform_ai_keys').update({
            last_tested: new Date().toISOString(),
            test_status: 'error',
            test_error: e.message,
        }).eq('provider', provider)
        return NextResponse.json({ ok: false, error: e.message })
    }
}

async function testVps() {
    try {
        const config = await getInfraConfig(true)
        const host = config.vpsHost || config.dedicatedHost
        if (!host) return NextResponse.json({ ok: false, error: 'No VPS/Dedicated server configured' })

        // Try to reach bootstrap server on port 3000
        const res = await fetch(`http://${host}:3000/pm2/list`, {
            signal: AbortSignal.timeout(5000),
        })
        const ok = res.ok
        return NextResponse.json({ ok, host, error: ok ? null : `Cannot reach ${host}:3000` })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message })
    }
}

// ── Audit helper ──────────────────────────────────────────────

async function logAudit(changedBy: string, section: string, field: string, newValue: string, _actor: string) {
    await supabase.from('infra_config_audit').insert({
        changed_by: changedBy,
        section,
        field,
        new_value: newValue,
    }).catch(() => {}) // non-blocking
}
