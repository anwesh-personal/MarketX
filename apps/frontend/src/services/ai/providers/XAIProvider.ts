/**
 * X.AI (Grok) Provider Adapter
 * 
 * Handles X.AI Grok API integration
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

export class XAIProvider extends AbstractProvider {
    readonly name: ProviderType = 'xai'
    protected defaultModel = 'grok-beta'

    protected costConfigs = new Map<string, CostConfig>([
        ['grok-beta', { model: 'grok-beta', inputCostPer1kTokens: 0.005, outputCostPer1kTokens: 0.015 }],
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
            const response = await fetch(`${PROVIDER_BASE_URLS.xai}/chat/completions`, {
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
                    error.error?.message || `X.AI API error: ${response.status}`,
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
                    created: data.created
                }
            }
        } catch (error: any) {
            if (error.provider) throw error
            throw this.createError(error.message || 'X.AI generation failed', undefined, false)
        }
    }

    async getModels(apiKey: string): Promise<AIModel[]> {
        // X.AI currently doesn't have a models endpoint, return known model
        return [
            {
                id: 'grok-beta',
                name: 'Grok Beta',
                contextWindow: 8192,
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
            maxContextWindow: 8192
        }
    }

    // ============================================================
    // BRAIN CHAT — multi-turn (X.AI uses OpenAI-compatible API)
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

        // X.AI doesn't support tool calling yet

        const response = await fetch(`${PROVIDER_BASE_URLS.xai}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
            throw this.createError(
                err.error?.message || `X.AI chat error: ${response.status}`,
                response.status,
                response.status === 429 || response.status >= 500
            )
        }

        const data = await response.json()
        const choice = data.choices?.[0]

        return {
            content:      choice?.message?.content ?? '',
            toolCalls:    [],  // X.AI doesn't support tool calling
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

    // X.AI does NOT offer an embeddings API.
    // This is a correct capability boundary, not a stub.
    async embed(_texts: string[], _apiKey: string): Promise<BrainEmbedResponse> {
        throw this.createError(
            'X.AI (Grok) does not support embeddings. Use OpenAI or Google for embedding generation.',
            501,
            false
        )
    }
}

export const xaiProvider = new XAIProvider()
