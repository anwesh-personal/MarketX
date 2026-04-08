/**
 * Mistral AI Provider Adapter
 * 
 * Handles Mistral AI API integration
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

export class MistralProvider extends AbstractProvider {
    readonly name: ProviderType = 'mistral'
    protected defaultModel = 'mistral-medium'

    protected costConfigs = new Map<string, CostConfig>([
        ['mistral-large-latest', { model: 'mistral-large-latest', inputCostPer1kTokens: 0.008, outputCostPer1kTokens: 0.024 }],
        ['mistral-medium-latest', { model: 'mistral-medium-latest', inputCostPer1kTokens: 0.0027, outputCostPer1kTokens: 0.0081 }],
        ['mistral-small-latest', { model: 'mistral-small-latest', inputCostPer1kTokens: 0.002, outputCostPer1kTokens: 0.006 }],
        ['open-mistral-7b', { model: 'open-mistral-7b', inputCostPer1kTokens: 0.00025, outputCostPer1kTokens: 0.00025 }],
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
            const response = await fetch(`${PROVIDER_BASE_URLS.mistral}/chat/completions`, {
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
                    error.message || `Mistral API error: ${response.status}`,
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
            throw this.createError(error.message || 'Mistral generation failed', undefined, false)
        }
    }

    async getModels(apiKey: string): Promise<AIModel[]> {
        try {
            const response = await fetch(`${PROVIDER_BASE_URLS.mistral}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`)
            }

            const data = await response.json()

            return data.data.map((model: any) => ({
                id: model.id,
                name: model.id,
                contextWindow: this.getContextWindow(model.id),
                maxOutputTokens: 4096,
                supportsFunctions: model.id.includes('large'),
                supportsVision: false,
                supportsStreaming: true
            }))
        } catch (error: any) {
            throw this.createError(error.message || 'Model discovery failed')
        }
    }

    getCapabilities(): ProviderCapabilities {
        return {
            supportsChat: true,
            supportsCompletion: true,
            supportsFunctions: true,
            supportsVision: false,
            supportsStreaming: true,
            supportsEmbeddings: true,
            maxContextWindow: 32768
        }
    }

    private getContextWindow(modelId: string): number {
        if (modelId.includes('large')) return 32768
        return 8192
    }

    // ============================================================
    // BRAIN CHAT — multi-turn (Mistral uses OpenAI-compatible API)
    // ============================================================
    async chat(
        messages: BrainChatMessage[],
        options: BrainChatOptions,
        apiKey: string
    ): Promise<BrainChatResponse> {
        const model = options.preferredModel || options.model || 'mistral-large-latest'
        const body: Record<string, unknown> = {
            model,
            messages: messages.map(m => {
                const msg: Record<string, unknown> = { role: m.role, content: m.content }
                if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
                if (m.tool_calls)   msg.tool_calls   = m.tool_calls
                return msg
            }),
            max_tokens:  options.maxTokens  ?? 4096,
            temperature: options.temperature ?? 0.7,
        }

        if (options.tools && options.tools.length > 0) {
            body.tools = options.tools
            body.tool_choice = 'auto'
        }

        if (options.responseFormat) {
            body.response_format = options.responseFormat
        }

        const response = await fetch(`${PROVIDER_BASE_URLS.mistral}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
            throw this.createError(
                err.error?.message || err.message || `Mistral chat error: ${response.status}`,
                response.status,
                response.status === 429 || response.status >= 500
            )
        }

        const data = await response.json()
        const choice = data.choices?.[0]

        return {
            content:      choice?.message?.content    ?? '',
            toolCalls:    choice?.message?.tool_calls ?? [],
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

    // ============================================================
    // EMBEDDINGS — Mistral has a native /embeddings endpoint
    // ============================================================
    async embed(texts: string[], apiKey: string): Promise<BrainEmbedResponse> {
        const model = 'mistral-embed'

        const response = await fetch(`${PROVIDER_BASE_URLS.mistral}/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model, input: texts }),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
            throw this.createError(
                err.error?.message || err.message || `Mistral embeddings error: ${response.status}`,
                response.status,
                response.status === 429 || response.status >= 500
            )
        }

        const data = await response.json()
        const embeddings: number[][] = data.data
            .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
            .map((item: { embedding: number[] }) => item.embedding)

        return {
            embeddings,
            model,
            providerType: this.name,
            totalTokens:  data.usage?.total_tokens ?? 0,
        }
    }
}

export const mistralProvider = new MistralProvider()
