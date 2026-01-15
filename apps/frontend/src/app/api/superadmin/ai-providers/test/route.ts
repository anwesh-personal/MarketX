import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Model Testing Service
 * Tests individual models with actual API calls
 */

interface TestRequest {
    provider: string;
    model_id: string;
    api_key: string;
    prompt?: string;
}

const DEFAULT_TEST_PROMPT = 'Say "Hello! I am working correctly." in exactly those words.';

// POST - Test a model
export async function POST(request: NextRequest) {
    try {
        const body: TestRequest = await request.json();
        const { provider, model_id, api_key, prompt = DEFAULT_TEST_PROMPT } = body;

        if (!provider || !model_id || !api_key) {
            return NextResponse.json(
                { error: 'Provider, model_id, and api_key required' },
                { status: 400 }
            );
        }

        const startTime = Date.now();
        let result: any;

        try {
            switch (provider) {
                case 'openai':
                    result = await testOpenAIModel(model_id, api_key, prompt);
                    break;
                case 'anthropic':
                    result = await testAnthropicModel(model_id, api_key, prompt);
                    break;
                case 'google':
                    result = await testGoogleModel(model_id, api_key, prompt);
                    break;
                case 'mistral':
                    result = await testMistralModel(model_id, api_key, prompt);
                    break;
                case 'perplexity':
                    result = await testPerplexityModel(model_id, api_key, prompt);
                    break;
                case 'xai':
                    result = await testXAIModel(model_id, api_key, prompt);
                    break;
                default:
                    return NextResponse.json(
                        { error: `Provider ${provider} not supported` },
                        { status: 400 }
                    );
            }

            const duration = Date.now() - startTime;

            return NextResponse.json({
                success: true,
                response: result.response,
                duration,
                tokens_used: result.tokens_used,
            });
        } catch (error: any) {
            const duration = Date.now() - startTime;

            return NextResponse.json({
                success: false,
                error: error.message,
                duration,
            });
        }
    } catch (error: any) {
        console.error('Error testing model:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// OpenAI Model Testing
async function testOpenAIModel(modelId: string, apiKey: string, prompt: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || response.statusText);
    }

    const data = await response.json();

    return {
        response: data.choices[0].message.content,
        tokens_used: data.usage?.total_tokens || 0,
    };
}

// Anthropic Model Testing
async function testAnthropicModel(modelId: string, apiKey: string, prompt: string) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelId,
            max_tokens: 100,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || response.statusText);
    }

    const data = await response.json();

    return {
        response: data.content[0].text,
        tokens_used: data.usage?.input_tokens + data.usage?.output_tokens || 0,
    };
}

// Google (Gemini) Model Testing
async function testGoogleModel(modelId: string, apiKey: string, prompt: string) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }],
                }],
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || response.statusText);
    }

    const data = await response.json();

    return {
        response: data.candidates[0].content.parts[0].text,
        tokens_used: data.usageMetadata?.totalTokenCount || 0,
    };
}

// Mistral Model Testing
async function testMistralModel(modelId: string, apiKey: string, prompt: string) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || response.statusText);
    }

    const data = await response.json();

    return {
        response: data.choices[0].message.content,
        tokens_used: data.usage?.total_tokens || 0,
    };
}

// Perplexity Model Testing
async function testPerplexityModel(modelId: string, apiKey: string, prompt: string) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || response.statusText);
    }

    const data = await response.json();

    return {
        response: data.choices[0].message.content,
        tokens_used: data.usage?.total_tokens || 0,
    };
}

// X.AI (Grok) Model Testing
async function testXAIModel(modelId: string, apiKey: string, prompt: string) {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || response.statusText);
    }

    const data = await response.json();

    return {
        response: data.choices[0].message.content,
        tokens_used: data.usage?.total_tokens || 0,
    };
}
