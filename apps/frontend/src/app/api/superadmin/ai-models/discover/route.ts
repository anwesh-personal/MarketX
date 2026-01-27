import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    testModel,
    getModelCostInfo,
    formatModelName,
    ANTHROPIC_KNOWN_MODELS,
    XAI_KNOWN_MODELS,
    PERPLEXITY_KNOWN_MODELS
} from '@/lib/ai-providers';

/**
 * AI Model Discovery API
 * 
 * FLOW:
 * 1. Fetch models from provider API (or use known models list for providers without API)
 * 2. TEST each model with a real API call
 * 3. Upsert to ai_model_metadata with is_active based on test result
 * 
 * Models are NEVER hardcoded for display - they come from database only
 */

// ===========================================
// PROVIDER-SPECIFIC MODEL FETCHERS
// ===========================================

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!response.ok) throw new Error('Failed to fetch OpenAI models');
        const data = await response.json();
        // Filter to chat models only
        return data.data
            .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1'))
            .map((m: any) => m.id);
    } catch (error) {
        console.error('OpenAI fetch error:', error);
        // Fallback to known models
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview'];
    }
}

async function fetchAnthropicModels(): Promise<string[]> {
    // Anthropic has no models endpoint - use shared known models
    return ANTHROPIC_KNOWN_MODELS.map(m => m.id);
}

async function fetchGoogleModels(apiKey: string): Promise<string[]> {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error('Failed to fetch Google models');
        const data = await response.json();
        return data.models
            .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''));
    } catch (error) {
        console.error('Google fetch error:', error);
        return ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    }
}

async function fetchMistralModels(apiKey: string): Promise<string[]> {
    try {
        const response = await fetch('https://api.mistral.ai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!response.ok) throw new Error('Failed to fetch Mistral models');
        const data = await response.json();
        return data.data.map((m: any) => m.id);
    } catch (error) {
        console.error('Mistral fetch error:', error);
        return ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'];
    }
}

async function fetchXAIModels(): Promise<string[]> {
    // xAI has no public models endpoint - use shared known models
    return XAI_KNOWN_MODELS.map(m => m.id);
}

async function fetchPerplexityModels(): Promise<string[]> {
    // Perplexity has no public models endpoint - use shared known models
    return PERPLEXITY_KNOWN_MODELS.map(m => m.id);
}

// ===========================================
// MAIN DISCOVER ENDPOINT
// ===========================================

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { provider_id } = await request.json();

        if (!provider_id) {
            return NextResponse.json({ error: 'provider_id required' }, { status: 400 });
        }

        // Get provider with API key
        const { data: provider, error: providerError } = await supabase
            .from('ai_providers')
            .select('*')
            .eq('id', provider_id)
            .single();

        if (providerError || !provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const apiKey = provider.api_key;
        const providerType = provider.provider;

        // Fetch model IDs from provider
        let modelIds: string[] = [];

        switch (providerType) {
            case 'openai':
                modelIds = await fetchOpenAIModels(apiKey);
                break;
            case 'anthropic':
                modelIds = await fetchAnthropicModels();
                break;
            case 'google':
                modelIds = await fetchGoogleModels(apiKey);
                break;
            case 'mistral':
                modelIds = await fetchMistralModels(apiKey);
                break;
            case 'xai':
                modelIds = await fetchXAIModels();
                break;
            case 'perplexity':
                modelIds = await fetchPerplexityModels();
                break;
            default:
                return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
        }

        console.log(`[Discover] Found ${modelIds.length} models for ${providerType}:`, modelIds);

        // Test each model and upsert to database
        const results: Array<{ model_id: string; tested: boolean; is_active: boolean; error?: string }> = [];

        for (const modelId of modelIds) {
            console.log(`[Discover] Testing ${providerType}/${modelId}...`);

            // Test the model using shared utility
            const testResult = await testModel(providerType, modelId, apiKey);

            // Get cost info using shared utility
            const costInfo = getModelCostInfo(modelId);

            // Create friendly name using shared utility
            const modelName = formatModelName(modelId);

            // Upsert to database - is_active based on test result
            const { error: upsertError } = await supabase
                .from('ai_model_metadata')
                .upsert({
                    provider: providerType,
                    model_id: modelId,
                    model_name: modelName,
                    key_name: provider.name,
                    key_model: `${provider.name}_${modelId}`,
                    input_cost_per_million: costInfo.input,
                    output_cost_per_million: costInfo.output,
                    context_window_tokens: costInfo.context,
                    supports_vision: costInfo.vision,
                    supports_function_calling: costInfo.functions,
                    supports_streaming: true,
                    is_active: testResult.success, // ACTIVE ONLY IF TEST PASSES
                    test_passed: testResult.success,
                    test_error: testResult.error || null,
                    last_tested: new Date().toISOString(),
                }, {
                    onConflict: 'provider,model_id', // Use proper unique constraint
                });

            results.push({
                model_id: modelId,
                tested: true,
                is_active: testResult.success,
                error: testResult.error,
            });

            if (upsertError) {
                console.error(`[Discover] Upsert error for ${modelId}:`, upsertError);
            }
        }

        const activeCount = results.filter(r => r.is_active).length;
        console.log(`[Discover] Completed: ${activeCount}/${modelIds.length} models active`);

        return NextResponse.json({
            success: true,
            provider: providerType,
            provider_name: provider.name,
            models_discovered: modelIds.length,
            models_active: activeCount,
            models_failed: modelIds.length - activeCount,
            results,
        });

    } catch (error: any) {
        console.error('[Discover] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Discovery failed' },
            { status: 500 }
        );
    }
}
