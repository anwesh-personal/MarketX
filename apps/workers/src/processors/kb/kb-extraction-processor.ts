/**
 * KB Extraction Processor — Worker-side
 *
 * Receives queued extraction jobs, resolves the org's AI provider,
 * calls the LLM, writes results to kb_extraction_jobs table.
 * Frontend polls /api/kb/extract/status for completion.
 */

import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// ─── Types ───────────────────────────────────────────────────

export interface KBExtractionJob {
    extractionId: string
    orgId: string
    userId: string
    rawText: string
    fileName: string
    fileSize: number
}

interface ResolvedProvider {
    provider: string
    model: string
    apiKey: string
    baseUrl: string
}

const PROVIDER_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    mistral: 'https://api.mistral.ai/v1',
    xai: 'https://api.x.ai/v1',
    perplexity: 'https://api.perplexity.ai',
}

const DEFAULT_MODELS: Record<string, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-2.0-flash',
    mistral: 'mistral-large-latest',
    xai: 'grok-2-1212',
    perplexity: 'llama-3.1-sonar-large-128k-online',
}

// ─── Decryption (mirrors secrets.ts from frontend) ───────────

function decryptSecret(secret: string | null): string {
    if (!secret) return ''
    const PREFIX = 'enc:v1:'
    if (!secret.startsWith(PREFIX)) return secret

    const crypto = require('crypto')
    const source = process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET
    if (!source) return ''

    const key = crypto.createHash('sha256').update(source).digest()
    const payload = secret.slice(PREFIX.length)
    const [ivPart, tagPart, encPart] = payload.split(':')
    if (!ivPart || !tagPart || !encPart) return ''

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    return Buffer.concat([
        decipher.update(Buffer.from(encPart, 'base64url')),
        decipher.final(),
    ]).toString('utf8')
}

// ─── Provider Resolution ─────────────────────────────────────

async function resolveProvider(orgId: string): Promise<ResolvedProvider> {
    if (!supabase) throw new Error('No DB connection')

    // Org provider first, then platform fallback
    for (const filter of [
        { column: 'org_id', value: orgId },
        { column: 'org_id', value: null },
    ]) {
        const query = supabase
            .from('ai_providers')
            .select('id, provider, api_key')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)

        const result = filter.value === null
            ? await query.is('org_id', null).single()
            : await query.eq('org_id', filter.value).single()

        if (result.data?.api_key) {
            const apiKey = decryptSecret(result.data.api_key)
            if (apiKey) {
                // Resolve model from ai_models table
                const { data: model } = await supabase
                    .from('ai_models')
                    .select('model_id')
                    .eq('provider_id', result.data.id)
                    .eq('is_active', true)
                    .eq('model_type', 'chat')
                    .limit(1)
                    .single()

                return {
                    provider: result.data.provider,
                    model: model?.model_id ?? DEFAULT_MODELS[result.data.provider] ?? 'gpt-4o',
                    apiKey,
                    baseUrl: PROVIDER_URLS[result.data.provider] ?? PROVIDER_URLS.openai,
                }
            }
        }
    }

    throw new Error('No active AI provider. Configure one in Superadmin → AI Providers.')
}

// ─── AI Call ─────────────────────────────────────────────────

async function callAI(p: ResolvedProvider, system: string, user: string): Promise<string> {
    let res: Response

    if (p.provider === 'anthropic') {
        res = await fetch(`${p.baseUrl}/messages`, {
            method: 'POST',
            headers: { 'x-api-key': p.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: p.model, system, messages: [{ role: 'user', content: user }], max_tokens: 4096 }),
        })
        if (!res.ok) throw new Error(`Anthropic: ${res.statusText}`)
        const d = await res.json() as { content?: Array<{ text?: string }> }
        return d.content?.[0]?.text ?? ''
    }

    if (p.provider === 'google') {
        res = await fetch(`${p.baseUrl}/models/${p.model}:generateContent?key=${p.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: system }] },
                contents: [{ parts: [{ text: user }] }],
                generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json' },
            }),
        })
        if (!res.ok) throw new Error(`Google: ${res.statusText}`)
        const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
        return d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }

    // OpenAI-compatible
    res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${p.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: p.model,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            max_tokens: 4096,
            response_format: { type: 'json_object' },
        }),
    })
    if (!res.ok) throw new Error(`AI: ${res.statusText}`)
    const d = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    return d.choices?.[0]?.message?.content ?? ''
}

// ─── Extraction Prompt ───────────────────────────────────────

async function getPrompt(orgId: string): Promise<string> {
    if (!supabase) return SYSTEM_PROMPT

    const { data } = await supabase
        .from('mastery_agent_configs')
        .select('locked_constraints')
        .eq('agent_key', 'kb_extraction')
        .eq('is_active', true)
        .or(`partner_id.eq.${orgId},scope.eq.global`)
        .order('scope', { ascending: true })
        .limit(1)
        .single()

    const custom = data?.locked_constraints as Record<string, unknown> | null
    if (custom?.custom_prompt && typeof custom.custom_prompt === 'string') {
        return custom.custom_prompt
    }
    return SYSTEM_PROMPT
}

const SYSTEM_PROMPT = `You are a world-class B2B marketing strategist. Analyze the document and extract structured JSON.

Return ONLY valid JSON:
{
  "brand_name": "string",
  "voice_rules": ["array"],
  "forbidden_claims": ["array"],
  "required_disclosures": ["array"],
  "icp_segments": [{"segment_name":"","industry":"","revenue_band":"SMB|LMM|MM|ENT","seniority":"IC|MANAGER|DIRECTOR|EXEC","pain_points":[],"job_titles":[],"buying_triggers":[],"decision_criteria":[]}],
  "offers": [{"offer_name":"","category":"","value_proposition":"","differentiators":[],"pricing_model":"","delivery_timeline":"","proof_points":[]}],
  "angles": [{"angle_name":"","axis":"risk|speed|control|loss|upside|identity","narrative":""}],
  "ctas": [{"cta_type":"REPLY|CLICK|BOOK_CALL|DOWNLOAD|OTHER","label":"","destination_type":"","destination_slug":""}],
  "confidence": 0.85,
  "missing_sections": []
}`

// ─── Main Processor ──────────────────────────────────────────

export async function processKBExtraction(job: Job<KBExtractionJob>): Promise<void> {
    const { extractionId, orgId, rawText, fileName } = job.data
    console.log(`🧠 [KBExtraction] ${extractionId} for org=${orgId} file="${fileName}"`)

    if (!supabase) throw new Error('No DB')

    await supabase.from('kb_extraction_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', extractionId)
    job.updateProgress(10)

    try {
        const resolved = await resolveProvider(orgId)
        console.log(`🤖 [KBExtraction] Using ${resolved.provider}/${resolved.model}`)

        await supabase.from('kb_extraction_jobs').update({ provider_used: resolved.provider, model_used: resolved.model }).eq('id', extractionId)
        job.updateProgress(20)

        const prompt = await getPrompt(orgId)
        const truncated = rawText.slice(0, 50_000)
        job.updateProgress(30)

        const raw = await callAI(resolved, prompt, `Extract from this document:\n\n---\n${truncated}\n---`)
        job.updateProgress(80)

        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        const sections = JSON.parse(cleaned)

        await supabase.from('kb_extraction_jobs').update({
            status: 'completed',
            result: sections,
            raw_text_preview: rawText.slice(0, 2000),
            completed_at: new Date().toISOString(),
        }).eq('id', extractionId)

        job.updateProgress(100)
        console.log(`✅ [KBExtraction] ${extractionId} done. Confidence: ${sections.confidence}`)
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ [KBExtraction] ${extractionId} failed:`, msg)
        await supabase.from('kb_extraction_jobs').update({ status: 'failed', error: msg, completed_at: new Date().toISOString() }).eq('id', extractionId)
        throw error
    }
}
