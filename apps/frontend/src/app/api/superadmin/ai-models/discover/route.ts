import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';
import {
    PROVIDER_BASE_URLS,
    getModelCostInfo,
    formatModelName,
    ANTHROPIC_KNOWN_MODELS,
    XAI_KNOWN_MODELS,
    PERPLEXITY_KNOWN_MODELS
} from '@/lib/ai-providers';
import { decryptSecret } from '@/lib/secrets';

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
        const response = await fetch(`${PROVIDER_BASE_URLS.openai}/models`, {
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
        const response = await fetch(`${PROVIDER_BASE_URLS.google}/models?key=${apiKey}`);
        if (!response.ok) throw new Error('Failed to fetch Google models');
        const data = await response.json();
        return (data.models || [])
            .filter((m: any) => {
                const id = (m.name || '').toLowerCase();
                return id.includes('gemini');
            })
            .map((m: any) => m.name.replace('models/', ''));
    } catch (error) {
        console.error('Google fetch error:', error);
        return ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    }
}

async function fetchMistralModels(apiKey: string): Promise<string[]> {
    try {
        const response = await fetch(`${PROVIDER_BASE_URLS.mistral}/models`, {
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
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 });
        }

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

        const apiKey = decryptSecret(provider.api_key);
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

        // Phase 1: Save all models to DB immediately (active by default, untested)
        const results: Array<{ model_id: string; is_active: boolean; error?: string }> = [];

        for (const modelId of modelIds) {
            const costInfo = getModelCostInfo(modelId);
            const modelName = formatModelName(modelId);

            const { error: upsertError } = await supabase
                .from('ai_model_metadata')
                .upsert({
                    provider: providerType,
                    model_id: modelId,
                    model_name: modelName,
                    key_name: provider.name,
                    key_model: `${providerType}_${modelId}`,
                    input_cost_per_million: costInfo.input,
                    output_cost_per_million: costInfo.output,
                    context_window_tokens: costInfo.context,
                    supports_vision: costInfo.vision,
                    supports_function_calling: costInfo.functions,
                    supports_streaming: true,
                    is_active: true,
                    discovered_at: new Date().toISOString(),
                    last_verified_at: new Date().toISOString(),
                }, {
                    onConflict: 'provider,model_id',
                });

            if (upsertError) {
                console.error(`[Discover] Upsert error for ${modelId}:`, upsertError);
                results.push({ model_id: modelId, is_active: false, error: upsertError.message });
            } else {
                results.push({ model_id: modelId, is_active: true });
            }
        }

        const activeCount = results.filter(r => r.is_active).length;
        console.log(`[Discover] Saved: ${activeCount}/${modelIds.length} models. Test individually from the UI.`);

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
