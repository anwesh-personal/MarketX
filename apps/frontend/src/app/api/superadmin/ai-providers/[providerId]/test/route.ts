import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import {
    PROVIDER_BASE_URLS,
    getModelCostInfo,
    formatModelName,
    ANTHROPIC_KNOWN_MODELS,
    XAI_KNOWN_MODELS,
    PERPLEXITY_KNOWN_MODELS,
} from '@/lib/ai-providers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/superadmin/ai-providers/:providerId/test
 *
 * Real validation:
 *  1. Hits the actual provider API with the supplied key
 *  2. Fetches real model list from the API response
 *  3. Upserts every discovered model into ai_model_metadata
 *  4. Returns { valid, models, message } or { valid:false, error }
 *
 * No length checks, no prefix checks, no fake validation.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { providerId: string } }
) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { provider, api_key } = await request.json()
        if (!provider || !api_key) {
            return NextResponse.json({ error: 'provider and api_key required' }, { status: 400 })
        }

        const fetcher = MODEL_FETCHERS[provider]
        if (!fetcher) {
            return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 })
        }

        const result = await fetcher(api_key)

        if (!result.valid) {
            return NextResponse.json(result)
        }

        // Upsert every discovered model to ai_model_metadata
        let upserted = 0
        for (const m of result.models) {
            const costInfo = getModelCostInfo(m.id)
            const { error } = await supabase.from('ai_model_metadata').upsert({
                provider,
                model_id: m.id,
                model_name: m.name || formatModelName(m.id),
                key_model: `${provider}_${m.id}`,
                input_cost_per_million: costInfo.input,
                output_cost_per_million: costInfo.output,
                context_window_tokens: costInfo.context,
                supports_vision: costInfo.vision,
                supports_function_calling: costInfo.functions,
                supports_streaming: true,
                is_active: true,
                discovered_at: new Date().toISOString(),
                last_verified_at: new Date().toISOString(),
            }, { onConflict: 'provider,model_id' })

            if (!error) upserted++
        }

        return NextResponse.json({
            ...result,
            models_upserted: upserted,
            message: `${result.message} — ${upserted} models saved to database`,
        })
    } catch (error: any) {
        return NextResponse.json({ valid: false, error: error.message }, { status: 500 })
    }
}

// ═══════════════════════════════════════════════════════════
// Provider-specific fetchers — each hits the REAL API
// ═══════════════════════════════════════════════════════════

interface FetchResult {
    valid: boolean
    models: Array<{ id: string; name: string }>
    message: string
    error?: string
}

type Fetcher = (apiKey: string) => Promise<FetchResult>

const MODEL_FETCHERS: Record<string, Fetcher> = {
    openai: async (apiKey) => {
        const res = await fetch(`${PROVIDER_BASE_URLS.openai}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return { valid: false, models: [], message: '', error: err.error?.message || `Auth failed (${res.status})` }
        }
        const data = await res.json()
        const models = (data.data || [])
            .filter((m: any) => m.id.includes('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3'))
            .map((m: any) => ({ id: m.id, name: formatModelName(m.id) }))
        return { valid: true, models, message: `OpenAI authenticated — ${models.length} chat models found` }
    },

    anthropic: async (apiKey) => {
        // Anthropic has no /models endpoint — auth-check via a 1-token message
        const res = await fetch(`${PROVIDER_BASE_URLS.anthropic}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return { valid: false, models: [], message: '', error: err.error?.message || `Auth failed (${res.status})` }
        }
        const models = ANTHROPIC_KNOWN_MODELS.map(m => ({ id: m.id, name: m.name }))
        return { valid: true, models, message: `Anthropic authenticated — ${models.length} known models` }
    },

    google: async (apiKey) => {
        const res = await fetch(`${PROVIDER_BASE_URLS.google}/models?key=${apiKey}`)
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return { valid: false, models: [], message: '', error: err.error?.message || `Auth failed (${res.status})` }
        }
        const data = await res.json()
        const models = (data.models || [])
            .filter((m: any) => (m.name || '').includes('gemini'))
            .map((m: any) => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name.replace('models/', '') }))
        return { valid: true, models, message: `Google authenticated — ${models.length} Gemini models found` }
    },

    mistral: async (apiKey) => {
        const res = await fetch(`${PROVIDER_BASE_URLS.mistral}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return { valid: false, models: [], message: '', error: err.error?.message || `Auth failed (${res.status})` }
        }
        const data = await res.json()
        const models = (data.data || []).map((m: any) => ({ id: m.id, name: formatModelName(m.id) }))
        return { valid: true, models, message: `Mistral authenticated — ${models.length} models found` }
    },

    perplexity: async (apiKey) => {
        const res = await fetch(`${PROVIDER_BASE_URLS.perplexity}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'sonar', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return { valid: false, models: [], message: '', error: err.error?.message || `Auth failed (${res.status})` }
        }
        const models = PERPLEXITY_KNOWN_MODELS.map(m => ({ id: m.id, name: m.name }))
        return { valid: true, models, message: `Perplexity authenticated — ${models.length} known models` }
    },

    xai: async (apiKey) => {
        const res = await fetch(`${PROVIDER_BASE_URLS.xai}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'grok-beta', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return { valid: false, models: [], message: '', error: err.error?.message || `Auth failed (${res.status})` }
        }
        const models = XAI_KNOWN_MODELS.map(m => ({ id: m.id, name: m.name }))
        return { valid: true, models, message: `xAI authenticated — ${models.length} known models` }
    },
}
