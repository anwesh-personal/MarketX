/**
 * AI Provider Service
 * 
 * Multi-provider AI service with automatic failover, usage tracking, and cost calculation
 * Ports Lekhika's proven architecture with improvements
 * 
 * Features:
 * - Multi-key failover per provider
 * - Automatic validation before save
 * - Model discovery for all providers  
 * - Usage and failure tracking
 * - Auto-disable on repeated failures (3 strikes)
 * - Cost tracking integration
 * - Zero hardcoded API keys
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { createClient } from '@/lib/supabase/client'
import { BaseProvider } from './BaseProvider'
import { openaiProvider } from './providers/OpenAIProvider'
import { anthropicProvider } from './providers/AnthropicProvider'
import { googleProvider } from './providers/GoogleProvider'
import { mistralProvider } from './providers/MistralProvider'
import { perplexityProvider } from './providers/PerplexityProvider'
import { xaiProvider } from './providers/XAIProvider'
import {
    ProviderType,
    ProviderConfig,
    GenerationOptions,
    GenerationResult,
    ValidationResult
} from './types'

export class AIProviderService {
    private providers: Map<ProviderType, BaseProvider>
    private getSupabase() { return createClient() }

    constructor() {
        this.providers = new Map<ProviderType, BaseProvider>([
            ['openai', openaiProvider as BaseProvider],
            ['anthropic', anthropicProvider as BaseProvider],
            ['google', googleProvider as BaseProvider],
            ['mistral', mistralProvider as BaseProvider],
            ['perplexity', perplexityProvider as BaseProvider],
            ['xai', xaiProvider as BaseProvider]
        ])
    }

    /**
     * Generate content with automatic failover
     * Tries active keys in priority order until success
     */
    async generate(
        providerType: ProviderType,
        prompt: string,
        options: GenerationOptions = {}
    ): Promise<GenerationResult> {
        const configs = await this.getActiveConfigs(providerType)

        if (configs.length === 0) {
            throw new Error(`No active API keys for provider: ${providerType}`)
        }

        let lastError: Error | null = null

        // Try each config in priority order
        for (const config of configs) {
            try {
                const provider = this.providers.get(providerType)
                if (!provider) {
                    throw new Error(`Provider not found: ${providerType}`)
                }

                const result = await provider.generate(prompt, options, config.apiKey)

                // Success! Update usage stats
                await this.recordSuccess(config.id, result.tokensUsed.total, result.cost.total)

                return result
            } catch (error: any) {
                console.error(`Failed with key ${config.name}:`, error.message)
                lastError = error

                // Record failure
                await this.recordFailure(config.id, error.message)

                // Check if auto-disable threshold reached
                const updatedConfig = await this.getConfig(config.id)
                if (updatedConfig && updatedConfig.failures >= 3) {
                    await this.autoDisable(config.id)
                }

                // If error is not retryable, don't try other keys
                if (!error.retryable) {
                    throw error
                }

                // Continue to next key
                continue
            }
        }

        // All keys failed
        throw lastError || new Error('All API keys failed')
    }

    /**
     * Validate API key and discover models before saving
     */
    async validateAndDiscover(providerType: ProviderType, apiKey: string): Promise<ValidationResult> {
        const provider = this.providers.get(providerType)

        if (!provider) {
            throw new Error(`Provider not found: ${providerType}`)
        }

        return await provider.validate(apiKey)
    }

    /**
     * Get active configs for a provider, sorted by priority
     */
    private async getActiveConfigs(providerType: ProviderType): Promise<ProviderConfig[]> {
        const { data, error } = await this.getSupabase()
            .from('ai_providers')
            .select('*')
            .eq('provider', providerType)
            .eq('is_active', true)
            .is('auto_disabled_at', null)
            .order('failures', { ascending: true }) // Prioritize keys with fewer failures
            .order('usage_count', { ascending: true }) // Then by least used

        if (error) {
            console.error('Error fetching configs:', error)
            return []
        }

        return (data || []).map(this.mapDbToConfig)
    }

    /**
     * Get single config by ID
     */
    private async getConfig(id: string): Promise<ProviderConfig | null> {
        const { data, error } = await this.getSupabase()
            .from('ai_providers')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching config:', error)
            return null
        }

        return this.mapDbToConfig(data)
    }

    /**
     * Record successful generation
     */
    private async recordSuccess(configId: string, tokensUsed: number, cost: number) {
        // Use RPC for atomic increment (thread-safe)
        await this.getSupabase().rpc('increment_provider_usage', { p_id: configId })

        // Log usage for analytics
        await this.getSupabase()
            .from('ai_usage_log')
            .insert({
                provider_id: configId,
                tokens_used: tokensUsed,
                cost_usd: cost,
                timestamp: new Date().toISOString()
            })
    }

    /**
     * Record failure
     */
    private async recordFailure(configId: string, errorMessage: string) {
        // Use RPC for atomic increment (thread-safe)
        await this.getSupabase().rpc('increment_provider_failure', { p_id: configId })

        // Log failure for debugging
        console.error(`Provider ${configId} failure:`, errorMessage)
    }

    /**
     * Auto-disable provider after repeated failures
     */
    private async autoDisable(configId: string) {
        await this.getSupabase()
            .from('ai_providers')
            .update({
                is_active: false,
                auto_disabled_at: new Date().toISOString()
            })
            .eq('id', configId)

        console.warn(`Provider ${configId} auto-disabled after 3 failures`)
    }

    /**
     * Map database record to ProviderConfig
     */
    private mapDbToConfig(data: any): ProviderConfig {
        return {
            id: data.id,
            provider: data.provider as ProviderType,
            name: data.name,
            apiKey: data.api_key,
            description: data.description,
            isActive: data.is_active,
            priority: data.priority || 0,
            failures: data.failures || 0,
            usageCount: data.usage_count || 0,
            lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
            lastFailureAt: data.last_failure_at ? new Date(data.last_failure_at) : undefined,
            autoDisabledAt: data.auto_disabled_at ? new Date(data.auto_disabled_at) : undefined
        }
    }

    /**
     * Get available providers
     */
    getAvailableProviders(): ProviderType[] {
        return Array.from(this.providers.keys())
    }

    /**
     * Get provider capabilities
     */
    getProviderCapabilities(providerType: ProviderType) {
        const provider = this.providers.get(providerType)
        return provider?.getCapabilities()
    }
}

// Export singleton instance
export const aiProviderService = new AIProviderService()
