/**
 * AI Provider Service - Type Definitions
 * 
 * Core types for multi-provider AI service with failover
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'mistral' | 'perplexity' | 'xai'

export interface AIModel {
    id: string
    name: string
    contextWindow: number
    maxOutputTokens: number
    supportsFunctions?: boolean
    supportsVision?: boolean
    supportsStreaming?: boolean
}

export interface GenerationOptions {
    model?: string
    maxTokens?: number
    temperature?: number
    topP?: number
    systemPrompt?: string
    userId?: string
    organizationId?: string
}

export interface GenerationResult {
    content: string
    tokensUsed: {
        input: number
        output: number
        total: number
    }
    cost: {
        input: number
        output: number
        total: number
    }
    model: string
    provider: ProviderType
    finishReason?: string
    metadata?: Record<string, any>
}

export interface ValidationResult {
    valid: boolean
    models?: AIModel[]
    error?: string
    message?: string
    provider: ProviderType
}

export interface ProviderConfig {
    id: string
    provider: ProviderType
    name: string
    apiKey: string
    description?: string
    isActive: boolean
    priority: number // For failover ordering
    failures: number
    usageCount: number
    lastUsedAt?: Date
    lastFailureAt?: Date
    autoDisabledAt?: Date
}

export interface ProviderCapabilities {
    supportsChat: boolean
    supportsCompletion: boolean
    supportsFunctions: boolean
    supportsVision: boolean
    supportsStreaming: boolean
    supportsEmbeddings: boolean
    maxContextWindow: number
}

export interface CostConfig {
    inputCostPer1kTokens: number
    outputCostPer1kTokens: number
    model: string
}

export interface ProviderError extends Error {
    provider: ProviderType
    statusCode?: number
    retryable: boolean
    details?: any
}

// ============================================================
// BRAIN CHAT TYPES
// Used by BrainOrchestrator's agentic loop — multi-turn + tools
// ============================================================

export interface BrainChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    tool_call_id?: string   // required when role = 'tool'
    tool_calls?: BrainToolCall[]  // set on assistant messages that call tools
    name?: string
}

export interface BrainToolDefinition {
    type: 'function'
    function: {
        name: string
        description: string
        parameters: Record<string, unknown>  // JSON Schema object
    }
}

export interface BrainToolCall {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string  // JSON-encoded string from the LLM
    }
}

export interface BrainChatUsage {
    promptTokens: number
    completionTokens: number
    totalTokens: number
}

export interface BrainChatResponse {
    content: string
    toolCalls: BrainToolCall[]
    usage: BrainChatUsage
    model: string
    providerType: ProviderType
    finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
}

export interface BrainChatOptions {
    model?: string
    maxTokens?: number
    temperature?: number
    tools?: BrainToolDefinition[]
    /** Force JSON output — provider must support it */
    responseFormat?: { type: 'json_object' } | { type: 'text' }
    /** Org-level preferred provider override */
    preferredProvider?: string
    /** Org-level preferred model override */
    preferredModel?: string
}

export interface BrainEmbedResponse {
    embeddings: number[][]   // one vector per input text
    model: string
    providerType: ProviderType
    totalTokens: number
}
