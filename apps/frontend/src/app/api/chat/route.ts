import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { estimateMessagesTokens, estimateTokens } from '@/lib/ai/costCalculator';
import { decryptSecret } from '@/lib/secrets';
import { PROVIDER_BASE_URLS } from '@/lib/ai-providers';

/**
 * LEGACY: AI Chat API (brain_id + organization_id)
 * For org-wide brain chat use /api/brain/chat instead (single source of truth: deployed brain_agents).
 * This route uses brain_ai_assignments and brain_templates.system_prompt and is not part of the
 * go-live brain governance flow.
 */

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequest {
    brain_id: string;
    organization_id: string;
    user_id?: string;
    messages: ChatMessage[];
    stream?: boolean;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(apiKey: string, model: string, messages: ChatMessage[], stream: boolean = false) {
    const response = await fetch(`${PROVIDER_BASE_URLS.openai}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages,
            stream,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return response;
}

/**
 * Call Anthropic API
 */
async function callAnthropic(apiKey: string, model: string, messages: ChatMessage[], stream: boolean = false) {
    // Convert messages format
    const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role,
            content: m.content,
        }));

    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

    const response = await fetch(`${PROVIDER_BASE_URLS.anthropic}/messages`, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: anthropicMessages,
            system: systemPrompt,
            stream,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    return response;
}

/**
 * POST /api/chat
 * Send chat message and get AI response
 */
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();
    const supabase = createClient();

    try {
        const { brain_id, organization_id, user_id, messages, stream = false }: ChatRequest = await request.json();

        if (!brain_id || !organization_id || !messages?.length) {
            return new Response(
                JSON.stringify({ error: 'brain_id, organization_id, and messages required' }),
                { status: 400 }
            );
        }

        // Get brain configuration
        const { data: brain, error: brainError } = await supabase
            .from('brain_templates')
            .select('*')
            .eq('id', brain_id)
            .single();

        if (brainError || !brain) {
            return new Response(
                JSON.stringify({ error: 'Brain not found' }),
                { status: 404 }
            );
        }

        // Get AI provider for this brain/org
        const { data: assignment } = await supabase
            .from('brain_ai_assignments')
            .select(`
                *,
                ai_providers!inner(*)
            `)
            .eq('brain_id', brain_id)
            .eq('organization_id', organization_id)
            .eq('is_active', true)
            .order('priority', { ascending: true })
            .limit(1)
            .single();

        if (!assignment) {
            return new Response(
                JSON.stringify({ error: 'No active AI provider configured' }),
                { status: 400 }
            );
        }

        const provider = assignment.ai_providers;
        let model = assignment.preferred_model;
        if (!model) {
            const { data: defaultModel } = await supabase
                .from('ai_model_metadata')
                .select('model_id')
                .eq('provider', provider.provider)
                .eq('is_active', true)
                .order('model_id', { ascending: true })
                .limit(1)
                .single();
            model = defaultModel?.model_id || 'gpt-4o-mini'; // last-resort static fallback
        }

        // Prepend system prompt
        const fullMessages: ChatMessage[] = [
            { role: 'system', content: brain.system_prompt },
            ...messages,
        ];

        // Estimate input tokens
        const input_tokens = estimateMessagesTokens(fullMessages);
        const startTime = Date.now();

        let response: Response;
        let output_tokens = 0;
        let responseText = '';

        try {
            // Call appropriate provider
            const providerApiKey = decryptSecret(provider.api_key);

            if (provider.provider === 'openai') {
                response = await callOpenAI(providerApiKey, model, fullMessages, stream);
            } else if (provider.provider === 'anthropic') {
                response = await callAnthropic(providerApiKey, model, fullMessages, stream);
            } else {
                throw new Error('Provider not supported');
            }

            // Handle streaming
            if (stream && response.body) {
                const readable = new ReadableStream({
                    async start(controller) {
                        const reader = response.body!.getReader();
                        const decoder = new TextDecoder();

                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                const chunk = decoder.decode(value);
                                const lines = chunk.split('\n').filter(line => line.trim());

                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        const data = line.slice(6);
                                        if (data === '[DONE]') continue;

                                        try {
                                            const parsed = JSON.parse(data);
                                            const content = parsed.choices?.[0]?.delta?.content ||
                                                parsed.delta?.text || '';

                                            if (content) {
                                                responseText += content;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                            }
                                        } catch (e) {
                                            // Skip invalid JSON
                                        }
                                    }
                                }
                            }

                            // Estimate output tokens
                            output_tokens = estimateTokens(responseText);

                            // Log usage
                            await logUsage(supabase, {
                                provider_id: provider.id,
                                model,
                                organization_id,
                                user_id,
                                brain_id,
                                input_tokens,
                                output_tokens,
                                response_time_ms: Date.now() - startTime,
                            });

                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                        } catch (error) {
                            controller.error(error);
                        }
                    },
                });

                return new Response(readable, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    },
                });
            }

            // Non-streaming response
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content ||
                data.content?.[0]?.text || '';
            output_tokens = estimateTokens(responseText);

            // Log usage
            await logUsage(supabase, {
                provider_id: provider.id,
                model,
                organization_id,
                user_id,
                brain_id,
                input_tokens,
                output_tokens,
                response_time_ms: Date.now() - startTime,
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    message: responseText,
                    provider: provider.provider,
                    model,
                    tokens_used: input_tokens + output_tokens,
                }),
                { headers: { 'Content-Type': 'application/json' } }
            );

        } catch (providerError: any) {
            console.error('Provider error:', providerError);

            // Mark provider failure
            await supabase.rpc('increment_provider_failure', { p_id: provider.id });

            return new Response(
                JSON.stringify({
                    error: 'AI provider error',
                    details: providerError.message,
                }),
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Chat API error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Chat failed' }),
            { status: 500 }
        );
    }
}

/**
 * Log AI usage
 */
async function logUsage(supabase: any, data: {
    provider_id: string;
    model: string;
    organization_id: string;
    user_id?: string;
    brain_id: string;
    input_tokens: number;
    output_tokens: number;
    response_time_ms: number;
}) {
    try {
        await fetch('/api/superadmin/ai-usage/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch (error) {
        console.error('Failed to log usage:', error);
    }
}
