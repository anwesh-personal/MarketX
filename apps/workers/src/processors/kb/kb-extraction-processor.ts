/**
 * KB Extraction Processor — Worker-side
 *
 * Receives queued extraction jobs, resolves the org's AI provider,
 * calls the LLM, writes results to kb_extraction_jobs table.
 * Frontend polls /api/kb/extract?id=xxx for completion.
 *
 * Handles large documents (100+ pages) via multi-pass chunked extraction:
 *   1. Split document into overlapping chunks at paragraph boundaries
 *   2. Extract structured data from each chunk independently
 *   3. Merge all partial extractions into one consolidated result
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

interface ICPSegment {
    segment_name: string
    industry: string
    revenue_band: string
    seniority: string
    pain_points: string[]
    job_titles: string[]
    buying_triggers: string[]
    decision_criteria: string[]
}

interface Offer {
    offer_name: string
    category: string
    value_proposition: string
    differentiators: string[]
    pricing_model: string
    delivery_timeline: string
    proof_points: string[]
}

interface Angle {
    angle_name: string
    axis: string
    narrative: string
}

interface CTA {
    cta_type: string
    label: string
    destination_type: string
    destination_slug: string
}

/** Shape returned by each AI extraction pass */
interface PartialExtraction {
    brand_name?: string
    voice_rules?: string[]
    forbidden_claims?: string[]
    required_disclosures?: string[]
    icp_segments?: ICPSegment[]
    offers?: Offer[]
    angles?: Angle[]
    ctas?: CTA[]
    confidence?: number
    missing_sections?: string[]
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

const SYSTEM_PROMPT = `You are a world-class B2B marketing strategist and data extraction specialist.

Analyze the provided document section and extract any structured marketing intelligence you can find.
This may be ONE SECTION of a larger document — extract whatever is present in THIS section.
If a field is not mentioned in this section, use an empty string or empty array. Do NOT guess.

Return ONLY valid JSON matching this exact structure:
{
  "brand_name": "string — the company's exact brand name, or empty string if not found",
  "voice_rules": ["array of tone/voice rules found, or empty array"],
  "forbidden_claims": ["array of claims they must never make, or empty array"],
  "required_disclosures": ["array of legal/compliance disclosures, or empty array"],
  "icp_segments": [
    {
      "segment_name": "string",
      "industry": "string",
      "revenue_band": "SMB|LMM|MM|ENT",
      "seniority": "IC|MANAGER|DIRECTOR|EXEC",
      "pain_points": [],
      "job_titles": [],
      "buying_triggers": [],
      "decision_criteria": []
    }
  ],
  "offers": [
    {
      "offer_name": "string",
      "category": "string",
      "value_proposition": "string",
      "differentiators": [],
      "pricing_model": "string",
      "delivery_timeline": "string",
      "proof_points": []
    }
  ],
  "angles": [
    {
      "angle_name": "string",
      "axis": "risk|speed|control|loss|upside|identity",
      "narrative": "string"
    }
  ],
  "ctas": [
    {
      "cta_type": "REPLY|CLICK|BOOK_CALL|DOWNLOAD|OTHER",
      "label": "string",
      "destination_type": "string",
      "destination_slug": "string"
    }
  ],
  "confidence": 0.85,
  "missing_sections": ["array of section names NOT found in this chunk"]
}

Revenue bands: SMB (<$10M), LMM ($10M–$100M), MM ($100M–$1B), ENT (>$1B)
Seniority: IC (Individual Contributor), MANAGER, DIRECTOR, EXEC (VP/C-Suite/Owner)`

// ─── Document Chunking ──────────────────────────────────────

const CHUNK_SIZE = 40_000      // ~10k tokens per chunk
const CHUNK_OVERLAP = 2_000    // 2k char overlap between chunks

/**
 * Splits a large document into overlapping chunks, breaking at paragraph
 * boundaries so we never cut mid-sentence.
 */
function chunkDocument(text: string): string[] {
    // If the document fits in a single chunk, return as-is
    if (text.length <= CHUNK_SIZE) {
        return [text]
    }

    const chunks: string[] = []
    let cursor = 0

    while (cursor < text.length) {
        let end = cursor + CHUNK_SIZE

        // If this would be the last chunk, take everything remaining
        if (end >= text.length) {
            chunks.push(text.slice(cursor))
            break
        }

        // Find the nearest paragraph break (double newline) before the end
        // Search backwards from `end` to find a clean break point
        let breakPoint = text.lastIndexOf('\n\n', end)

        // If no paragraph break found within a reasonable range, try single newline
        if (breakPoint <= cursor || breakPoint < end - 10_000) {
            breakPoint = text.lastIndexOf('\n', end)
        }

        // If still no good break, try period + space (sentence boundary)
        if (breakPoint <= cursor || breakPoint < end - 10_000) {
            breakPoint = text.lastIndexOf('. ', end)
            if (breakPoint > cursor) breakPoint += 1 // include the period
        }

        // Last resort: just cut at CHUNK_SIZE
        if (breakPoint <= cursor) {
            breakPoint = end
        }

        chunks.push(text.slice(cursor, breakPoint))

        // Move cursor forward, minus overlap to ensure continuity
        const prevCursor = cursor
        cursor = breakPoint - CHUNK_OVERLAP
        if (cursor < 0) cursor = 0

        // Safety: if cursor didn't advance past previous position, force it forward
        // This prevents infinite loops in edge cases (e.g., very long non-breaking text)
        if (cursor <= prevCursor) {
            cursor = breakPoint
        }
    }

    return chunks
}

// ─── Result Merging ─────────────────────────────────────────

/**
 * Deduplicates an array of strings, case-insensitive.
 */
function dedupeStrings(arr: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []
    for (const item of arr) {
        const key = item.toLowerCase().trim()
        if (key && !seen.has(key)) {
            seen.add(key)
            result.push(item.trim())
        }
    }
    return result
}

/**
 * Merges multiple partial extractions into one consolidated result.
 * - Scalars: first non-empty value wins
 * - Arrays of strings: union + deduplicate
 * - Arrays of objects: merge by name key, deduplicate
 * - Confidence: average across chunks
 * - Missing sections: only sections missing from ALL chunks
 */
function mergeExtractions(partials: PartialExtraction[]): PartialExtraction {
    if (partials.length === 0) {
        return { brand_name: '', confidence: 0, missing_sections: ['all'] }
    }

    if (partials.length === 1) {
        return partials[0]
    }

    // Brand name: first non-empty
    const brand_name = partials.find(p => p.brand_name?.trim())?.brand_name ?? ''

    // String arrays: union + deduplicate
    const voice_rules = dedupeStrings(partials.flatMap(p => p.voice_rules ?? []))
    const forbidden_claims = dedupeStrings(partials.flatMap(p => p.forbidden_claims ?? []))
    const required_disclosures = dedupeStrings(partials.flatMap(p => p.required_disclosures ?? []))

    // ICP segments: merge by segment_name
    const icpMap = new Map<string, ICPSegment>()
    for (const partial of partials) {
        for (const seg of partial.icp_segments ?? []) {
            const key = seg.segment_name?.toLowerCase().trim()
            if (!key) continue
            const existing = icpMap.get(key)
            if (existing) {
                // Merge arrays within the segment
                existing.pain_points = dedupeStrings([...existing.pain_points, ...seg.pain_points])
                existing.job_titles = dedupeStrings([...existing.job_titles, ...seg.job_titles])
                existing.buying_triggers = dedupeStrings([...existing.buying_triggers, ...seg.buying_triggers])
                existing.decision_criteria = dedupeStrings([...existing.decision_criteria, ...seg.decision_criteria])
                // Fill in empty scalars
                if (!existing.industry && seg.industry) existing.industry = seg.industry
                if (!existing.revenue_band && seg.revenue_band) existing.revenue_band = seg.revenue_band
                if (!existing.seniority && seg.seniority) existing.seniority = seg.seniority
            } else {
                icpMap.set(key, { ...seg })
            }
        }
    }

    // Offers: merge by offer_name
    const offerMap = new Map<string, Offer>()
    for (const partial of partials) {
        for (const offer of partial.offers ?? []) {
            const key = offer.offer_name?.toLowerCase().trim()
            if (!key) continue
            const existing = offerMap.get(key)
            if (existing) {
                existing.differentiators = dedupeStrings([...existing.differentiators, ...offer.differentiators])
                existing.proof_points = dedupeStrings([...existing.proof_points, ...offer.proof_points])
                if (!existing.value_proposition && offer.value_proposition) existing.value_proposition = offer.value_proposition
                if (!existing.pricing_model && offer.pricing_model) existing.pricing_model = offer.pricing_model
                if (!existing.delivery_timeline && offer.delivery_timeline) existing.delivery_timeline = offer.delivery_timeline
                if (!existing.category && offer.category) existing.category = offer.category
            } else {
                offerMap.set(key, { ...offer })
            }
        }
    }

    // Angles: merge by angle_name
    const angleMap = new Map<string, Angle>()
    for (const partial of partials) {
        for (const angle of partial.angles ?? []) {
            const key = angle.angle_name?.toLowerCase().trim()
            if (!key) continue
            if (!angleMap.has(key)) {
                angleMap.set(key, { ...angle })
            }
        }
    }

    // CTAs: merge by label
    const ctaMap = new Map<string, CTA>()
    for (const partial of partials) {
        for (const cta of partial.ctas ?? []) {
            const key = cta.label?.toLowerCase().trim()
            if (!key) continue
            if (!ctaMap.has(key)) {
                ctaMap.set(key, { ...cta })
            }
        }
    }

    // Confidence: average across chunks that had meaningful content
    const confidences = partials
        .map(p => p.confidence ?? 0)
        .filter(c => c > 0)
    const confidence = confidences.length > 0
        ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
        : 0

    // Missing sections: only sections that ALL chunks reported as missing
    const allMissingSets = partials
        .map(p => new Set(p.missing_sections ?? []))
        .filter(s => s.size > 0)

    let missing_sections: string[] = []
    if (allMissingSets.length === partials.length && allMissingSets.length > 0) {
        // Every chunk reported missing sections — intersect them
        missing_sections = [...allMissingSets[0]].filter(
            section => allMissingSets.every(set => set.has(section))
        )
    }

    return {
        brand_name,
        voice_rules,
        forbidden_claims,
        required_disclosures,
        icp_segments: [...icpMap.values()],
        offers: [...offerMap.values()],
        angles: [...angleMap.values()],
        ctas: [...ctaMap.values()],
        confidence,
        missing_sections,
    }
}

// ─── Main Processor ──────────────────────────────────────────

export async function processKBExtraction(job: Job<KBExtractionJob>): Promise<void> {
    const { extractionId, orgId, rawText, fileName } = job.data
    console.log(`🧠 [KBExtraction] ${extractionId} for org=${orgId} file="${fileName}" (${rawText.length} chars)`)

    if (!supabase) throw new Error('No DB')

    await supabase.from('kb_extraction_jobs').update({
        status: 'processing',
        started_at: new Date().toISOString(),
    }).eq('id', extractionId)

    job.updateProgress(5)

    try {
        // 1. Resolve AI provider
        const resolved = await resolveProvider(orgId)
        console.log(`🤖 [KBExtraction] Using ${resolved.provider}/${resolved.model}`)

        await supabase.from('kb_extraction_jobs').update({
            provider_used: resolved.provider,
            model_used: resolved.model,
        }).eq('id', extractionId)

        job.updateProgress(10)

        // 2. Load extraction prompt
        const prompt = await getPrompt(orgId)

        // 3. Chunk the document
        const chunks = chunkDocument(rawText)
        const totalChunks = chunks.length
        console.log(`📦 [KBExtraction] Split into ${totalChunks} chunk(s) (${rawText.length} chars total)`)

        job.updateProgress(15)

        // 4. Extract from each chunk
        const partials: PartialExtraction[] = []
        const progressStart = 15
        const progressEnd = 85
        const progressPerChunk = (progressEnd - progressStart) / totalChunks

        for (let i = 0; i < totalChunks; i++) {
            const chunk = chunks[i]
            const chunkLabel = totalChunks > 1
                ? `Section ${i + 1} of ${totalChunks}`
                : 'Full document'

            console.log(`🔍 [KBExtraction] Processing ${chunkLabel} (${chunk.length} chars)`)

            const userMessage = totalChunks > 1
                ? `This is ${chunkLabel} of a company document. Extract any marketing intelligence found in THIS section:\n\n---\n${chunk}\n---`
                : `Extract structured marketing intelligence from this document:\n\n---\n${chunk}\n---`

            const rawResponse = await callAI(resolved, prompt, userMessage)

            // Parse response
            const cleaned = rawResponse
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/, '')
                .trim()

            try {
                const parsed = JSON.parse(cleaned) as PartialExtraction
                partials.push(parsed)
                console.log(`✅ [KBExtraction] ${chunkLabel}: confidence=${parsed.confidence ?? 'N/A'}`)
            } catch (parseErr) {
                // If one chunk fails to parse, log it but continue with others
                console.warn(`⚠️ [KBExtraction] ${chunkLabel} JSON parse failed, skipping chunk`)
            }

            // Update progress
            const currentProgress = Math.round(progressStart + (i + 1) * progressPerChunk)
            job.updateProgress(currentProgress)
        }

        // 5. Check we got at least one valid extraction
        if (partials.length === 0) {
            throw new Error('AI extraction returned no parseable results from any document section.')
        }

        // 6. Merge all partial extractions
        const merged = mergeExtractions(partials)

        console.log(`🔗 [KBExtraction] Merged ${partials.length}/${totalChunks} chunks → brand="${merged.brand_name}", confidence=${merged.confidence}`)

        job.updateProgress(90)

        // 7. Save final result
        await supabase.from('kb_extraction_jobs').update({
            status: 'completed',
            result: {
                ...merged,
                _extraction_meta: {
                    total_chunks: totalChunks,
                    successful_chunks: partials.length,
                    document_chars: rawText.length,
                },
            },
            raw_text_preview: rawText.slice(0, 2000),
            completed_at: new Date().toISOString(),
        }).eq('id', extractionId)

        job.updateProgress(100)
        console.log(`✅ [KBExtraction] ${extractionId} complete. ${totalChunks} chunks, confidence=${merged.confidence}`)

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ [KBExtraction] ${extractionId} failed:`, msg)

        await supabase.from('kb_extraction_jobs').update({
            status: 'failed',
            error: msg,
            completed_at: new Date().toISOString(),
        }).eq('id', extractionId)

        throw error
    }
}
