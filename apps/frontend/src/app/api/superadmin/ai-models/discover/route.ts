import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * AI Model Discovery API
 * Fetches available models from AI providers and upserts to database
 */

interface DiscoveredModel {
    provider: string;
    model_id: string;
    model_name: string;
    input_cost_per_million?: number;
    output_cost_per_million?: number;
    context_window_tokens?: number;
    max_output_tokens?: number;
    supports_vision?: boolean;
    supports_function_calling?: boolean;
}

// OpenAI Models
async function discoverOpenAIModels(apiKey: string): Promise<DiscoveredModel[]> {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Map OpenAI models with known pricing
        const models: DiscoveredModel[] = data.data
            .filter((model: any) => model.id.includes('gpt'))
            .map((model: any) => {
                const pricing = getOpenAIPricing(model.id);
                return {
                    provider: 'openai',
                    model_id: model.id,
                    model_name: model.id,
                    ...pricing,
                };
            });

        return models;
    } catch (error) {
        console.error('OpenAI discovery error:', error);
        throw error;
    }
}

// Anthropic Models
async function discoverAnthropicModels(apiKey: string): Promise<DiscoveredModel[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return [
        {
            provider: 'anthropic',
            model_id: 'claude-3-5-sonnet-20241022',
            model_name: 'Claude 3.5 Sonnet',
            input_cost_per_million: 3.00,
            output_cost_per_million: 15.00,
            context_window_tokens: 200000,
            max_output_tokens: 8192,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            provider: 'anthropic',
            model_id: 'claude-3-5-haiku-20241022',
            model_name: 'Claude 3.5 Haiku',
            input_cost_per_million: 0.80,
            output_cost_per_million: 4.00,
            context_window_tokens: 200000,
            max_output_tokens: 8192,
            supports_vision: false,
            supports_function_calling: true,
        },
        {
            provider: 'anthropic',
            model_id: 'claude-3-opus-20240229',
            model_name: 'Claude 3 Opus',
            input_cost_per_million: 15.00,
            output_cost_per_million: 75.00,
            context_window_tokens: 200000,
            max_output_tokens: 4096,
            supports_vision: true,
            supports_function_calling: true,
        },
    ];
}

// Google Models
async function discoverGoogleModels(apiKey: string): Promise<DiscoveredModel[]> {
    return [
        {
            provider: 'google',
            model_id: 'gemini-2.0-flash-exp',
            model_name: 'Gemini 2.0 Flash (Experimental)',
            input_cost_per_million: 0.00,
            output_cost_per_million: 0.00,
            context_window_tokens: 1000000,
            max_output_tokens: 8192,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            provider: 'google',
            model_id: 'gemini-1.5-pro',
            model_name: 'Gemini 1.5 Pro',
            input_cost_per_million: 1.25,
            output_cost_per_million: 5.00,
            context_window_tokens: 2000000,
            max_output_tokens: 8192,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            provider: 'google',
            model_id: 'gemini-1.5-flash',
            model_name: 'Gemini 1.5 Flash',
            input_cost_per_million: 0.075,
            output_cost_per_million: 0.30,
            context_window_tokens: 1000000,
            max_output_tokens: 8192,
            supports_vision: true,
            supports_function_calling: true,
        },
    ];
}

// Helper: OpenAI pricing
function getOpenAIPricing(modelId: string) {
    const pricing: Record<string, any> = {
        'gpt-4o': {
            input_cost_per_million: 2.50,
            output_cost_per_million: 10.00,
            context_window_tokens: 128000,
            max_output_tokens: 16384,
            supports_vision: true,
            supports_function_calling: true,
        },
        'gpt-4o-mini': {
            input_cost_per_million: 0.150,
            output_cost_per_million: 0.600,
            context_window_tokens: 128000,
            max_output_tokens: 16384,
            supports_vision: true,
            supports_function_calling: true,
        },
        'gpt-4-turbo': {
            input_cost_per_million: 10.00,
            output_cost_per_million: 30.00,
            context_window_tokens: 128000,
            max_output_tokens: 4096,
            supports_vision: true,
            supports_function_calling: true,
        },
        'gpt-3.5-turbo': {
            input_cost_per_million: 0.50,
            output_cost_per_million: 1.50,
            context_window_tokens: 16385,
            max_output_tokens: 4096,
            supports_vision: false,
            supports_function_calling: true,
        },
    };

    // Find matching pricing
    for (const [key, value] of Object.entries(pricing)) {
        if (modelId.includes(key)) {
            return value;
        }
    }

    // Default if not found
    return {
        input_cost_per_million: 0,
        output_cost_per_million: 0,
        context_window_tokens: 4096,
        max_output_tokens: 4096,
        supports_vision: false,
        supports_function_calling: false,
    };
}

// Test model availability
async function testModel(provider: string, modelId: string, apiKey: string): Promise<boolean> {
    try {
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5,
                }),
            });
            return response.ok;
        }

        if (provider === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5,
                }),
            });
            return response.ok;
        }

        // Add other providers as needed
        return true;
    } catch {
        return false;
    }
}

/**
 * POST /api/superadmin/ai-models/discover
 * Discover models for a specific provider
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const { provider_id } = await request.json();

        if (!provider_id) {
            return NextResponse.json(
                { error: 'provider_id required' },
                { status: 400 }
            );
        }

        // Get provider details
        const { data: provider, error: providerError } = await supabase
            .from('ai_providers')
            .select('*')
            .eq('id', provider_id)
            .single();

        if (providerError || !provider) {
            return NextResponse.json(
                { error: 'Provider not found' },
                { status: 404 }
            );
        }

        // Discover models based on provider
        let models: DiscoveredModel[] = [];

        switch (provider.provider) {
            case 'openai':
                models = await discoverOpenAIModels(provider.api_key);
                break;
            case 'anthropic':
                models = await discoverAnthropicModels(provider.api_key);
                break;
            case 'google':
                models = await discoverGoogleModels(provider.api_key);
                break;
            default:
                return NextResponse.json(
                    { error: 'Provider not supported for discovery' },
                    { status: 400 }
                );
        }

        // Test each model and upsert
        const results = await Promise.all(
            models.map(async (model) => {
                const isActive = await testModel(
                    provider.provider,
                    model.model_id,
                    provider.api_key
                );

                const { error: upsertError } = await supabase
                    .from('ai_models')
                    .upsert({
                        provider_id: provider.id,
                        provider: provider.provider,
                        model_id: model.model_id,
                        model_name: model.model_name,
                        input_cost_per_million: model.input_cost_per_million,
                        output_cost_per_million: model.output_cost_per_million,
                        context_window_tokens: model.context_window_tokens,
                        max_output_tokens: model.max_output_tokens,
                        supports_vision: model.supports_vision,
                        supports_function_calling: model.supports_function_calling,
                        is_active: isActive,
                        last_tested: new Date().toISOString(),
                        test_passed: isActive,
                        test_error: isActive ? null : 'Model unavailable',
                    }, {
                        onConflict: 'provider,model_id',
                    });

                return {
                    model_id: model.model_id,
                    success: !upsertError,
                    is_active: isActive,
                    error: upsertError?.message,
                };
            })
        );

        return NextResponse.json({
            success: true,
            provider: provider.provider,
            models_discovered: models.length,
            models_active: results.filter(r => r.is_active).length,
            results,
        });

    } catch (error: any) {
        console.error('Model discovery error:', error);
        return NextResponse.json(
            { error: error.message || 'Discovery failed' },
            { status: 500 }
        );
    }
}
