/**
 * Base AI Provider Interface
 * 
 * All provider adapters must implement this interface
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import {
    AIModel,
    GenerationOptions,
    GenerationResult,
    ValidationResult,
    ProviderCapabilities,
    CostConfig,
    ProviderType
} from './types'

export interface BaseProvider {
    /**
     * Provider identifier
     */
    readonly name: ProviderType

    /**
     * Validate API key and discover models
     */
    validate(apiKey: string): Promise<ValidationResult>

    /**
     * Generate content using the provider's API
     */
    generate(prompt: string, options: GenerationOptions, apiKey: string): Promise<GenerationResult>

    /**
     * Get list of available models
     */
    getModels(apiKey: string): Promise<AIModel[]>

    /**
     * Get provider capabilities
     */
    getCapabilities(): ProviderCapabilities

    /**
     * Calculate cost for tokens used
     */
    calculateCost(inputTokens: number, outputTokens: number, model: string): number

    /**
     * Get cost configuration for a model
     */
    getCostConfig(model: string): CostConfig | null
}

/**
 * Abstract base class with common functionality
 */
export abstract class AbstractProvider implements BaseProvider {
    abstract readonly name: ProviderType
    protected abstract defaultModel: string
    protected abstract costConfigs: Map<string, CostConfig>

    async validate(apiKey: string): Promise<ValidationResult> {
        try {
            const models = await this.getModels(apiKey)

            return {
                valid: true,
                models,
                message: `Successfully validated. Discovered ${models.length} models.`,
                provider: this.name
            }
        } catch (error: any) {
            return {
                valid: false,
                error: error.message || 'Validation failed',
                provider: this.name
            }
        }
    }

    abstract generate(prompt: string, options: GenerationOptions, apiKey: string): Promise<GenerationResult>
    abstract getModels(apiKey: string): Promise<AIModel[]>
    abstract getCapabilities(): ProviderCapabilities

    calculateCost(inputTokens: number, outputTokens: number, model: string): number {
        const config = this.getCostConfig(model)

        if (!config) {
            console.warn(`No cost config for model ${model}, using default`)
            return 0
        }

        const inputCost = (inputTokens / 1000) * config.inputCostPer1kTokens
        const outputCost = (outputTokens / 1000) * config.outputCostPer1kTokens

        return inputCost + outputCost
    }

    getCostConfig(model: string): CostConfig | null {
        return this.costConfigs.get(model) || null
    }

    /**
     * Estimate tokens from text (rough approximation)
     */
    protected estimateTokens(text: string): number {
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4)
    }

    /**
     * Create standardized error
     */
    protected createError(message: string, statusCode?: number, retryable: boolean = false): Error {
        const error: any = new Error(message)
        error.provider = this.name
        error.statusCode = statusCode
        error.retryable = retryable
        return error
    }
}
