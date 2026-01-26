/**
 * AI Services - Barrel Export
 * 
 * Central export point for all AI provider services
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

// Core service
export { aiProviderService, AIProviderService } from './AIProviderService'

// Types
export type {
    ProviderType,
    AIModel,
    GenerationOptions,
    GenerationResult,
    ValidationResult,
    ProviderConfig,
    ProviderCapabilities,
    CostConfig,
    ProviderError
} from './types'

// Base provider (for extending)
export type { BaseProvider } from './BaseProvider'
export { AbstractProvider } from './BaseProvider'

// Individual providers (for direct access if needed)
export { openaiProvider } from './providers/OpenAIProvider'
export { anthropicProvider } from './providers/AnthropicProvider'
export { googleProvider } from './providers/GoogleProvider'
export { mistralProvider } from './providers/MistralProvider'
export { perplexityProvider } from './providers/PerplexityProvider'
export { xaiProvider } from './providers/XAIProvider'
