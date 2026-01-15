import { NextRequest, NextResponse } from 'next/server'

/**
 * Test an AI provider key by making a simple API call
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { providerId: string } }
) {
    try {
        const { provider, api_key } = await request.json()

        if (!provider || !api_key) {
            return NextResponse.json({ error: 'Provider and API key required' }, { status: 400 })
        }

        // Test based on provider type
        let testResult

        switch (provider) {
            case 'openai':
                testResult = await testOpenAI(api_key)
                break
            case 'anthropic':
                testResult = await testAnthropic(api_key)
                break
            case 'google':
                testResult = await testGoogle(api_key)
                break
            case 'mistral':
                testResult = await testMistral(api_key)
                break
            case 'perplexity':
                testResult = await testPerplexity(api_key)
                break
            case 'xai':
                testResult = await testXAI(api_key)
                break
            default:
                return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
        }

        return NextResponse.json(testResult)
    } catch (error: any) {
        return NextResponse.json({
            valid: false,
            error: error.message
        }, { status: 500 })
    }
}

async function testOpenAI(apiKey: string) {
    try {
        // Test with a simple models list call
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        })

        if (!response.ok) {
            const error = await response.json()
            return {
                valid: false,
                error: error.error?.message || 'Invalid API key',
            }
        }

        const data = await response.json()
        const models = data.data
            .filter((m: any) => m.id.includes('gpt'))
            .map((m: any) => ({
                id: m.id,
                name: m.id,
                created: m.created,
            }))

        return {
            valid: true,
            models: models.slice(0, 10), // Return first 10 models
            message: `Found ${models.length} GPT models`,
        }
    } catch (error: any) {
        return {
            valid: false,
            error: error.message,
        }
    }
}

async function testAnthropic(apiKey: string) {
    try {
        // Anthropic doesn't have a models endpoint, so test with a minimal message call
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }],
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            return {
                valid: false,
                error: error.error?.message || 'Invalid API key',
            }
        }

        // Hardcoded known models
        const models = [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
        ]

        return {
            valid: true,
            models,
            message: 'API key validated successfully',
        }
    } catch (error: any) {
        return {
            valid: false,
            error: error.message,
        }
    }
}

async function testGoogle(apiKey: string) {
    try {
        // Google Gemini API test
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)

        if (!response.ok) {
            const error = await response.json()
            return {
                valid: false,
                error: error.error?.message || 'Invalid API key',
            }
        }

        const data = await response.json()
        const models = data.models.map((m: any) => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name,
        }))

        return {
            valid: true,
            models,
            message: `Found ${models.length} models`,
        }
    } catch (error: any) {
        return {
            valid: false,
            error: error.message,
        }
    }
}

async function testMistral(apiKey: string) {
    try {
        const response = await fetch('https://api.mistral.ai/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        })

        if (!response.ok) {
            const error = await response.json()
            return {
                valid: false,
                error: error.message || 'Invalid API key',
            }
        }

        const data = await response.json()
        const models = data.data.map((m: any) => ({
            id: m.id,
            name: m.id,
        }))

        return {
            valid: true,
            models,
            message: `Found ${models.length} models`,
        }
    } catch (error: any) {
        return {
            valid: false,
            error: error.message,
        }
    }
}

async function testPerplexity(apiKey: string) {
    try {
        // Perplexity uses OpenAI-compatible API
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            return {
                valid: false,
                error: error.error?.message || 'Invalid API key',
            }
        }

        // Hardcoded known models
        const models = [
            { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online' },
            { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online' },
            { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large Chat' },
            { id: 'llama-3.1-sonar-small-128k-chat', name: 'Sonar Small Chat' },
        ]

        return {
            valid: true,
            models,
            message: 'API key validated successfully',
        }
    } catch (error: any) {
        return {
            valid: false,
            error: error.message,
        }
    }
}

async function testXAI(apiKey: string) {
    try {
        // X.AI (Grok) uses OpenAI-compatible API
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'grok-beta',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            return {
                valid: false,
                error: error.error?.message || 'Invalid API key',
            }
        }

        // Hardcoded known models
        const models = [
            { id: 'grok-beta', name: 'Grok Beta' },
            { id: 'grok-vision-beta', name: 'Grok Vision Beta' },
        ]

        return {
            valid: true,
            models,
            message: 'API key validated successfully',
        }
    } catch (error: any) {
        return {
            valid: false,
            error: error.message,
        }
    }
}
