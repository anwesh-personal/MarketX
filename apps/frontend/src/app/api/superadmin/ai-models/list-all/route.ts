import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    ANTHROPIC_KNOWN_MODELS,
    XAI_KNOWN_MODELS,
    PERPLEXITY_KNOWN_MODELS,
    formatModelName
} from '@/lib/ai-providers';

/**
 * Fetch ALL models from a provider API (unfiltered)
 * This returns the raw list from the provider - not tested, not filtered
 * User can then pick models to add and test
 */

interface ProviderModel {
    model_id: string;
    model_name: string;
    description?: string;
}

// ===========================================
// PROVIDER-SPECIFIC FULL FETCHERS
// ===========================================

async function fetchAllOpenAIModels(apiKey: string): Promise<ProviderModel[]> {
    const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to fetch OpenAI models');
    }
    const data = await response.json();

    return data.data
        .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('chatgpt'))
        .sort((a: any, b: any) => b.created - a.created)
        .map((m: any) => ({
            model_id: m.id,
            model_name: formatModelName(m.id),
            description: `Created: ${new Date(m.created * 1000).toLocaleDateString()}`,
        }));
}

// Anthropic has no models endpoint - use known models from shared utility
async function fetchAllAnthropicModels(): Promise<ProviderModel[]> {
    return ANTHROPIC_KNOWN_MODELS.map(m => ({
        model_id: m.id,
        model_name: m.name,
        description: m.description,
    }));
}

async function fetchAllGoogleModels(apiKey: string): Promise<ProviderModel[]> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to fetch Google models');
    }
    const data = await response.json();

    return data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => ({
            model_id: m.name.replace('models/', ''),
            model_name: m.displayName || formatModelName(m.name.replace('models/', '')),
            description: m.description?.substring(0, 100) || 'Gemini model',
        }));
}

async function fetchAllMistralModels(apiKey: string): Promise<ProviderModel[]> {
    const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to fetch Mistral models');
    }
    const data = await response.json();

    return data.data.map((m: any) => ({
        model_id: m.id,
        model_name: formatModelName(m.id),
        description: `Created: ${m.created ? new Date(m.created * 1000).toLocaleDateString() : 'Unknown'}`,
    }));
}

// xAI has no public models endpoint - use known models from shared utility
async function fetchAllXAIModels(): Promise<ProviderModel[]> {
    return XAI_KNOWN_MODELS.map(m => ({
        model_id: m.id,
        model_name: m.name,
        description: m.description,
    }));
}

// Perplexity has no public models endpoint - use known models from shared utility
async function fetchAllPerplexityModels(): Promise<ProviderModel[]> {
    return PERPLEXITY_KNOWN_MODELS.map(m => ({
        model_id: m.id,
        model_name: m.name,
        description: m.description,
    }));
}

// ===========================================
// MAIN ENDPOINT
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

        let models: ProviderModel[] = [];

        switch (providerType) {
            case 'openai':
                models = await fetchAllOpenAIModels(apiKey);
                break;
            case 'anthropic':
                models = await fetchAllAnthropicModels();
                break;
            case 'google':
                models = await fetchAllGoogleModels(apiKey);
                break;
            case 'mistral':
                models = await fetchAllMistralModels(apiKey);
                break;
            case 'xai':
                models = await fetchAllXAIModels();
                break;
            case 'perplexity':
                models = await fetchAllPerplexityModels();
                break;
            default:
                return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
        }

        // Get already-added models to mark them
        const { data: existingModels } = await supabase
            .from('ai_model_metadata')
            .select('model_id, is_active, test_passed')
            .eq('provider', providerType);

        const existingMap = new Map(existingModels?.map(m => [m.model_id, m]) || []);

        // Mark each model with its status
        const modelsWithStatus = models.map(m => ({
            ...m,
            already_added: existingMap.has(m.model_id),
            is_active: existingMap.get(m.model_id)?.is_active || false,
            test_passed: existingMap.get(m.model_id)?.test_passed,
        }));

        return NextResponse.json({
            success: true,
            provider: providerType,
            provider_name: provider.name,
            total_models: models.length,
            models: modelsWithStatus,
        });

    } catch (error: any) {
        console.error('[List Models] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch models' },
            { status: 500 }
        );
    }
}
