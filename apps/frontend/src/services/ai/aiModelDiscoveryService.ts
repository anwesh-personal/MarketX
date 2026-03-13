/**
 * AI Model Discovery Service
 * 
 * Discovers models from provider APIs and syncs to ai_model_metadata table
 * Ported from Lekhika's robust model discovery system
 * 
 * @author Axiom Engine
 * @date 2026-01-27
 */

import { createClient } from '@supabase/supabase-js'
import { PROVIDER_BASE_URLS } from '@/lib/ai-providers'

// Provider-specific model discovery methods
const PROVIDER_DISCOVERY_METHODS: Record<string, (apiKey: string) => Promise<DiscoveredModel[]>> = {
    openai: async (apiKey: string) => {
        console.log('🔍 OpenAI Model Discovery Started')
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000)

            const response = await fetch(`${PROVIDER_BASE_URLS.openai}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
            }

            const data = await response.json()

            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid response format from OpenAI API')
            }

            // Filter for GPT models only
            const gptModels = data.data.filter((model: any) =>
                model.id.startsWith('gpt-') || model.id.startsWith('o1')
            )

            return gptModels.map((model: any) => ({
                provider: 'openai',
                model_id: model.id,
                model_name: model.id,
                input_cost_per_million: getOpenAICost(model.id).input,
                output_cost_per_million: getOpenAICost(model.id).output,
                context_window_tokens: getOpenAIContextWindow(model.id),
                capabilities: getOpenAICapabilities(model.id),
                description: `OpenAI ${model.id}`,
                is_active: false,
                metadata: model
            }))
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.error('❌ OpenAI Model Discovery Timeout (15s)')
                throw new Error('OpenAI API request timed out after 15 seconds')
            }
            console.error('❌ OpenAI Model Discovery Failed:', error)
            throw error
        }
    },

    anthropic: async (apiKey: string) => {
        console.log('🔍 Anthropic Model Discovery Started')
        try {
            const response = await fetch(`${PROVIDER_BASE_URLS.anthropic}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                }
            })

            if (!response.ok) {
                // Anthropic may not have a models endpoint, return known models
                console.log('⚠️ Anthropic models endpoint not available, using known models')
                return getKnownAnthropicModels()
            }

            const data = await response.json()

            if (!data.data || !Array.isArray(data.data)) {
                return getKnownAnthropicModels()
            }

            return data.data.map((model: any) => ({
                provider: 'anthropic',
                model_id: model.id || model.name,
                model_name: model.id || model.name,
                input_cost_per_million: getAnthropicCost(model.id).input,
                output_cost_per_million: getAnthropicCost(model.id).output,
                context_window_tokens: model.context_window || 200000,
                capabilities: ['chat', 'vision', 'function_calling'],
                description: model.description || 'Claude AI model by Anthropic',
                is_active: false,
                metadata: model
            }))
        } catch (error) {
            console.error('❌ Anthropic Model Discovery Failed:', error)
            return getKnownAnthropicModels()
        }
    },

    google: async (apiKey: string) => {
        console.log('🔍 Google Gemini Model Discovery Started')
        try {
            const response = await fetch(`${PROVIDER_BASE_URLS.google}/models?key=${apiKey}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
            }

            const data = await response.json()

            if (!data.models || !Array.isArray(data.models)) {
                throw new Error('Invalid response format from Gemini API')
            }

            return data.models
                .filter((model: any) => model.name.includes('gemini'))
                .map((model: any) => {
                    const modelId = model.name.replace('models/', '')
                    return {
                        provider: 'google',
                        model_id: modelId,
                        model_name: model.displayName || modelId,
                        input_cost_per_million: getGeminiCost(modelId).input,
                        output_cost_per_million: getGeminiCost(modelId).output,
                        context_window_tokens: model.inputTokenLimit || 0,
                        max_output_tokens: model.outputTokenLimit || 8192,
                        capabilities: model.supportedGenerationMethods || [],
                        description: model.description || 'Google Gemini AI model',
                        is_active: false,
                        metadata: model
                    }
                })
        } catch (error) {
            console.error('❌ Google Gemini Model Discovery Failed:', error)
            return []
        }
    },

    mistral: async (apiKey: string) => {
        console.log('🔍 Mistral Model Discovery Started')
        try {
            const response = await fetch(`${PROVIDER_BASE_URLS.mistral}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
            }

            const data = await response.json()

            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid response format from Mistral API')
            }

            return data.data.map((model: any) => ({
                provider: 'mistral',
                model_id: model.id,
                model_name: model.id,
                input_cost_per_million: getMistralCost(model.id).input,
                output_cost_per_million: getMistralCost(model.id).output,
                context_window_tokens: 32768,
                capabilities: ['chat'],
                description: 'Mistral AI model',
                is_active: false,
                metadata: model
            }))
        } catch (error) {
            console.error('❌ Mistral Model Discovery Failed:', error)
            return []
        }
    },

    perplexity: async (apiKey: string) => {
        console.log('🔍 Perplexity Model Discovery Started')
        try {
            const response = await fetch(`${PROVIDER_BASE_URLS.perplexity}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            })

            if (!response.ok) {
                // Return known Perplexity models
                return getKnownPerplexityModels()
            }

            const data = await response.json()

            if (!data.data || !Array.isArray(data.data)) {
                return getKnownPerplexityModels()
            }

            return data.data.map((model: any) => ({
                provider: 'perplexity',
                model_id: model.id || model.name,
                model_name: model.id || model.name,
                input_cost_per_million: 1.00,
                output_cost_per_million: 1.00,
                context_window_tokens: model.context_window || 128000,
                capabilities: ['chat', 'search'],
                description: 'Perplexity AI model with search',
                is_active: false,
                metadata: model
            }))
        } catch (error) {
            console.error('❌ Perplexity Model Discovery Failed:', error)
            return getKnownPerplexityModels()
        }
    },

    xai: async (apiKey: string) => {
        console.log('🔍 xAI (Grok) Model Discovery Started')
        try {
            const response = await fetch(`${PROVIDER_BASE_URLS.xai}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            })

            if (!response.ok) {
                return getKnownGrokModels()
            }

            const data = await response.json()

            if (!data.data || !Array.isArray(data.data)) {
                return getKnownGrokModels()
            }

            return data.data.map((model: any) => ({
                provider: 'xai',
                model_id: model.id || model.name,
                model_name: model.id || model.name,
                input_cost_per_million: 5.00,
                output_cost_per_million: 15.00,
                context_window_tokens: 131072,
                capabilities: ['chat'],
                description: 'Grok AI model by xAI',
                is_active: false,
                metadata: model
            }))
        } catch (error) {
            console.error('❌ xAI Model Discovery Failed:', error)
            return getKnownGrokModels()
        }
    }
}

// Types
interface DiscoveredModel {
    provider: string
    model_id: string
    model_name: string
    input_cost_per_million: number
    output_cost_per_million: number
    context_window_tokens: number
    max_output_tokens?: number
    capabilities: string[]
    description: string
    is_active: boolean
    metadata: any
}

// Cost lookup tables (as of 2026-01)
function getOpenAICost(modelId: string): { input: number; output: number } {
    const costs: Record<string, { input: number; output: number }> = {
        'gpt-4-turbo': { input: 10.00, output: 30.00 },
        'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
        'gpt-4': { input: 30.00, output: 60.00 },
        'gpt-4-32k': { input: 60.00, output: 120.00 },
        'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
        'gpt-3.5-turbo-16k': { input: 3.00, output: 4.00 },
        'o1-preview': { input: 15.00, output: 60.00 },
        'o1-mini': { input: 3.00, output: 12.00 }
    }

    for (const [key, cost] of Object.entries(costs)) {
        if (modelId.includes(key)) return cost
    }
    return { input: 10.00, output: 30.00 } // Default
}

function getOpenAIContextWindow(modelId: string): number {
    if (modelId.includes('gpt-4-turbo')) return 128000
    if (modelId.includes('gpt-4-32k')) return 32768
    if (modelId.includes('gpt-4')) return 8192
    if (modelId.includes('16k')) return 16384
    if (modelId.includes('o1')) return 128000
    return 4096
}

function getOpenAICapabilities(modelId: string): string[] {
    const caps = ['chat']
    if (modelId.includes('gpt-4') || modelId.includes('gpt-3.5')) {
        caps.push('function_calling')
    }
    if (modelId.includes('vision') || modelId.includes('gpt-4-turbo') || modelId.includes('o1')) {
        caps.push('vision')
    }
    return caps
}

function getAnthropicCost(modelId: string): { input: number; output: number } {
    const costs: Record<string, { input: number; output: number }> = {
        'claude-3-opus': { input: 15.00, output: 75.00 },
        'claude-3-sonnet': { input: 3.00, output: 15.00 },
        'claude-3-haiku': { input: 0.25, output: 1.25 },
        'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
        'claude-2': { input: 8.00, output: 24.00 }
    }

    for (const [key, cost] of Object.entries(costs)) {
        if (modelId.includes(key)) return cost
    }
    return { input: 3.00, output: 15.00 }
}

function getGeminiCost(modelId: string): { input: number; output: number } {
    if (modelId.includes('1.5-pro')) return { input: 3.50, output: 10.50 }
    if (modelId.includes('1.5-flash')) return { input: 0.35, output: 1.05 }
    if (modelId.includes('1.0-pro')) return { input: 0.50, output: 1.50 }
    return { input: 1.00, output: 3.00 }
}

function getMistralCost(modelId: string): { input: number; output: number } {
    if (modelId.includes('large')) return { input: 4.00, output: 12.00 }
    if (modelId.includes('medium')) return { input: 2.70, output: 8.10 }
    if (modelId.includes('small')) return { input: 1.00, output: 3.00 }
    return { input: 2.00, output: 6.00 }
}

// Known models fallbacks (when API doesn't have models endpoint)
function getKnownAnthropicModels(): DiscoveredModel[] {
    return [
        {
            provider: 'anthropic',
            model_id: 'claude-3-opus-20240229',
            model_name: 'Claude 3 Opus',
            input_cost_per_million: 15.00,
            output_cost_per_million: 75.00,
            context_window_tokens: 200000,
            capabilities: ['chat', 'vision', 'function_calling'],
            description: 'Most powerful Claude model for complex tasks',
            is_active: false,
            metadata: {}
        },
        {
            provider: 'anthropic',
            model_id: 'claude-3-5-sonnet-20241022',
            model_name: 'Claude 3.5 Sonnet',
            input_cost_per_million: 3.00,
            output_cost_per_million: 15.00,
            context_window_tokens: 200000,
            capabilities: ['chat', 'vision', 'function_calling'],
            description: 'Best balance of intelligence and speed',
            is_active: false,
            metadata: {}
        },
        {
            provider: 'anthropic',
            model_id: 'claude-3-haiku-20240307',
            model_name: 'Claude 3 Haiku',
            input_cost_per_million: 0.25,
            output_cost_per_million: 1.25,
            context_window_tokens: 200000,
            capabilities: ['chat', 'vision'],
            description: 'Fastest and most compact Claude model',
            is_active: false,
            metadata: {}
        }
    ]
}

function getKnownPerplexityModels(): DiscoveredModel[] {
    return [
        {
            provider: 'perplexity',
            model_id: 'llama-3.1-sonar-large-128k-online',
            model_name: 'Sonar Large Online',
            input_cost_per_million: 1.00,
            output_cost_per_million: 1.00,
            context_window_tokens: 128000,
            capabilities: ['chat', 'search'],
            description: 'Large model with real-time search',
            is_active: false,
            metadata: {}
        },
        {
            provider: 'perplexity',
            model_id: 'llama-3.1-sonar-small-128k-online',
            model_name: 'Sonar Small Online',
            input_cost_per_million: 0.20,
            output_cost_per_million: 0.20,
            context_window_tokens: 128000,
            capabilities: ['chat', 'search'],
            description: 'Fast model with real-time search',
            is_active: false,
            metadata: {}
        }
    ]
}

function getKnownGrokModels(): DiscoveredModel[] {
    return [
        {
            provider: 'xai',
            model_id: 'grok-beta',
            model_name: 'Grok Beta',
            input_cost_per_million: 5.00,
            output_cost_per_million: 15.00,
            context_window_tokens: 131072,
            capabilities: ['chat'],
            description: 'Grok AI by xAI',
            is_active: false,
            metadata: {}
        }
    ]
}

// Main service class
class AIModelDiscoveryService {
    private supabase: any

    constructor() {
        // Will be initialized with Supabase client
    }

    initialize(supabaseClient: any) {
        this.supabase = supabaseClient
    }

    /**
     * Discover models for a provider and sync to database
     */
    async discoverModelsForProvider(provider: string, apiKey: string): Promise<DiscoveredModel[]> {
        console.log(`🚀 Discovering models for provider: ${provider}`)

        // Map provider aliases
        const providerMap: Record<string, string> = {
            'claude': 'anthropic',
            'gemini': 'google'
        }
        const normalizedProvider = providerMap[provider.toLowerCase()] || provider.toLowerCase()

        const discoveryMethod = PROVIDER_DISCOVERY_METHODS[normalizedProvider]
        if (!discoveryMethod) {
            console.warn(`⚠️ No discovery method for provider: ${provider}`)
            return []
        }

        try {
            const models = await discoveryMethod(apiKey)
            console.log(`📥 Discovered ${models.length} models for ${provider}`)

            if (models.length > 0 && this.supabase) {
                await this.upsertModels(models)
            }

            return models
        } catch (error) {
            console.error(`❌ Failed to discover models for ${provider}:`, error)
            return []
        }
    }

    /**
     * Upsert discovered models to database
     */
    private async upsertModels(models: DiscoveredModel[]): Promise<void> {
        if (!this.supabase) {
            console.warn('⚠️ Supabase not initialized, skipping database sync')
            return
        }

        try {
            const modelsToUpsert = models.map(model => ({
                provider: model.provider,
                model_id: model.model_id,
                model_name: model.model_name,
                input_cost_per_million: model.input_cost_per_million,
                output_cost_per_million: model.output_cost_per_million,
                context_window_tokens: model.context_window_tokens,
                max_output_tokens: model.max_output_tokens || 4096,
                capabilities: model.capabilities,
                description: model.description,
                is_active: model.is_active,
                metadata: model.metadata,
                last_verified_at: new Date().toISOString()
            }))

            const { error } = await this.supabase
                .from('ai_model_metadata')
                .upsert(modelsToUpsert, {
                    onConflict: 'provider,model_id',
                    ignoreDuplicates: false
                })

            if (error) {
                console.error('❌ Model sync error:', error)
            } else {
                console.log(`✅ Successfully synced ${models.length} models to database`)
            }
        } catch (error) {
            console.error('❌ Database upsert failed:', error)
        }
    }

    /**
     * Get active models for a provider from database
     */
    async getModelsForProvider(provider: string): Promise<DiscoveredModel[]> {
        if (!this.supabase) {
            console.warn('⚠️ Supabase not initialized')
            return []
        }

        try {
            const { data, error } = await this.supabase
                .from('ai_model_metadata')
                .select('*')
                .eq('provider', provider.toLowerCase())
                .eq('is_active', true)
                .order('model_name')

            if (error) throw error
            return data || []
        } catch (error) {
            console.error(`❌ Failed to fetch models for ${provider}:`, error)
            return []
        }
    }

    /**
     * Get all active models from database
     */
    async getAllActiveModels(): Promise<DiscoveredModel[]> {
        if (!this.supabase) {
            console.warn('⚠️ Supabase not initialized')
            return []
        }

        try {
            const { data, error } = await this.supabase
                .from('ai_model_metadata')
                .select('*')
                .eq('is_active', true)
                .eq('is_deprecated', false)
                .order('provider')
                .order('model_name')

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('❌ Failed to fetch active models:', error)
            return []
        }
    }

    /**
     * Toggle model active status
     */
    async toggleModelActive(modelId: string, isActive: boolean): Promise<boolean> {
        if (!this.supabase) return false

        try {
            const { error } = await this.supabase
                .from('ai_model_metadata')
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .eq('id', modelId)

            if (error) throw error
            return true
        } catch (error) {
            console.error('❌ Failed to toggle model status:', error)
            return false
        }
    }
}

// Export singleton
export const aiModelDiscoveryService = new AIModelDiscoveryService()
export default aiModelDiscoveryService
