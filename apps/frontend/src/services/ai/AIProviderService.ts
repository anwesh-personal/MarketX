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

import { createClient } from '@/lib/supabase/server'
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
    ValidationResult,
    BrainChatMessage,
    BrainChatOptions,
    BrainChatResponse,
    BrainEmbedResponse,
} from './types'
import { decryptSecret } from '@/lib/secrets'

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
            apiKey: decryptSecret(data.api_key),
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

    // ============================================================
    // BRAIN CHAT — org-aware, priority-sorted, automatic fallback
    // This is the ONLY method Brain code should call for LLM inference.
    // ============================================================

    /**
     * Multi-turn chat with tool calling support.
     * Resolves provider chain for the org automatically:
     *   1. Org's preferred_provider (from brain_agents) if set
     *   2. Org's BYOK keys (ai_providers WHERE org_id = orgId)
     *   3. Platform keys (ai_providers WHERE org_id IS NULL)
     *
     * Throws a structured error if every provider in the chain fails.
     * Never falls back to hardcoded keys.
     */
    async generateChat(
        orgId: string,
        messages: BrainChatMessage[],
        options: BrainChatOptions = {}
    ): Promise<BrainChatResponse> {
        const chain = await this.resolveProviderChain(orgId, options.preferredProvider)

        if (chain.length === 0) {
            throw new Error(
                `[AIProviderService] No AI providers configured for org ${orgId}. ` +
                `Please add an API key in Settings → AI Providers.`
            )
        }

        let lastError: Error | null = null

        for (const { config, provider } of chain) {
            try {
                const enrichedOptions: BrainChatOptions = {
                    ...options,
                    model: options.preferredModel ?? options.model ?? config.selected_model ?? undefined,
                }

                const result = await provider.chat(messages, enrichedOptions, config.api_key)

                // Record success (non-blocking)
                this.recordSuccess(config.id, result.usage.totalTokens, 0).catch(e =>
                    console.error('[AIProviderService] Usage log failed:', e)
                )

                return result
            } catch (error: any) {
                lastError = error
                console.error(`[AIProviderService] Provider ${config.provider} failed:`, error.message)

                // Record failure (non-blocking)
                this.recordFailure(config.id, error.message).catch(() => {})

                // Auto-disable after threshold (non-blocking)
                this.getConfig(config.id).then(c => {
                    if (c && c.failures >= 3) this.autoDisable(config.id).catch(() => {})
                }).catch(() => {})

                // Rate limit and server errors: try next. Auth errors: stop immediately.
                if (error.statusCode === 401 || error.statusCode === 403) {
                    throw new Error(
                        `[AIProviderService] Auth failure for provider ${config.provider}. Check your API key.`
                    )
                }

                continue
            }
        }

        throw new Error(
            `[AIProviderService] All providers failed for org ${orgId}. Last error: ${lastError?.message ?? 'unknown'}`
        )
    }

    /**
     * Generate embeddings for an array of texts.
     * Only tries providers that support embeddings (OpenAI, Google).
     */
    async embedTexts(orgId: string, texts: string[]): Promise<BrainEmbedResponse> {
        const chain = await this.resolveProviderChain(orgId)

        // Filter to embedding-capable providers only
        const embedChain = chain.filter(({ provider }) => provider.getCapabilities().supportsEmbeddings)

        if (embedChain.length === 0) {
            throw new Error(
                `[AIProviderService] No embedding-capable providers configured for org ${orgId}. ` +
                `Configure OpenAI or Google Gemini in Settings → AI Providers.`
            )
        }

        let lastError: Error | null = null

        for (const { config, provider } of embedChain) {
            try {
                const result = await provider.embed(texts, config.api_key)

                this.recordSuccess(config.id, result.totalTokens, 0).catch(() => {})

                return result
            } catch (error: any) {
                lastError = error
                console.error(`[AIProviderService] Embed provider ${config.provider} failed:`, error.message)
                this.recordFailure(config.id, error.message).catch(() => {})
                continue
            }
        }

        throw new Error(
            `[AIProviderService] All embedding providers failed for org ${orgId}. Last error: ${lastError?.message ?? 'unknown'}`
        )
    }

    /**
     * Resolve ordered provider chain for an org.
     * Order:
     *   1. If preferredProvider is set AND we have a key for it → use it first
     *   2. Org-specific BYOK keys (sorted by priority ASC, failures ASC)
     *   3. Platform-level keys (org_id IS NULL, same sort)
     */
    private async resolveProviderChain(
        orgId: string,
        preferredProvider?: string
    ): Promise<Array<{ config: DbProviderRow; provider: BaseProvider }>> {
        const supabase = createClient()

        // Fetch org-specific keys
        const { data: orgKeys } = await supabase
            .from('ai_providers')
            .select('id, provider, name, api_key, is_active, auto_disabled_at, priority, failures, usage_count, selected_model')
            .eq('org_id', orgId)
            .eq('is_active', true)
            .is('auto_disabled_at', null)
            .not('api_key', 'is', null)
            .order('priority',  { ascending: true })
            .order('failures',  { ascending: true })

        // Fetch platform-level keys
        const { data: platformKeys } = await supabase
            .from('ai_providers')
            .select('id, provider, name, api_key, is_active, auto_disabled_at, priority, failures, usage_count, selected_model')
            .is('org_id', null)
            .eq('is_active', true)
            .is('auto_disabled_at', null)
            .not('api_key', 'is', null)
            .order('priority',  { ascending: true })
            .order('failures',  { ascending: true })

        const allRows: DbProviderRow[] = [...(orgKeys ?? []), ...(platformKeys ?? [])]
            .map((row) => ({
                ...row,
                api_key: decryptSecret(row.api_key),
            }))

        // Build chain with resolved provider adapters
        const chain: Array<{ config: DbProviderRow; provider: BaseProvider }> = []

        // If a preferred provider is specified, put it first
        if (preferredProvider) {
            const preferred = allRows.find(r => r.provider === preferredProvider)
            if (preferred) {
                const adapter = this.providers.get(preferred.provider as ProviderType)
                if (adapter) chain.push({ config: preferred, provider: adapter })
            }
        }

        // Add remaining providers (skip already-added preferred)
        for (const row of allRows) {
            if (preferredProvider && row.provider === preferredProvider) continue
            const adapter = this.providers.get(row.provider as ProviderType)
            if (adapter) chain.push({ config: row, provider: adapter })
        }

        return chain
    }

    // ============================================================
    // EXISTING METHODS (unchanged — backward compat)
    // ============================================================

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

// Internal type for DB rows — not exported
interface DbProviderRow {
    id: string
    provider: string
    name: string
    api_key: string
    is_active: boolean
    auto_disabled_at: string | null
    priority: number
    failures: number
    usage_count: number
    selected_model?: string | null
}

// Export singleton instance
export const aiProviderService = new AIProviderService()
