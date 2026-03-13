import { NextRequest, NextResponse } from 'next/server';
import { getSuperadmin } from '@/lib/superadmin-middleware';
import { PROVIDER_BASE_URLS } from '@/lib/ai-providers';

interface ModelInfo {
    id: string;
    name: string;
    context_window?: number;
    max_output_tokens?: number;
    input_cost?: number;
    output_cost?: number;
    supports_vision?: boolean;
    supports_function_calling?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 });
        }

        const body = await request.json();
        const { provider, api_key } = body;

        if (!provider || !api_key) {
            return NextResponse.json(
                { error: 'Provider and API key required' },
                { status: 400 }
            );
        }

        let models: ModelInfo[] = [];

        switch (provider) {
            case 'openai':
                models = await discoverOpenAIModels(api_key);
                break;
            case 'anthropic':
                models = await discoverAnthropicModels(api_key);
                break;
            case 'google':
                models = await discoverGoogleModels(api_key);
                break;
            case 'mistral':
                models = await discoverMistralModels(api_key);
                break;
            case 'perplexity':
                models = await discoverPerplexityModels(api_key);
                break;
            case 'xai':
                models = await discoverXAIModels(api_key);
                break;
            default:
                return NextResponse.json(
                    { error: `Provider ${provider} not supported` },
                    { status: 400 }
                );
        }

        return NextResponse.json({ models, count: models.length });
    } catch (error: any) {
        console.error('Error discovering models:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to discover models' },
            { status: 500 }
        );
    }
}

// OpenAI Model Discovery
async function discoverOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
    const response = await fetch(`${PROVIDER_BASE_URLS.openai}/models`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Filter for chat models and add metadata
    const chatModels = data.data.filter((model: any) =>
        model.id.includes('gpt') && !model.id.includes('instruct')
    );

    return chatModels.map((model: any) => {
        const modelInfo: ModelInfo = {
            id: model.id,
            name: model.id,
        };

        // Add known pricing and capabilities
        if (model.id.includes('gpt-4')) {
            modelInfo.context_window = model.id.includes('turbo') ? 128000 : 8192;
            modelInfo.input_cost = model.id.includes('turbo') ? 0.01 : 0.03;
            modelInfo.output_cost = model.id.includes('turbo') ? 0.03 : 0.06;
            modelInfo.supports_vision = model.id.includes('vision');
            modelInfo.supports_function_calling = true;
        } else if (model.id.includes('gpt-3.5')) {
            modelInfo.context_window = 16385;
            modelInfo.input_cost = 0.0005;
            modelInfo.output_cost = 0.0015;
            modelInfo.supports_function_calling = true;
        }

        return modelInfo;
    });
}

// Anthropic Model Discovery
async function discoverAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return [
        {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            context_window: 200000,
            max_output_tokens: 8192,
            input_cost: 0.003,
            output_cost: 0.015,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            context_window: 200000,
            max_output_tokens: 4096,
            input_cost: 0.015,
            output_cost: 0.075,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            context_window: 200000,
            max_output_tokens: 4096,
            input_cost: 0.003,
            output_cost: 0.015,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            id: 'claude-3-haiku-20240307',
            name: 'Claude 3 Haiku',
            context_window: 200000,
            max_output_tokens: 4096,
            input_cost: 0.00025,
            output_cost: 0.00125,
            supports_vision: true,
            supports_function_calling: true,
        },
    ];
}

// Google (Gemini) Model Discovery
async function discoverGoogleModels(apiKey: string): Promise<ModelInfo[]> {
    // Return known Gemini models
    return [
        {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash (Experimental)',
            context_window: 1000000,
            max_output_tokens: 8192,
            input_cost: 0,
            output_cost: 0,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            context_window: 2000000,
            max_output_tokens: 8192,
            input_cost: 0.00125,
            output_cost: 0.005,
            supports_vision: true,
            supports_function_calling: true,
        },
        {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            context_window: 1000000,
            max_output_tokens: 8192,
            input_cost: 0.000075,
            output_cost: 0.0003,
            supports_vision: true,
            supports_function_calling: true,
        },
    ];
}

// Mistral Model Discovery
async function discoverMistralModels(apiKey: string): Promise<ModelInfo[]> {
    return [
        {
            id: 'mistral-large-latest',
            name: 'Mistral Large',
            context_window: 128000,
            input_cost: 0.002,
            output_cost: 0.006,
            supports_function_calling: true,
        },
        {
            id: 'mistral-medium-latest',
            name: 'Mistral Medium',
            context_window: 32000,
            input_cost: 0.0027,
            output_cost: 0.0081,
            supports_function_calling: true,
        },
        {
            id: 'mistral-small-latest',
            name: 'Mistral Small',
            context_window: 32000,
            input_cost: 0.0002,
            output_cost: 0.0006,
            supports_function_calling: true,
        },
    ];
}

// Perplexity Model Discovery
async function discoverPerplexityModels(apiKey: string): Promise<ModelInfo[]> {
    return [
        {
            id: 'llama-3.1-sonar-large-128k-online',
            name: 'Sonar Large Online',
            context_window: 127072,
            input_cost: 0.001,
            output_cost: 0.001,
        },
        {
            id: 'llama-3.1-sonar-small-128k-online',
            name: 'Sonar Small Online',
            context_window: 127072,
            input_cost: 0.0002,
            output_cost: 0.0002,
        },
    ];
}

// X.AI (Grok) Model Discovery
async function discoverXAIModels(apiKey: string): Promise<ModelInfo[]> {
    return [
        {
            id: 'grok-beta',
            name: 'Grok Beta',
            context_window: 131072,
            input_cost: 0.005,
            output_cost: 0.015,
        },
    ];
}
