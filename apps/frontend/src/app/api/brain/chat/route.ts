import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { brainConfigService } from '@/services/brain/BrainConfigService'
import { intentClassifier } from '@/services/brain/agents/IntentClassifier'
import { writerAgent } from '@/services/brain/agents/WriterAgent'
import { generalistAgent } from '@/services/brain/agents/GeneralistAgent'
// Import other agents when created:
// import { analystAgent } from '@/services/brain/agents/AnalystAgent'
// import { coachAgent } from '@/services/brain/agents/CoachAgent'

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

        // 3. Load brain configuration for this org
        const brain = await brainConfigService.getOrgBrain(context.orgId)

        if (!brain) {
            return NextResponse.json(
                { error: 'No brain configuration found for your organization' },
                { status: 500 }
            )
        }

        // 4. Get or create conversation
        let conversationId = validated.conversationId

        if (!conversationId) {
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
                content: validated.message
            })

        if (msgError) {
            console.error('Failed to save user message:', msgError)
        }

        // 6. Classify intent to route to appropriate agent
        const providerId = brain.config.providers.chat
        const classification = await intentClassifier.classify(
            validated.message,
            providerId || undefined
        )

        console.log(`Intent classified as: ${classification.intent} (${classification.confidence})`)

        // 7. Select agent based on intent
        const agent = getAgentForIntent(classification.intent)

        // 8. Build agent context
        const agentContext = {
            orgId: context.orgId,
            userId: context.userId,
            conversationId: conversationId!,
            brainConfig: brain.config,
            brainTemplateId: brain.id
        }

        // 9. Execute agent (streaming or non-streaming)
        if (validated.stream) {
            return handleStreamingResponse(
                agent,
                validated.message,
                agentContext,
                conversationId!,
                brain.id,
                startTime
            )
        } else {
            return handleRegularResponse(
                agent,
                validated.message,
                agentContext,
                conversationId!,
                brain.id,
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

/**
 * Get agent instance for intent
 */
function getAgentForIntent(intent: string) {
    switch (intent) {
        case 'writer':
            return writerAgent

        // case 'analyst':
        //   return analystAgent

        // case 'coach':
        //   return coachAgent

        case 'generalist':
        default:
            return generalistAgent
    }
}

/**
 * Handle regular (non-streaming) response
 */
async function handleRegularResponse(
    agent: any,
    message: string,
    context: any,
    conversationId: string,
    brainId: string,
    startTime: number
) {
    const supabase = createClient()

    try {
        // Execute agent
        const response = await agent.execute(message, context)

        // Save assistant message
        const { error: saveError } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: response.content,
                metadata: {
                    agentType: response.metadata.agentType,
                    tokensUsed: response.metadata.tokensUsed,
                    toolsUsed: response.toolsUsed.map((t: any) => t.tool)
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

        // Log request metrics
        await brainConfigService.logRequest({
            orgId: context.orgId,
            userId: context.userId,
            brainTemplateId: brainId,
            requestType: 'chat',
            responseTimeMs: Date.now() - startTime,
            tokensUsed: response.metadata.tokensUsed,
            metadata: {
                agentType: response.metadata.agentType,
                intent: agent.agentType
            }
        })

        return NextResponse.json({
            response: response.content,
            conversationId,
            metadata: {
                agentType: response.metadata.agentType,
                tokensUsed: response.metadata.tokensUsed,
                responseTime: response.metadata.responseTime,
                toolsUsed: response.toolsUsed.map((t: any) => t.tool)
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
    agent: any,
    message: string,
    context: any,
    conversationId: string,
    brainId: string,
    startTime: number
) {
    const supabase = createClient()

    // Create readable stream
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                let fullResponse = ''

                // Stream from agent
                for await (const chunk of agent.executeStream(message, context)) {
                    fullResponse += chunk

                    // Send chunk to client
                    const data = `data: ${JSON.stringify({ chunk })}\n\n`
                    controller.enqueue(encoder.encode(data))
                }

                // Save complete assistant message
                await supabase
                    .from('messages')
                    .insert({
                        conversation_id: conversationId,
                        role: 'assistant',
                        content: fullResponse,
                        metadata: {
                            agentType: agent.agentType,
                            streaming: true
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

                // Log metrics
                await brainConfigService.logRequest({
                    orgId: context.orgId,
                    userId: context.userId,
                    brainTemplateId: brainId,
                    requestType: 'chat_stream',
                    responseTimeMs: Date.now() - startTime,
                    tokensUsed: Math.ceil(fullResponse.length / 4),
                    metadata: {
                        agentType: agent.agentType
                    }
                })

                // Send completion signal
                const doneData = `data: ${JSON.stringify({ done: true })}\n\n`
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
            'Connection': 'keep-alive'
        }
    })
}
