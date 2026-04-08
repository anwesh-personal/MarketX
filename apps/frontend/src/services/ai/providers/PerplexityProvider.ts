/**
 * Perplexity Provider Adapter
 * 
 * Handles Perplexity AI API integration
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { AbstractProvider } from '../BaseProvider'
import { PROVIDER_BASE_URLS } from '@/lib/ai-providers'
import {
    AIModel,
    GenerationOptions,
    GenerationResult,
    ProviderCapabilities,
    CostConfig,
    ProviderType,
    BrainChatMessage,
    BrainChatOptions,
    BrainChatResponse,
    BrainEmbedResponse,
} from '../types'

export class PerplexityProvider extends AbstractProvider {
    readonly name: ProviderType = 'perplexity'
    protected defaultModel = 'llama-3.1-sonar-small-128k-online'

    protected costConfigs = new Map<string, CostConfig>([
        ['llama-3.1-sonar-small-128k-online', { model: 'llama-3.1-sonar-small-128k-online', inputCostPer1kTokens: 0.0002, outputCostPer1kTokens: 0.0002 }],
        ['llama-3.1-sonar-large-128k-online', { model: 'llama-3.1-sonar-large-128k-online', inputCostPer1kTokens: 0.001, outputCostPer1kTokens: 0.001 }],
        ['llama-3.1-sonar-huge-128k-online', { model: 'llama-3.1-sonar-huge-128k-online', inputCostPer1kTokens: 0.005, outputCostPer1kTokens: 0.005 }],
    ])

    async generate(prompt: string, options: GenerationOptions, apiKey: string): Promise<GenerationResult> {
        const model = options.model || this.defaultModel
        const maxTokens = options.maxTokens || 2000
        const temperature = options.temperature ?? 0.7

        const messages: any[] = []

        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt })
        }

        messages.push({ role: 'user', content: prompt })

        try {
            const response = await fetch(`${PROVIDER_BASE_URLS.perplexity}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: maxTokens,
                    temperature,
                    top_p: options.topP ?? 1
                })
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
                throw this.createError(
                    error.error?.message || `Perplexity API error: ${response.status}`,
                    response.status,
                    response.status === 429 || response.status >= 500
                )
            }

            const data = await response.json()
            const content = data.choices?.[0]?.message?.content || ''
            const inputTokens = data.usage?.prompt_tokens || this.estimateTokens(prompt)
            const outputTokens = data.usage?.completion_tokens || this.estimateTokens(content)
            const totalTokens = data.usage?.total_tokens || (inputTokens + outputTokens)

            const cost = this.calculateCost(inputTokens, outputTokens, model)

            return {
                content,
                tokensUsed: {
                    input: inputTokens,
                    output: outputTokens,
                    total: totalTokens
                },
                cost: {
                    input: (inputTokens / 1000) * (this.getCostConfig(model)?.inputCostPer1kTokens || 0),
                    output: (outputTokens / 1000) * (this.getCostConfig(model)?.outputCostPer1kTokens || 0),
                    total: cost
                },
                model,
                provider: this.name,
                finishReason: data.choices?.[0]?.finish_reason,
                metadata: {
                    id: data.id,
                    citations: data.citations // Perplexity includes citations
                }
            }
        } catch (error: any) {
            if (error.provider) throw error
            throw this.createError(error.message || 'Perplexity generation failed', undefined, false)
        }
    }

    async getModels(apiKey: string): Promise<AIModel[]> {
        // Perplexity doesn't have a models endpoint, return known models
        return [
            {
                id: 'llama-3.1-sonar-small-128k-online',
                name: 'Llama 3.1 Sonar Small (Online)',
                contextWindow: 128000,
                maxOutputTokens: 4096,
                supportsFunctions: false,
                supportsVision: false,
                supportsStreaming: true
            },
            {
                id: 'llama-3.1-sonar-large-128k-online',
                name: 'Llama 3.1 Sonar Large (Online)',
                contextWindow: 128000,
                maxOutputTokens: 4096,
                supportsFunctions: false,
                supportsVision: false,
                supportsStreaming: true
            },
            {
                id: 'llama-3.1-sonar-huge-128k-online',
                name: 'Llama 3.1 Sonar Huge (Online)',
                contextWindow: 128000,
                maxOutputTokens: 4096,
                supportsFunctions: false,
                supportsVision: false,
                supportsStreaming: true
            }
        ]
    }

    getCapabilities(): ProviderCapabilities {
        return {
            supportsChat: true,
            supportsCompletion: true,
            supportsFunctions: false,
            supportsVision: false,
            supportsStreaming: true,
            supportsEmbeddings: false,
            maxContextWindow: 128000
        }
    }

    // ============================================================
    // BRAIN CHAT — multi-turn (Perplexity uses OpenAI-compatible API)
    // ============================================================
    async chat(
        messages: BrainChatMessage[],
        options: BrainChatOptions,
        apiKey: string
    ): Promise<BrainChatResponse> {
        const model = options.preferredModel || options.model || this.defaultModel
        const body: Record<string, unknown> = {
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            max_tokens:  options.maxTokens  ?? 4096,
            temperature: options.temperature ?? 0.7,
        }

        // Perplexity doesn't support tool calling

        const response = await fetch(`${PROVIDER_BASE_URLS.perplexity}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
            throw this.createError(
                err.error?.message || `Perplexity chat error: ${response.status}`,
                response.status,
                response.status === 429 || response.status >= 500
            )
        }

        const data = await response.json()
        const choice = data.choices?.[0]

        return {
            content:      choice?.message?.content ?? '',
            toolCalls:    [],  // Perplexity doesn't support tool calling
            usage: {
                promptTokens:     data.usage?.prompt_tokens     ?? 0,
                completionTokens: data.usage?.completion_tokens ?? 0,
                totalTokens:      data.usage?.total_tokens      ?? 0,
            },
            model,
            providerType: this.name,
            finishReason: (choice?.finish_reason as BrainChatResponse['finishReason']) ?? 'stop',
        }
    }

    // Perplexity does NOT offer an embeddings API.
    // This is a correct capability boundary, not a stub.
    async embed(_texts: string[], _apiKey: string): Promise<BrainEmbedResponse> {
        throw this.createError(
            'Perplexity does not support embeddings. Use OpenAI or Google for embedding generation.',
            501,
            false
        )
    }
}

export const perplexityProvider = new PerplexityProvider()
