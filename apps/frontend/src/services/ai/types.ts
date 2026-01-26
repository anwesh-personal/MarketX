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
