/**
 * OpenAI Provider Adapter
 * 
 * Handles OpenAI API integration with model discovery and cost tracking
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { AbstractProvider } from '../BaseProvider'
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

export class OpenAIProvider extends AbstractProvider {
    readonly name: ProviderType = 'openai'
    protected defaultModel = 'gpt-4-turbo-preview'

    protected costConfigs = new Map<string, CostConfig>([
        ['gpt-4-turbo-preview', { model: 'gpt-4-turbo-preview', inputCostPer1kTokens: 0.01, outputCostPer1kTokens: 0.03 }],
        ['gpt-4', { model: 'gpt-4', inputCostPer1kTokens: 0.03, outputCostPer1kTokens: 0.06 }],
        ['gpt-4-32k', { model: 'gpt-4-32k', inputCostPer1kTokens: 0.06, outputCostPer1kTokens: 0.12 }],
        ['gpt-3.5-turbo', { model: 'gpt-3.5-turbo', inputCostPer1kTokens: 0.0005, outputCostPer1kTokens: 0.0015 }],
        ['gpt-3.5-turbo-16k', { model: 'gpt-3.5-turbo-16k', inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.004 }],
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
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    error.error?.message || `OpenAI API error: ${response.status}`,
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
            throw this.createError(error.message || 'OpenAI generation failed', undefined, false)
        }
    }

    async getModels(apiKey: string): Promise<AIModel[]> {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`)
            }

            const data = await response.json()

            // Filter for GPT models only
            const gptModels = data.data.filter((model: any) =>
                model.id.startsWith('gpt-')
            )

            return gptModels.map((model: any) => ({
                id: model.id,
                name: model.id,
                contextWindow: this.getContextWindow(model.id),
                maxOutputTokens: this.getMaxOutputTokens(model.id),
                supportsFunctions: model.id.includes('gpt-4') || model.id.includes('gpt-3.5'),
                supportsVision: model.id.includes('vision') || model.id.includes('gpt-4-turbo'),
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
            supportsVision: true,
            supportsStreaming: true,
            supportsEmbeddings: true,
            maxContextWindow: 128000 // gpt-4-turbo
        }
    }

    private getContextWindow(modelId: string): number {
        if (modelId.includes('gpt-4-turbo')) return 128000
        if (modelId.includes('gpt-4-32k')) return 32768
        if (modelId.includes('gpt-4')) return 8192
        if (modelId.includes('16k')) return 16384
        return 4096
    }

    private getMaxOutputTokens(modelId: string): number {
        if (modelId.includes('gpt-4-turbo')) return 4096
        if (modelId.includes('gpt-4')) return 4096
        return 2048
    }
}

    // ============================================================
    // BRAIN CHAT — multi-turn + tool calling
    // ============================================================
    async chat(
        messages: BrainChatMessage[],
        options: BrainChatOptions,
        apiKey: string
    ): Promise<BrainChatResponse> {
        const model = options.preferredModel || options.model || 'gpt-4o'
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

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
            throw this.createError(
                err.error?.message || `OpenAI chat error: ${response.status}`,
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
            providerType:  this.name,
            finishReason: (choice?.finish_reason as BrainChatResponse['finishReason']) ?? 'stop',
        }
    }

    // ============================================================
    // EMBEDDINGS
    // ============================================================
    async embed(texts: string[], apiKey: string): Promise<BrainEmbedResponse> {
        const model = 'text-embedding-3-large'

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model, input: texts }),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
            throw this.createError(
                err.error?.message || `OpenAI embeddings error: ${response.status}`,
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

export const openaiProvider = new OpenAIProvider()
