/**
 * Shared AI Provider Utilities
 * Single source of truth for:
 * - Model cost lookup
 * - Model testing functions
 * - Provider configurations
 */

// ===========================================
// COST LOOKUP (Single Source of Truth)
// ===========================================

export interface ModelCostInfo {
    input: number;      // per million tokens
    output: number;     // per million tokens
    context: number;    // context window size
    vision: boolean;    // supports vision/images
    functions: boolean; // supports function calling
}

export const MODEL_COST_LOOKUP: Record<string, ModelCostInfo> = {
    // OpenAI
    'gpt-4o': { input: 2.5, output: 10, context: 128000, vision: true, functions: true },
    'gpt-4o-mini': { input: 0.15, output: 0.6, context: 128000, vision: true, functions: true },
    'gpt-4-turbo': { input: 10, output: 30, context: 128000, vision: true, functions: true },
    'gpt-4': { input: 30, output: 60, context: 8192, vision: false, functions: true },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5, context: 16385, vision: false, functions: true },
    'o1': { input: 15, output: 60, context: 200000, vision: true, functions: false },
    'o1-mini': { input: 3, output: 12, context: 128000, vision: false, functions: false },
    'o1-preview': { input: 15, output: 60, context: 128000, vision: false, functions: false },

    // Anthropic
    'claude-3-5-sonnet': { input: 3, output: 15, context: 200000, vision: true, functions: true },
    'claude-3-5-haiku': { input: 0.8, output: 4, context: 200000, vision: false, functions: true },
    'claude-3-opus': { input: 15, output: 75, context: 200000, vision: true, functions: true },
    'claude-3-sonnet': { input: 3, output: 15, context: 200000, vision: true, functions: true },
    'claude-3-haiku': { input: 0.25, output: 1.25, context: 200000, vision: true, functions: true },

    // Google
    'gemini-2.0-flash': { input: 0, output: 0, context: 1000000, vision: true, functions: true },
    'gemini-1.5-pro': { input: 1.25, output: 5, context: 2000000, vision: true, functions: true },
    'gemini-1.5-flash': { input: 0.075, output: 0.3, context: 1000000, vision: true, functions: true },

    // Mistral
    'mistral-large': { input: 4, output: 12, context: 128000, vision: false, functions: true },
    'mistral-medium': { input: 2.7, output: 8.1, context: 32768, vision: false, functions: false },
    'mistral-small': { input: 1, output: 3, context: 32768, vision: false, functions: true },
    'codestral': { input: 1, output: 3, context: 32768, vision: false, functions: false },

    // xAI
    'grok-2': { input: 5, output: 15, context: 131072, vision: true, functions: true },
    'grok-beta': { input: 5, output: 15, context: 131072, vision: false, functions: true },

    // Perplexity
    'sonar': { input: 1, output: 1, context: 128000, vision: false, functions: false },
};

/**
 * Get cost info for a model ID using partial matching
 */
export function getModelCostInfo(modelId: string): ModelCostInfo {
    // Try exact match first
    if (MODEL_COST_LOOKUP[modelId]) {
        return MODEL_COST_LOOKUP[modelId];
    }

    // Partial match - find key that's contained in modelId
    for (const [key, value] of Object.entries(MODEL_COST_LOOKUP)) {
        if (modelId.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    // Default fallback for unknown models
    return { input: 0, output: 0, context: 4096, vision: false, functions: false };
}

// ===========================================
// MODEL TESTING
// ===========================================

export interface TestResult {
    success: boolean;
    error?: string;
    response?: string;
}

/**
 * Test a model with a real API call
 * Returns success: true only if the model responds
 */
export async function testModel(
    provider: string,
    modelId: string,
    apiKey: string
): Promise<TestResult> {
    try {
        const testMessage = 'Say "OK" only.';

        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: testMessage }],
                    max_tokens: 5,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error?.message || response.statusText };
            }
            const data = await response.json();
            return { success: true, response: data.choices?.[0]?.message?.content };
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
                    messages: [{ role: 'user', content: testMessage }],
                    max_tokens: 5,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error?.message || response.statusText };
            }
            const data = await response.json();
            return { success: true, response: data.content?.[0]?.text };
        }

        if (provider === 'google') {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: testMessage }] }],
                        generationConfig: { maxOutputTokens: 5 },
                    }),
                }
            );
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error?.message || response.statusText };
            }
            const data = await response.json();
            return { success: true, response: data.candidates?.[0]?.content?.parts?.[0]?.text };
        }

        if (provider === 'mistral') {
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: testMessage }],
                    max_tokens: 5,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error?.message || response.statusText };
            }
            const data = await response.json();
            return { success: true, response: data.choices?.[0]?.message?.content };
        }

        if (provider === 'xai') {
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: testMessage }],
                    max_tokens: 5,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error?.message || response.statusText };
            }
            const data = await response.json();
            return { success: true, response: data.choices?.[0]?.message?.content };
        }

        if (provider === 'perplexity') {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: 'user', content: testMessage }],
                    max_tokens: 5,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                return { success: false, error: err.error?.message || response.statusText };
            }
            const data = await response.json();
            return { success: true, response: data.choices?.[0]?.message?.content };
        }

        return { success: false, error: 'Unknown provider' };
    } catch (error: any) {
        return { success: false, error: error.message || 'Test failed' };
    }
}

// ===========================================
// KNOWN MODELS (for providers without API)
// ===========================================

export interface KnownModel {
    id: string;
    name: string;
    description: string;
}

// Anthropic has no models list API
export const ANTHROPIC_KNOWN_MODELS: KnownModel[] = [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Latest Sonnet - Best balance' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Latest Haiku - Fast & cheap' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest' },
    { id: 'claude-2.1', name: 'Claude 2.1', description: 'Legacy Claude 2.1' },
    { id: 'claude-2.0', name: 'Claude 2.0', description: 'Legacy Claude 2.0' },
    { id: 'claude-instant-1.2', name: 'Claude Instant', description: 'Legacy Instant' },
];

// xAI has no models list API
export const XAI_KNOWN_MODELS: KnownModel[] = [
    { id: 'grok-2-1212', name: 'Grok 2', description: 'Latest Grok 2' },
    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Grok 2 with vision' },
    { id: 'grok-beta', name: 'Grok Beta', description: 'Grok Beta' },
    { id: 'grok-vision-beta', name: 'Grok Vision Beta', description: 'Vision capabilities' },
];

// Perplexity has no models list API
export const PERPLEXITY_KNOWN_MODELS: KnownModel[] = [
    { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online', description: '8B params, real-time search' },
    { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online', description: '70B params, real-time search' },
    { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge Online', description: '405B params, real-time search' },
    { id: 'llama-3.1-sonar-small-128k-chat', name: 'Sonar Small Chat', description: '8B params, chat' },
    { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large Chat', description: '70B params, chat' },
    { id: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Base Llama 3.1 8B' },
    { id: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Base Llama 3.1 70B' },
];

/**
 * Generate friendly model name from model ID
 */
export function formatModelName(modelId: string): string {
    return modelId
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/(\d{8})$/, '') // Remove date suffixes like 20241022
        .trim();
}
