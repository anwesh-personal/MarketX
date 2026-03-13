import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getActiveBrainRuntime, type BrainRuntime } from '@/services/brain/BrainRuntimeResolver'
import { brainConfigService } from '@/services/brain/BrainConfigService'
import { brainOrchestrator } from '@/services/brain/BrainOrchestrator'
import { ToolLoader } from '@/services/brain/tools/ToolLoader'
import { PromptAssembler, type MemoryItem } from '@/services/brain/PromptAssembler'
import { loadConstitutionRules } from '@/services/brain/ConstitutionLoader'
import { ragOrchestrator, type RAGResult } from '@/services/brain/RAGOrchestrator'
import type { BrainChatMessage, BrainToolDefinition } from '@/services/ai/types'

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const chatRequestSchema = z.object({
    message: z.string().min(1).max(10000),
    conversationId: z.string().uuid().optional(),
    stream: z.boolean().optional().default(false)
})

// ============================================================
// AUTHENTICATION & CONTEXT
// ============================================================

async function getRequestContext(req: NextRequest) {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        return null
    }

    // Get user's organization
    const { data: userRecord } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!userRecord?.org_id) {
        return null
    }

    return {
        userId: user.id,
        orgId: userRecord.org_id
    }
}

// ============================================================
// POST /api/brain/chat
// Main chat endpoint - orchestrates entire brain system
// ============================================================

export async function POST(req: NextRequest) {
    const startTime = Date.now()
    const supabase = createClient()

    try {
        // 1. Authenticate and get context
        const context = await getRequestContext(req)

        if (!context) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        // 2. Validate request
        const body = await req.json()
        const validated = chatRequestSchema.parse(body)

        // 3. Resolve active brain runtime (single source of truth: deployed brain_agents)
        const runtime = await getActiveBrainRuntime(context.orgId)

        if (!runtime) {
            return NextResponse.json(
                { error: 'No active brain agent deployed for your organization. Ask your admin to deploy a brain from Superadmin.' },
                { status: 500 }
            )
        }

        // 4. Get or create conversation
        let conversationId = validated.conversationId

        if (conversationId) {
            const { data: existingConversation, error: existingConversationError } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', conversationId)
                .eq('org_id', context.orgId)
                .eq('user_id', context.userId)
                .single()

            if (existingConversationError || !existingConversation) {
                return NextResponse.json(
                    { error: 'Conversation not found or access denied' },
                    { status: 403 }
                )
            }
        } else {
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                    org_id: context.orgId,
                    user_id: context.userId,
                    title: validated.message.substring(0, 100),
                    total_messages: 0
                })
                .select('id')
                .single()

            if (convError) {
                throw new Error('Failed to create conversation')
            }

            conversationId = newConv.id
        }

        // 5. Save user message
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                role: 'user',
                content: validated.message,
                org_id: context.orgId,
                user_id: context.userId
            })

        if (msgError) {
            console.error('Failed to save user message:', msgError)
        }

        // 6. Resolve tools, prompt, and chat history from single runtime
        const tools = await ToolLoader.getAgentTools(runtime.agentId)
        const promptContext = await buildSystemPromptFromRuntime(
            runtime,
            context.orgId,
            context.userId,
            validated.message
        )
        const messages = await loadConversationMessages(conversationId!, context.orgId)

        // 7. Execute bounded agentic loop (streaming or non-streaming response wrapper)
        const brainIdForLogging = runtime.templateId ?? runtime.agentId
        if (validated.stream) {
            return handleStreamingResponse(
                {
                    orgId: context.orgId,
                    userId: context.userId,
                    conversationId: conversationId!,
                    brainId: brainIdForLogging,
                    deployedAgentId: runtime.agentId,
                    maxTurns: runtime.maxTurns,
                    preferredProvider: runtime.preferredProvider ?? undefined,
                    preferredModel: runtime.preferredModel ?? undefined,
                    strictGrounding: runtime.prompt.strictGrounding,
                    gapDetected: promptContext.gapDetected,
                    gapConfidence: promptContext.gapConfidence,
                    tools,
                    messages,
                    systemPrompt: promptContext.systemPrompt
                },
                conversationId!,
                startTime
            )
        } else {
            return handleRegularResponse(
                {
                    orgId: context.orgId,
                    userId: context.userId,
                    conversationId: conversationId!,
                    brainId: brainIdForLogging,
                    deployedAgentId: runtime.agentId,
                    maxTurns: runtime.maxTurns,
                    preferredProvider: runtime.preferredProvider ?? undefined,
                    preferredModel: runtime.preferredModel ?? undefined,
                    strictGrounding: runtime.prompt.strictGrounding,
                    gapDetected: promptContext.gapDetected,
                    gapConfidence: promptContext.gapConfidence,
                    tools,
                    messages,
                    systemPrompt: promptContext.systemPrompt
                },
                conversationId!,
                startTime
            )
        }
    } catch (error: any) {
        console.error('Brain chat API error:', error)

        // Zod validation error
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid request',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

type TurnExecutionContext = {
    orgId: string
    userId: string
    conversationId: string
    brainId: string
    deployedAgentId?: string
    maxTurns: number
    preferredProvider?: string
    preferredModel?: string
    strictGrounding: boolean
    gapDetected: boolean
    gapConfidence: number
    tools: BrainToolDefinition[]
    messages: BrainChatMessage[]
    systemPrompt: string
}

async function loadConversationMessages(conversationId: string, orgId: string): Promise<BrainChatMessage[]> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
        .limit(20)

    if (error || !data) {
        return []
    }

    return data
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content || ''
        }))
}

async function buildSystemPromptFromRuntime(
    runtime: BrainRuntime,
    orgId: string,
    userId: string,
    query: string
): Promise<{ systemPrompt: string; gapDetected: boolean; gapConfidence: number }> {
    const [rag, memories, constitutionRules] = await Promise.all([
        retrievePromptRag(orgId, userId, runtime.brainConfigForRAG, query),
        retrievePromptMemories(orgId, userId),
        loadConstitutionRules(orgId)
    ])

    if (!rag) {
        await recordRetrievalGap(orgId, query, 'rag_unavailable')
    }

    const assembled = PromptAssembler.assemble(
        {
            foundation_prompt: runtime.prompt.foundation,
            persona_prompt: runtime.prompt.persona,
            domain_prompt: runtime.prompt.domain,
            guardrails_prompt: runtime.prompt.guardrails,
            strict_grounding: runtime.prompt.strictGrounding,
            name: runtime.prompt.agentName
        },
        rag,
        memories,
        undefined,
        constitutionRules
    )
    return {
        systemPrompt: assembled.systemPrompt,
        gapDetected: rag?.gapDetected ?? true,
        gapConfidence: rag?.gapConfidence ?? 0
    }
}

async function retrievePromptRag(
    orgId: string,
    userId: string,
    brainConfig: BrainConfig,
    query: string
): Promise<RAGResult | null> {
    try {
        return await ragOrchestrator.retrieve(query, {
            orgId,
            userId,
            brainConfig
        })
    } catch (error) {
        console.error('Prompt RAG retrieval failed:', error)
        return null
    }
}

async function retrievePromptMemories(orgId: string, userId: string): Promise<MemoryItem[]> {
    try {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('user_memory')
            .select('value, memory_type, confidence, access_count')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('access_count', { ascending: false })
            .limit(10)

        if (error || !data) {
            return []
        }

        return data.map(row => ({
            content: row.value || '',
            memory_type: row.memory_type || 'context',
            importance: typeof row.confidence === 'number'
                ? row.confidence
                : Math.min(1, (row.access_count || 0) / 10)
        }))
    } catch (error) {
        console.error('Prompt memory retrieval failed:', error)
        return []
    }
}

async function recordRetrievalGap(orgId: string, query: string, domain: string): Promise<void> {
    try {
        const supabase = createClient()
        const description = `Prompt-time RAG retrieval unavailable for: "${query.slice(0, 120)}"`
        await supabase
            .from('knowledge_gaps')
            .upsert(
                {
                    org_id: orgId,
                    domain,
                    description,
                    failed_queries: [query],
                    occurrence_count: 1,
                    impact_level: 'high',
                    last_identified: new Date().toISOString(),
                    status: 'identified',
                },
                {
                    onConflict: 'org_id,domain',
                    ignoreDuplicates: false,
                }
            )
    } catch (error) {
        console.error('Failed to record retrieval gap:', error)
    }
}

async function handleRegularResponse(
    execution: TurnExecutionContext,
    conversationId: string,
    startTime: number
) {
    const supabase = createClient()

    try {
        const response = await brainOrchestrator.handleTurn({
            orgId: execution.orgId,
            agentId: execution.deployedAgentId,
            // route persists assistant message itself to avoid double inserts
            conversationId: undefined,
            messages: execution.messages,
            systemPrompt: execution.systemPrompt,
            tools: execution.tools,
            options: {
                maxTurns: execution.maxTurns,
                preferredProvider: execution.preferredProvider,
                preferredModel: execution.preferredModel,
                grounding: {
                    strict: execution.strictGrounding,
                    gapDetected: execution.gapDetected,
                    gapConfidence: execution.gapConfidence
                }
            }
        })

        // Save assistant message
        const { error: saveError } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: response.content,
                org_id: execution.orgId,
                user_id: execution.userId,
                metadata: {
                    agentId: execution.deployedAgentId || null,
                    tokensUsed: response.totalTokens,
                    turnsUsed: response.turnsUsed,
                    toolsUsed: response.toolCallsMade.map(t => t.name),
                    toolCalls: response.toolCallsMade
                }
            })

        if (saveError) {
            console.error('Failed to save assistant message:', saveError)
        }

        // Update conversation
        const { data: conv } = await supabase
            .from('conversations')
            .select('total_messages')
            .eq('id', conversationId)
            .single()

        await supabase
            .from('conversations')
            .update({
                total_messages: (conv?.total_messages || 0) + 2,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
            .eq('org_id', execution.orgId)

        // Log request metrics
        await brainConfigService.logRequest({
            orgId: execution.orgId,
            userId: execution.userId,
            brainTemplateId: execution.brainId,
            requestType: 'chat',
            responseTimeMs: Date.now() - startTime,
            tokensUsed: response.totalTokens,
            metadata: {
                agentId: execution.deployedAgentId ?? 'none',
                turnsUsed: response.turnsUsed,
                toolCalls: response.toolCallsMade.length,
                gapDetected: execution.gapDetected,
                gapConfidence: execution.gapConfidence
            }
        })

        return NextResponse.json({
            response: response.content,
            conversationId,
            metadata: {
                agentId: execution.deployedAgentId ?? 'none',
                tokensUsed: response.totalTokens,
                turnsUsed: response.turnsUsed,
                responseTime: Date.now() - startTime,
                toolsUsed: response.toolCallsMade.map(t => t.name),
                toolCallsMade: response.toolCallsMade.length,
                gapDetected: execution.gapDetected,
                gapConfidence: execution.gapConfidence
            }
        })
    } catch (error: any) {
        console.error('Agent execution failed:', error)
        throw error
    }
}

/**
 * Handle streaming response
 */
async function handleStreamingResponse(
    execution: TurnExecutionContext,
    conversationId: string,
    startTime: number
) {
    const supabase = createClient()

    // Create readable stream
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const sendEvent = (payload: Record<string, unknown>) => {
                    const data = `data: ${JSON.stringify(payload)}\n\n`
                    controller.enqueue(encoder.encode(data))
                }
                let finalChunkSent = false

                const result = await brainOrchestrator.handleTurn({
                    orgId: execution.orgId,
                    agentId: execution.deployedAgentId,
                    conversationId: undefined,
                    messages: execution.messages,
                    systemPrompt: execution.systemPrompt,
                    tools: execution.tools,
                    onEvent: async (event) => {
                        if (event.type === 'turn_start') {
                            sendEvent({ event: 'turn_start', turn: event.turn, totalTokens: event.totalTokens })
                            return
                        }

                        if (event.type === 'tool_result') {
                            sendEvent({
                                event: 'tool_result',
                                turn: event.turn,
                                toolName: event.toolName,
                                success: event.success,
                                durationMs: event.durationMs,
                                totalTokens: event.totalTokens
                            })
                            return
                        }

                        if (event.type === 'llm_response') {
                            // Stream human-readable chunk only when this LLM turn is final (no tool calls).
                            if ((event.toolCallsCount ?? 0) === 0 && event.content) {
                                sendEvent({ chunk: event.content, turn: event.turn, final: true })
                                finalChunkSent = true
                            } else {
                                sendEvent({
                                    event: 'llm_response',
                                    turn: event.turn,
                                    toolCallsCount: event.toolCallsCount ?? 0,
                                    totalTokens: event.totalTokens
                                })
                            }
                            return
                        }

                        if (event.type === 'final' && event.content && !finalChunkSent) {
                            sendEvent({ chunk: event.content, turn: event.turn, final: true })
                            finalChunkSent = true
                        }
                    },
                    options: {
                        maxTurns: execution.maxTurns,
                        preferredProvider: execution.preferredProvider,
                        preferredModel: execution.preferredModel,
                        grounding: {
                            strict: execution.strictGrounding,
                            gapDetected: execution.gapDetected,
                            gapConfidence: execution.gapConfidence
                        }
                    }
                })

                const fullResponse = result.response

                if (!finalChunkSent) {
                    sendEvent({
                        chunk: fullResponse,
                        conversationId,
                        metadata: {
                            turnsUsed: result.turnsUsed,
                            tokensUsed: result.totalTokens,
                            toolsUsed: result.toolCallsMade.map(t => t.name)
                        }
                    })
                }

                // Save complete assistant message
                await supabase
                    .from('messages')
                    .insert({
                        conversation_id: conversationId,
                        role: 'assistant',
                        content: fullResponse,
                        org_id: execution.orgId,
                        user_id: execution.userId,
                        metadata: {
                            agentId: execution.deployedAgentId || null,
                            streaming: true,
                            turnsUsed: result.turnsUsed,
                            tokensUsed: result.totalTokens,
                            toolsUsed: result.toolCallsMade.map(t => t.name),
                            toolCalls: result.toolCallsMade
                        }
                    })

                // Update conversation
                const { data: conv } = await supabase
                    .from('conversations')
                    .select('total_messages')
                    .eq('id', conversationId)
                    .single()

                await supabase
                    .from('conversations')
                    .update({
                        total_messages: (conv?.total_messages || 0) + 2,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', conversationId)
                    .eq('org_id', execution.orgId)

                // Log metrics
                await brainConfigService.logRequest({
                    orgId: execution.orgId,
                    userId: execution.userId,
                    brainTemplateId: execution.brainId,
                    requestType: 'chat_stream',
                    responseTimeMs: Date.now() - startTime,
                    tokensUsed: result.totalTokens,
                    metadata: {
                        agentId: execution.deployedAgentId ?? 'none',
                        turnsUsed: result.turnsUsed,
                        toolCalls: result.toolCallsMade.length,
                        gapDetected: execution.gapDetected,
                        gapConfidence: execution.gapConfidence
                    }
                })

                // Send completion signal
                const doneData = `data: ${JSON.stringify({
                    done: true,
                    conversationId,
                    metadata: {
                        turnsUsed: result.turnsUsed,
                        tokensUsed: result.totalTokens,
                        toolsUsed: result.toolCallsMade.map(t => t.name),
                        toolCallsMade: result.toolCallsMade.length,
                        gapDetected: execution.gapDetected,
                        gapConfidence: execution.gapConfidence
                    }
                })}\n\n`
                controller.enqueue(encoder.encode(doneData))

                controller.close()
            } catch (error: any) {
                console.error('Streaming error:', error)

                const errorData = `data: ${JSON.stringify({ error: error.message })}\n\n`
                controller.enqueue(encoder.encode(errorData))
                controller.close()
            }
        }
    })

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Conversation-Id': conversationId
        }
    })
}
