/**
 * Shared AI caller for deploy hydration modules.
 * Resolves provider/model from agent template config.
 * No duplication — both hydrate-beliefs and hydrate-domain use this.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from '@/lib/secrets'
import { PROVIDER_BASE_URLS } from '@/lib/ai-providers'

export async function callTemplateAI(
    supabase: SupabaseClient,
    template: any,
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const providerType = template.preferred_provider || 'openai'

    const { data: prov, error: provErr } = await supabase
        .from('ai_providers')
        .select('api_key, provider')
        .eq('provider', providerType)
        .eq('is_active', true)
        .limit(1)
        .single()

    if (provErr || !prov) throw new Error(`No active ${providerType} provider configured`)

    const apiKey = decryptSecret(prov.api_key)

    // Resolve model from template → DB default → static fallback
    let model = template.preferred_model
    if (!model) {
        const { data: m } = await supabase
            .from('ai_model_metadata')
            .select('model_id')
            .eq('provider', providerType)
            .eq('is_active', true)
            .order('model_id')
            .limit(1)
            .single()
        model = m?.model_id
    }

    const temp = template.temperature ?? 0.4
    const maxTokens = template.max_tokens ?? 8192

    if (providerType === 'anthropic') {
        const res = await fetch(`${PROVIDER_BASE_URLS.anthropic}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: model || 'claude-sonnet-4-20250514',
                max_tokens: maxTokens,
                temperature: temp,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
            }),
        })
        if (!res.ok) {
            const body = await res.text()
            throw new Error(`Anthropic ${res.status}: ${body.slice(0, 300)}`)
        }
        const d = await res.json()
        return d.content?.[0]?.text || ''
    }

    if (providerType === 'google') {
        const selectedModel = model || 'gemini-2.0-flash'
        const res = await fetch(
            `${PROVIDER_BASE_URLS.google}/models/${selectedModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: { maxOutputTokens: maxTokens, temperature: temp },
                }),
            }
        )
        if (!res.ok) {
            const body = await res.text()
            throw new Error(`Google ${res.status}: ${body.slice(0, 300)}`)
        }
        const d = await res.json()
        return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    // Default: OpenAI-compatible (openai, xai, mistral, etc.)
    const baseUrl = PROVIDER_BASE_URLS[providerType as keyof typeof PROVIDER_BASE_URLS] || PROVIDER_BASE_URLS.openai
    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model || 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            max_tokens: maxTokens,
            temperature: temp,
        }),
    })
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`${providerType} ${res.status}: ${body.slice(0, 300)}`)
    }
    const d = await res.json()
    return d.choices?.[0]?.message?.content || ''
}

/**
 * Parse AI response — extract JSON from markdown fences or raw text.
 */
export function parseAIJSON(content: string): any {
    // Direct parse
    try { return JSON.parse(content) } catch {}

    // Extract from ```json ... ```
    const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
        try { return JSON.parse(fenceMatch[1]) } catch {}
    }

    // Find outermost { ... }
    const braceStart = content.indexOf('{')
    const braceEnd = content.lastIndexOf('}')
    if (braceStart !== -1 && braceEnd > braceStart) {
        try { return JSON.parse(content.slice(braceStart, braceEnd + 1)) } catch {}
    }

    return null
}

/**
 * Build system prompt from template's 4-layer stack.
 */
export function buildSystemPrompt(template: any): string {
    return [
        template.system_prompt,
        template.persona_prompt ? `\n\n## Persona\n${template.persona_prompt}` : '',
        template.instruction_prompt ? `\n\n## Instructions\n${template.instruction_prompt}` : '',
        template.guardrails_prompt ? `\n\n## Guardrails\n${template.guardrails_prompt}` : '',
    ].filter(Boolean).join('')
}
