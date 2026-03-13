import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { decryptSecret } from '@/lib/secrets'
import { PROVIDER_BASE_URLS, getModelCostInfo } from '@/lib/ai-providers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getDefaultModelForProvider(providerType: string): Promise<string | null> {
    const { data } = await supabase
        .from('ai_model_metadata')
        .select('model_id')
        .eq('provider', providerType)
        .eq('is_active', true)
        .order('model_id', { ascending: true })
        .limit(1)
        .single()
    return data?.model_id ?? null
}

export async function POST(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })
        }

        const body = await req.json()

        // Support both formats: simple message or full messages array
        let messages: { role: string; content: string }[]
        let provider: string
        let model: string
        let temperature = 0.7
        let maxTokens = 1000

        if (body.messages && Array.isArray(body.messages)) {
            // Full format from Playground
            messages = body.messages
            provider = body.provider
            model = body.model
            temperature = body.temperature ?? 0.7
            maxTokens = body.max_tokens ?? 1000
        } else {
            // Simple format
            const { message, history = [] } = body
            provider = body.provider
            model = body.model

            if (!message) {
                return NextResponse.json(
                    { error: 'message or messages array is required' },
                    { status: 400 }
                )
            }

            messages = [
                ...history.map((m: any) => ({ role: m.role, content: m.content })),
                { role: 'user', content: message }
            ]
        }

        // Get API key for the provider
        const { data: providerData, error: providerError } = await supabase
            .from('ai_providers')
            .select('id, api_key, provider, usage_count')
            .eq('provider', provider || 'openai')
            .eq('is_active', true)
            .limit(1)
            .single()

        if (providerError || !providerData) {
            return NextResponse.json(
                { error: `No active ${provider || 'openai'} provider configured` },
                { status: 400 }
            )
        }

        const apiKey = decryptSecret(providerData.api_key)
        const providerType = providerData.provider

        if (!model) {
            const dbDefault = await getDefaultModelForProvider(providerType)
            if (dbDefault) model = dbDefault
        }

        let response, usage, responseModel

        switch (providerType) {
            case 'openai':
                const openaiResult = await callOpenAI(apiKey, messages, model, temperature, maxTokens)
                response = openaiResult.content
                usage = openaiResult.usage
                responseModel = openaiResult.model
                break

            case 'anthropic':
                const anthropicResult = await callAnthropic(apiKey, messages, model, temperature, maxTokens)
                response = anthropicResult.content
                usage = anthropicResult.usage
                responseModel = anthropicResult.model
                break

            case 'google':
                const googleResult = await callGoogle(apiKey, messages, model, temperature, maxTokens)
                response = googleResult.content
                usage = googleResult.usage
                responseModel = googleResult.model
                break

            case 'mistral':
                const mistralResult = await callMistral(apiKey, messages, model, temperature, maxTokens)
                response = mistralResult.content
                usage = mistralResult.usage
                responseModel = mistralResult.model
                break

            case 'xai':
                const xaiResult = await callXAI(apiKey, messages, model, temperature, maxTokens)
                response = xaiResult.content
                usage = xaiResult.usage
                responseModel = xaiResult.model
                break

            case 'perplexity':
                const perplexityResult = await callPerplexity(apiKey, messages, model, temperature, maxTokens)
                response = perplexityResult.content
                usage = perplexityResult.usage
                responseModel = perplexityResult.model
                break

            default:
                return NextResponse.json(
                    { error: `Provider ${providerType} not yet supported for chat` },
                    { status: 400 }
                )
        }

        // Calculate approximate cost
        const cost = calculateCost(providerType, responseModel, usage)

        // Update usage count
        await supabase
            .from('ai_providers')
            .update({
                usage_count: (providerData.usage_count || 0) + 1,
                last_used_at: new Date().toISOString()
            })
            .eq('id', providerData.id)

        return NextResponse.json({
            content: response,
            model: responseModel,
            usage: {
                ...usage,
                total_tokens: (usage.input || 0) + (usage.output || 0)
            },
            cost
        })

    } catch (error: any) {
        console.error('AI Chat Error:', error)
        return NextResponse.json(
            { error: error.message || 'AI chat failed' },
            { status: 500 }
        )
    }
}

// OpenAI API Call
async function callOpenAI(apiKey: string, messages: any[], model?: string, temperature = 0.7, maxTokens = 1000) {
    const selectedModel = model || 'gpt-4o-mini' // DB-resolved upstream; static fallback only if DB is empty

    const response = await fetch(`${PROVIDER_BASE_URLS.openai}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: selectedModel,
            messages,
            max_tokens: maxTokens,
            temperature
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: {
            input: data.usage?.prompt_tokens || 0,
            output: data.usage?.completion_tokens || 0
        }
    }
}

// Anthropic API Call
async function callAnthropic(apiKey: string, messages: any[], model?: string, temperature = 0.7, maxTokens = 1000) {
    const selectedModel = model || 'claude-3-5-sonnet-20241022' // DB-resolved upstream

    // Convert to Anthropic format (system message separate)
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const chatMessages = messages.filter(m => m.role !== 'system')

    const response = await fetch(`${PROVIDER_BASE_URLS.anthropic}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: selectedModel,
            max_tokens: maxTokens,
            temperature,
            system: systemMessage,
            messages: chatMessages
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
        content: data.content?.[0]?.text || '',
        model: data.model,
        usage: {
            input: data.usage?.input_tokens || 0,
            output: data.usage?.output_tokens || 0
        }
    }
}

// Google Gemini API Call
async function callGoogle(apiKey: string, messages: any[], model?: string, temperature = 0.7, maxTokens = 1000) {
    const selectedModel = model || 'gemini-2.0-flash' // DB-resolved upstream

    // Convert to Gemini format
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }))

    const systemInstruction = messages.find(m => m.role === 'system')?.content

    const response = await fetch(
        `${PROVIDER_BASE_URLS.google}/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature
                }
            })
        }
    )

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model: selectedModel,
        usage: {
            input: data.usageMetadata?.promptTokenCount || 0,
            output: data.usageMetadata?.candidatesTokenCount || 0
        }
    }
}

// Mistral API Call
async function callMistral(apiKey: string, messages: any[], model?: string, temperature = 0.7, maxTokens = 1000) {
    const selectedModel = model || 'mistral-small-latest' // DB-resolved upstream

    const response = await fetch(`${PROVIDER_BASE_URLS.mistral}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: selectedModel,
            messages,
            max_tokens: maxTokens,
            temperature
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Mistral API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: {
            input: data.usage?.prompt_tokens || 0,
            output: data.usage?.completion_tokens || 0
        }
    }
}

// Calculate cost based on usage using centralized cost lookup
function calculateCost(provider: string, model: string, usage: { input: number; output: number }): number {
    const costInfo = getModelCostInfo(model)
    const inputCost = (usage.input / 1000000) * costInfo.input
    const outputCost = (usage.output / 1000000) * costInfo.output
    return inputCost + outputCost
}

// xAI (Grok) API Call
async function callXAI(apiKey: string, messages: any[], model?: string, temperature = 0.7, maxTokens = 1000) {
    const selectedModel = model || 'grok-2-1212' // DB-resolved upstream

    const response = await fetch(`${PROVIDER_BASE_URLS.xai}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: selectedModel,
            messages,
            max_tokens: maxTokens,
            temperature
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`xAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: {
            input: data.usage?.prompt_tokens || 0,
            output: data.usage?.completion_tokens || 0
        }
    }
}

// Perplexity API Call
async function callPerplexity(apiKey: string, messages: any[], model?: string, temperature = 0.7, maxTokens = 1000) {
    const selectedModel = model || 'llama-3.1-sonar-large-128k-online' // DB-resolved upstream

    const response = await fetch(`${PROVIDER_BASE_URLS.perplexity}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: selectedModel,
            messages,
            max_tokens: maxTokens,
            temperature
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Perplexity API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: {
            input: data.usage?.prompt_tokens || 0,
            output: data.usage?.completion_tokens || 0
        }
    }
}
