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
    ProviderType
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
}

export const xaiProvider = new XAIProvider()
