/**
 * AXIOM AI SERVICE (Workers Version)
 * Ported from: apps/backend/src/services/ai/aiService.ts
 * 
 * Universal AI provider interface for:
 * - OpenAI (GPT-4, GPT-4o, GPT-3.5)
 * - Anthropic (Claude 3, Claude 3.5)
 * - Google (Gemini Pro, Gemini 1.5)
 * - Perplexity (Online search-enabled LLM)
 * 
 * Changes from backend version:
 * - Uses Supabase client instead of pg Pool
 * - Runs in worker context (no Express)
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'perplexity';

export interface AIModel {
    provider: AIProvider;
    modelId: string;
    displayName: string;
    maxTokens: number;
    inputCostPer1K: number;
    outputCostPer1K: number;
}

export interface EngineApiKeyContext {
    engineId: string;
    orgId?: string;
    apiKeyOverride?: string;
    providerMappings?: Array<{
        provider: AIProvider;
        apiKey: string;
        isPrimary: boolean;
    }>;
}

export interface AICallOptions {
    provider?: AIProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    stopSequences?: string[];
    userId?: string;
    tier?: 'hobby' | 'pro' | 'enterprise';
    engineContext?: EngineApiKeyContext;
}

export interface AICallResult {
    content: string;
    provider: AIProvider;
    model: string;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    cost: number;
    durationMs: number;
    metadata?: Record<string, any>;
}

// ============================================================================
// MODEL REGISTRY
// ============================================================================

export const AI_MODELS: Record<string, AIModel> = {
    // OpenAI
    'gpt-4o': {
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        maxTokens: 128000,
        inputCostPer1K: 0.005,
        outputCostPer1K: 0.015
    },
    'gpt-4o-mini': {
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        maxTokens: 128000,
        inputCostPer1K: 0.00015,
        outputCostPer1K: 0.0006
    },
    'gpt-4-turbo': {
        provider: 'openai',
        modelId: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        maxTokens: 128000,
        inputCostPer1K: 0.01,
        outputCostPer1K: 0.03
    },

    // Anthropic
    'claude-3-5-sonnet-20241022': {
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        maxTokens: 200000,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015
    },
    'claude-3-opus-20240229': {
        provider: 'anthropic',
        modelId: 'claude-3-opus-20240229',
        displayName: 'Claude 3 Opus',
        maxTokens: 200000,
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075
    },
    'claude-3-haiku-20240307': {
        provider: 'anthropic',
        modelId: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        maxTokens: 200000,
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125
    },

    // Google
    'gemini-1.5-pro': {
        provider: 'google',
        modelId: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        maxTokens: 2000000,
        inputCostPer1K: 0.00125,
        outputCostPer1K: 0.005
    },
    'gemini-1.5-flash': {
        provider: 'google',
        modelId: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        maxTokens: 1000000,
        inputCostPer1K: 0.000075,
        outputCostPer1K: 0.0003
    },

    // Perplexity
    'llama-3.1-sonar-large-128k-online': {
        provider: 'perplexity',
        modelId: 'llama-3.1-sonar-large-128k-online',
        displayName: 'Perplexity Sonar Large',
        maxTokens: 128000,
        inputCostPer1K: 0.001,
        outputCostPer1K: 0.001
    }
};

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const { url: supabaseUrl, serviceKey: supabaseServiceKey } = getSupabaseConfig();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

class AIService {
    private apiKeys: Map<AIProvider, string> = new Map();
    private initialized = false;

    /**
     * Initialize and load API keys
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        await this.loadApiKeys();
        this.initialized = true;
    }

    /**
     * Load API keys from database
     */
    private async loadApiKeys(): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('ai_providers')
                .select('provider_type, api_key')
                .eq('status', 'active')
                .order('priority', { ascending: true });

            if (error) throw error;

            for (const row of data || []) {
                this.apiKeys.set(row.provider_type as AIProvider, row.api_key);
            }

            console.log(`✅ AI Service: Loaded ${this.apiKeys.size} API keys from database`);
        } catch (error) {
            console.warn('⚠️ AI Service: Failed to load from DB, using env vars:', error);
            this.loadApiKeysFromEnv();
        }
    }

    /**
     * Load API keys from environment variables
     */
    private loadApiKeysFromEnv(): void {
        if (process.env.OPENAI_API_KEY) {
            this.apiKeys.set('openai', process.env.OPENAI_API_KEY);
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.apiKeys.set('anthropic', process.env.ANTHROPIC_API_KEY);
        }
        if (process.env.GOOGLE_AI_API_KEY) {
            this.apiKeys.set('google', process.env.GOOGLE_AI_API_KEY);
        }
        if (process.env.PERPLEXITY_API_KEY) {
            this.apiKeys.set('perplexity', process.env.PERPLEXITY_API_KEY);
        }
    }

    /**
     * Get API key for a provider
     */
    getApiKey(provider: AIProvider): string | undefined {
        return this.apiKeys.get(provider);
    }

    /**
     * Check if a provider is available
     */
    isProviderAvailable(provider: AIProvider): boolean {
        return this.apiKeys.has(provider);
    }

    /**
     * Get model info
     */
    getModel(modelId: string): AIModel | undefined {
        return AI_MODELS[modelId];
    }

    /**
     * Get default model for a provider
     */
    getDefaultModel(provider: AIProvider): AIModel {
        const defaults: Record<AIProvider, string> = {
            openai: 'gpt-4o-mini',
            anthropic: 'claude-3-5-sonnet-20241022',
            google: 'gemini-1.5-flash',
            perplexity: 'llama-3.1-sonar-large-128k-online'
        };

        return AI_MODELS[defaults[provider]];
    }

    /**
     * MAIN CALL METHOD - Universal AI caller
     */
    async call(prompt: string, options: AICallOptions = {}): Promise<AICallResult> {
        // Ensure initialized
        if (!this.initialized) {
            await this.initialize();
        }

        const startTime = Date.now();

        // Determine provider and model
        const provider = options.provider || 'openai';
        const modelId = options.model || this.getDefaultModel(provider).modelId;
        const model = AI_MODELS[modelId];

        if (!model) {
            throw new Error(`Unknown model: ${modelId}`);
        }

        // Resolve API key - check engine context first for isolation
        let apiKey: string | undefined;
        if (options.engineContext) {
            if (options.engineContext.apiKeyOverride) {
                apiKey = options.engineContext.apiKeyOverride;
            } else if (options.engineContext.providerMappings) {
                const mapping = options.engineContext.providerMappings.find(
                    m => m.provider === provider && m.isPrimary
                );
                apiKey = mapping?.apiKey;
            }
            if (apiKey) {
                console.log(`🔐 Using engine-mapped API key for ${provider} (engine: ${options.engineContext.engineId})`);
            }
        }

        // Fall back to default service keys if no engine context key
        if (!apiKey) {
            apiKey = this.getApiKey(provider);
        }

        if (!apiKey) {
            throw new Error(`No API key configured for provider: ${provider}`);
        }

        console.log(`🤖 AI Call: ${provider}/${modelId}`);

        let result: AICallResult;

        switch (provider) {
            case 'openai':
                result = await this.callOpenAI(prompt, modelId, apiKey, options);
                break;
            case 'anthropic':
                result = await this.callAnthropic(prompt, modelId, apiKey, options);
                break;
            case 'google':
                result = await this.callGoogle(prompt, modelId, apiKey, options);
                break;
            case 'perplexity':
                result = await this.callPerplexity(prompt, modelId, apiKey, options);
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        result.durationMs = Date.now() - startTime;
        result.cost = this.calculateCost(model, result.tokens.input, result.tokens.output);

        console.log(`✅ AI Response: ${result.tokens.total} tokens, $${result.cost.toFixed(6)}, ${result.durationMs}ms`);

        return result;
    }

    /**
     * OpenAI API Call
     */
    private async callOpenAI(
        prompt: string,
        modelId: string,
        apiKey: string,
        options: AICallOptions
    ): Promise<AICallResult> {
        const messages: any[] = [];

        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096,
                stop: options.stopSequences
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as any;
        const usage = data.usage || {};

        return {
            content: data.choices[0]?.message?.content || '',
            provider: 'openai',
            model: modelId,
            tokens: {
                input: usage.prompt_tokens || 0,
                output: usage.completion_tokens || 0,
                total: usage.total_tokens || 0
            },
            cost: 0,
            durationMs: 0,
            metadata: {
                finishReason: data.choices[0]?.finish_reason,
                id: data.id
            }
        };
    }

    /**
     * Anthropic Claude API Call
     */
    private async callAnthropic(
        prompt: string,
        modelId: string,
        apiKey: string,
        options: AICallOptions
    ): Promise<AICallResult> {
        const body: any = {
            model: modelId,
            max_tokens: options.maxTokens ?? 4096,
            messages: [{ role: 'user', content: prompt }]
        };

        if (options.systemPrompt) {
            body.system = options.systemPrompt;
        }

        if (options.temperature !== undefined) {
            body.temperature = options.temperature;
        }

        if (options.stopSequences) {
            body.stop_sequences = options.stopSequences;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as any;
        const usage = data.usage || {};

        return {
            content: data.content[0]?.text || '',
            provider: 'anthropic',
            model: modelId,
            tokens: {
                input: usage.input_tokens || 0,
                output: usage.output_tokens || 0,
                total: (usage.input_tokens || 0) + (usage.output_tokens || 0)
            },
            cost: 0,
            durationMs: 0,
            metadata: {
                stopReason: data.stop_reason,
                id: data.id
            }
        };
    }

    /**
     * Google Gemini API Call
     */
    private async callGoogle(
        prompt: string,
        modelId: string,
        apiKey: string,
        options: AICallOptions
    ): Promise<AICallResult> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

        const body: any = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxTokens ?? 4096
            }
        };

        if (options.systemPrompt) {
            body.systemInstruction = { parts: [{ text: options.systemPrompt }] };
        }

        if (options.stopSequences) {
            body.generationConfig.stopSequences = options.stopSequences;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google AI API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as any;
        const usage = data.usageMetadata || {};

        return {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            provider: 'google',
            model: modelId,
            tokens: {
                input: usage.promptTokenCount || 0,
                output: usage.candidatesTokenCount || 0,
                total: usage.totalTokenCount || 0
            },
            cost: 0,
            durationMs: 0,
            metadata: {
                finishReason: data.candidates?.[0]?.finishReason
            }
        };
    }

    /**
     * Perplexity API Call (OpenAI-compatible)
     */
    private async callPerplexity(
        prompt: string,
        modelId: string,
        apiKey: string,
        options: AICallOptions
    ): Promise<AICallResult> {
        const messages: any[] = [];

        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as any;
        const usage = data.usage || {};

        return {
            content: data.choices[0]?.message?.content || '',
            provider: 'perplexity',
            model: modelId,
            tokens: {
                input: usage.prompt_tokens || 0,
                output: usage.completion_tokens || 0,
                total: usage.total_tokens || 0
            },
            cost: 0,
            durationMs: 0,
            metadata: {
                citations: data.citations,
                id: data.id
            }
        };
    }

    /**
     * Calculate cost based on token usage
     */
    calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
        const inputCost = (inputTokens / 1000) * model.inputCostPer1K;
        const outputCost = (outputTokens / 1000) * model.outputCostPer1K;
        return inputCost + outputCost;
    }

    /**
     * Simple token estimation (for pre-call estimates)
     */
    estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Get available providers
     */
    getAvailableProviders(): AIProvider[] {
        return Array.from(this.apiKeys.keys());
    }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
