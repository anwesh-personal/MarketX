/**
 * Google Gemini Provider Adapter
 * 
 * Handles Google Gemini API integration
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
    ProviderType
} from '../types'

export class GoogleProvider extends AbstractProvider {
    readonly name: ProviderType = 'google'
    protected defaultModel = 'gemini-pro'

    protected costConfigs = new Map<string, CostConfig>([
        ['gemini-pro', { model: 'gemini-pro', inputCostPer1kTokens: 0.00025, outputCostPer1kTokens: 0.0005 }],
        ['gemini-pro-vision', { model: 'gemini-pro-vision', inputCostPer1kTokens: 0.00025, outputCostPer1kTokens: 0.0005 }],
        ['gemini-1.5-pro', { model: 'gemini-1.5-pro', inputCostPer1kTokens: 0.00035, outputCostPer1kTokens: 0.00105 }],
        ['gemini-1.5-flash', { model: 'gemini-1.5-flash', inputCostPer1kTokens: 0.000075, outputCostPer1kTokens: 0.0003 }],
    ])

    async generate(prompt: string, options: GenerationOptions, apiKey: string): Promise<GenerationResult> {
        const model = options.model || this.defaultModel
        const maxTokens = options.maxTokens || 2000
        const temperature = options.temperature ?? 0.7

        const contents: any[] = []

        if (options.systemPrompt) {
            contents.push({
                role: 'user',
                parts: [{ text: options.systemPrompt }]
            })
            contents.push({
                role: 'model',
                parts: [{ text: 'Understood. I will follow these instructions.' }]
            })
        }

        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        })

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents,
                        generationConfig: {
                            maxOutputTokens: maxTokens,
                            temperature,
                            topP: options.topP ?? 1
                        }
                    })
                }
            )

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
                throw this.createError(
                    error.error?.message || `Google API error: ${response.status}`,
                    response.status,
                    response.status === 429 || response.status >= 500
                )
            }

            const data = await response.json()
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

            // Estimate tokens (Gemini doesn't always return usage)
            const inputTokens = this.estimateTokens(prompt + (options.systemPrompt || ''))
            const outputTokens = this.estimateTokens(content)
            const totalTokens = inputTokens + outputTokens

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
                finishReason: data.candidates?.[0]?.finishReason,
                metadata: {
                    promptFeedback: data.promptFeedback
                }
            }
        } catch (error: any) {
            if (error.provider) throw error
            throw this.createError(error.message || 'Google generation failed', undefined, false)
        }
    }

    async getModels(apiKey: string): Promise<AIModel[]> {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`)
            }

            const data = await response.json()

            // Filter for generative models
            const generativeModels = data.models?.filter((model: any) =>
                model.supportedGenerationMethods?.includes('generateContent')
            ) || []

            return generativeModels.map((model: any) => ({
                id: model.name.replace('models/', ''),
                name: model.displayName || model.name,
                contextWindow: this.getContextWindow(model.name),
                maxOutputTokens: model.outputTokenLimit || 2048,
                supportsFunctions: false,
                supportsVision: model.name.includes('vision') || model.name.includes('1.5'),
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
            supportsFunctions: false,
            supportsVision: true,
            supportsStreaming: true,
            supportsEmbeddings: true,
            maxContextWindow: 1000000 // gemini-1.5-pro
        }
    }

    private getContextWindow(modelName: string): number {
        if (modelName.includes('1.5-pro')) return 1000000
        if (modelName.includes('1.5-flash')) return 1000000
        return 32768
    }
}

export const googleProvider = new GoogleProvider()
