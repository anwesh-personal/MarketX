/**
 * Anthropic Provider Adapter
 * 
 * Handles Anthropic (Claude) API integration
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
    BrainToolCall,
} from '../types'

export class AnthropicProvider extends AbstractProvider {
    readonly name: ProviderType = 'anthropic'
    protected defaultModel = 'claude-3-5-sonnet-20241022'

    protected costConfigs = new Map<string, CostConfig>([
        ['claude-3-5-sonnet-20241022', { model: 'claude-3-5-sonnet-20241022', inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 }],
        ['claude-3-opus-20240229', { model: 'claude-3-opus-20240229', inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.075 }],
        ['claude-3-sonnet-20240229', { model: 'claude-3-sonnet-20240229', inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 }],
        ['claude-3-haiku-20240307', { model: 'claude-3-haiku-20240307', inputCostPer1kTokens: 0.00025, outputCostPer1kTokens: 0.00125 }],
    ])

    async generate(prompt: string, options: GenerationOptions, apiKey: string): Promise<GenerationResult> {
        const model = options.model || this.defaultModel
        const maxTokens = options.maxTokens || 2000
        const temperature = options.temperature ?? 0.7

        const messages: any[] = [
            { role: 'user', content: prompt }
        ]

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model,
                    max_tokens: maxTokens,
                    messages,
                    temperature,
                    top_p: options.topP ?? 1,
                    ...(options.systemPrompt && { system: options.systemPrompt })
                })
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
                throw this.createError(
                    error.error?.message || `Anthropic API error: ${response.status}`,
                    response.status,
                    response.status === 429 || response.status >= 500
                )
            }

            const data = await response.json()
            const content = data.content?.[0]?.text || ''
            const inputTokens = data.usage?.input_tokens || this.estimateTokens(prompt)
            const outputTokens = data.usage?.output_tokens || this.estimateTokens(content)
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
                finishReason: data.stop_reason,
                metadata: {
                    id: data.id,
                    type: data.type
                }
            }
        } catch (error: any) {
            if (error.provider) throw error
            throw this.createError(error.message || 'Anthropic generation failed', undefined, false)
        }
    }

    async getModels(apiKey: string): Promise<AIModel[]> {
        // Anthropic doesn't have a models endpoint, return known models
        return [
            {
                id: 'claude-3-5-sonnet-20241022',
                name: 'Claude 3.5 Sonnet',
                contextWindow: 200000,
                maxOutputTokens: 8192,
                supportsFunctions: true,
                supportsVision: true,
                supportsStreaming: true
            },
            {
                id: 'claude-3-opus-20240229',
                name: 'Claude 3 Opus',
                contextWindow: 200000,
                maxOutputTokens: 4096,
                supportsFunctions: true,
                supportsVision: true,
                supportsStreaming: true
            },
            {
                id: 'claude-3-sonnet-20240229',
                name: 'Claude 3 Sonnet',
                contextWindow: 200000,
                maxOutputTokens: 4096,
                supportsFunctions: true,
                supportsVision: true,
                supportsStreaming: true
            },
            {
                id: 'claude-3-haiku-20240307',
                name: 'Claude 3 Haiku',
                contextWindow: 200000,
                maxOutputTokens: 4096,
                supportsFunctions: false,
                supportsVision: true,
                supportsStreaming: true
            }
        ]
    }

    getCapabilities(): ProviderCapabilities {
        return {
            supportsChat: true,
            supportsCompletion: true,
            supportsFunctions: true,
            supportsVision: true,
            supportsStreaming: true,
            supportsEmbeddings: false,
            maxContextWindow: 200000
        }
    }

    // ============================================================
    // BRAIN CHAT — multi-turn + tool calling (Anthropic tool_use)
    // ============================================================
    async chat(
        messages: BrainChatMessage[],
        options: BrainChatOptions,
        apiKey: string
    ): Promise<BrainChatResponse> {
        const model = options.preferredModel || options.model || this.defaultModel

        // Anthropic separates system prompt from messages array
        const systemMsg = messages.find(m => m.role === 'system')
        const chatMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => {
                if (m.role === 'tool') {
                    return {
                        role: 'user',
                        content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }],
                    }
                }
                if (m.tool_calls && m.tool_calls.length > 0) {
                    return {
                        role: 'assistant',
                        content: m.tool_calls.map(tc => ({
                            type: 'tool_use',
                            id: tc.id,
                            name: tc.function.name,
                            input: JSON.parse(tc.function.arguments || '{}'),
                        })),
                    }
                }
                return { role: m.role, content: m.content }
            })

        const body: Record<string, unknown> = {
            model,
            max_tokens:  options.maxTokens  ?? 4096,
            temperature: options.temperature ?? 0.7,
            messages: chatMessages,
        }
        if (systemMsg) body.system = systemMsg.content
        if (options.tools && options.tools.length > 0) {
            body.tools = options.tools.map(t => ({
                name:         t.function.name,
                description:  t.function.description,
                input_schema: t.function.parameters,
            }))
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
            throw this.createError(
                err.error?.message || `Anthropic chat error: ${response.status}`,
                response.status,
                response.status === 429 || response.status >= 500
            )
        }

        const data = await response.json()

        // Extract text content and any tool_use blocks
        let textContent = ''
        const toolCalls: BrainToolCall[] = []
        for (const block of data.content ?? []) {
            if (block.type === 'text') {
                textContent += block.text
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id:   block.id,
                    type: 'function',
                    function: {
                        name:      block.name,
                        arguments: JSON.stringify(block.input ?? {}),
                    },
                })
            }
        }

        const finishReason = data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop'

        return {
            content:     textContent,
            toolCalls,
            usage: {
                promptTokens:     data.usage?.input_tokens    ?? 0,
                completionTokens: data.usage?.output_tokens   ?? 0,
                totalTokens:     (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
            },
            model,
            providerType:  this.name,
            finishReason: finishReason as BrainChatResponse['finishReason'],
        }
    }

    // Anthropic does not provide an embeddings API
    async embed(_texts: string[], _apiKey: string): Promise<BrainEmbedResponse> {
        throw this.createError('Anthropic does not support embeddings. Configure OpenAI or Google for embeddings.', 400, false)
    }
}

export const anthropicProvider = new AnthropicProvider()
