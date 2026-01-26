import { createClient } from '@/lib/supabase/server'
import { ragOrchestrator } from '../RAGOrchestrator'
import { BrainConfig } from '../BrainConfigService'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface AgentConfig {
    systemPrompt: string
    temperature: number
    maxTokens: number
    tools: string[]
    providerId?: string | null
}

export interface AgentContext {
    orgId: string
    userId: string
    conversationId: string
    brainConfig: BrainConfig
    brainTemplateId?: string
    sessionState?: Record<string, any>
}

export interface AgentResponse {
    content: string
    toolsUsed: ToolExecution[]
    metadata: {
        tokensUsed: number
        responseTime: number
        agentType: string
        sessionId: string
    }
}

export interface ToolExecution {
    tool: string
    parameters: any
    result: any
    executionTime: number
    success: boolean
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

// ============================================================
// AGENT BASE CLASS
// ============================================================

export abstract class Agent {
    protected getSupabase() { return createClient() }

    abstract name: string
    abstract agentType: string
    abstract config: AgentConfig

    /**
     * Main execution method - orchestrates the entire agent flow
     */
    async execute(
        input: string,
        context: AgentContext
    ): Promise<AgentResponse> {
        const startTime = Date.now()
        const toolsUsed: ToolExecution[] = []

        // Create agent session
        const sessionId = await this.createSession(context)

        try {
            // 1. Gather context via RAG
            const ragContext = await this.gatherContext(input, context)

            // 2. Execute tools if needed
            if (this.config.tools.length > 0) {
                const toolResults = await this.executeTools(input, context)
                toolsUsed.push(...toolResults)
            }

            // 3. Build messages for LLM
            const messages = this.buildMessages(input, ragContext, toolsUsed)

            // 4. Get AI provider
            const provider = await this.getProvider(context)

            // 5. Generate response
            const response = await this.callLLM(messages, provider)
            const content = response.content
            const tokensUsed = response.tokensUsed

            // 6. Complete session
            await this.completeSession(sessionId, toolsUsed, tokensUsed, true)

            // 7. Update metrics
            await this.updateMetrics(context, Date.now() - startTime, tokensUsed, toolsUsed.length, true)

            return {
                content,
                toolsUsed,
                metadata: {
                    tokensUsed,
                    responseTime: Date.now() - startTime,
                    agentType: this.agentType,
                    sessionId
                }
            }
        } catch (error: any) {
            console.error(`Agent ${this.name} execution failed:`, error)

            // Mark session as failed
            await this.completeSession(sessionId, toolsUsed, 0, false)

            // Update metrics with failure
            await this.updateMetrics(context, Date.now() - startTime, 0, toolsUsed.length, false)

            throw error
        }
    }

    /**
     * Stream execution for real-time responses
     */
    async *executeStream(
        input: string,
        context: AgentContext
    ): AsyncGenerator<string> {
        const sessionId = await this.createSession(context)

        try {
            // Gather context and execute tools first
            const ragContext = await this.gatherContext(input, context)
            const toolResults = await this.executeTools(input, context)

            // Build messages
            const messages = this.buildMessages(input, ragContext, toolResults)

            // Get provider
            const provider = await this.getProvider(context)

            // Stream response
            const stream = await this.callLLMStream(messages, provider)

            let totalTokens = 0
            for await (const chunk of stream) {
                yield chunk
                totalTokens += Math.ceil(chunk.length / 4) // Rough estimate
            }

            // Complete session
            await this.completeSession(sessionId, toolResults, totalTokens, true)
        } catch (error) {
            console.error('Streaming execution failed:', error)
            await this.completeSession(sessionId, [], 0, false)
            throw error
        }
    }

    /**
     * Gather relevant context from RAG
     */
    protected async gatherContext(
        input: string,
        context: AgentContext
    ): Promise<string> {
        if (!context.brainConfig.rag.enabled) {
            return ''
        }

        const ragResult = await ragOrchestrator.retrieve(input, {
            orgId: context.orgId,
            userId: context.userId,
            brainConfig: context.brainConfig,
            brainTemplateId: context.brainTemplateId
        })

        return ragResult.context
    }

    /**
     * Execute tools based on query
     */
    protected async executeTools(
        input: string,
        context: AgentContext
    ): Promise<ToolExecution[]> {
        const executions: ToolExecution[] = []

        // Determine which tools to use
        const toolsToUse = await this.selectTools(input, context)

        for (const toolName of toolsToUse) {
            const startTime = Date.now()

            try {
                const result = await this.executeTool(toolName, input, context)

                executions.push({
                    tool: toolName,
                    parameters: { query: input },
                    result,
                    executionTime: Date.now() - startTime,
                    success: true
                })

                // Log tool execution
                await this.logToolExecution(
                    context.conversationId,
                    toolName,
                    { query: input },
                    result,
                    Date.now() - startTime,
                    true
                )
            } catch (error: any) {
                console.error(`Tool ${toolName} failed:`, error)

                executions.push({
                    tool: toolName,
                    parameters: { query: input },
                    result: null,
                    executionTime: Date.now() - startTime,
                    success: false
                })

                // Log failed execution
                await this.logToolExecution(
                    context.conversationId,
                    toolName,
                    { query: input },
                    null,
                    Date.now() - startTime,
                    false,
                    error.message
                )
            }
        }

        return executions
    }

    /**
     * Select which tools to use based on input
     * Override in subclasses for smarter selection
     */
    protected async selectTools(
        input: string,
        context: AgentContext
    ): Promise<string[]> {
        // Default: use all available tools if applicable
        return this.config.tools.filter(tool => {
            // Only use kb_search if RAG is enabled
            if (tool === 'kb_search') {
                return context.brainConfig.rag.enabled
            }
            return true
        })
    }

    /**
     * Execute a single tool
     * MUST be implemented by subclasses
     */
    protected abstract executeTool(
        toolName: string,
        input: string,
        context: AgentContext
    ): Promise<any>

    /**
     * Build messages for LLM
     */
    protected buildMessages(
        input: string,
        ragContext: string,
        toolResults: ToolExecution[]
    ): ChatMessage[] {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: this.config.systemPrompt
            }
        ]

        // Add RAG context if available
        if (ragContext) {
            messages.push({
                role: 'system',
                content: `Here is relevant context from the knowledge base:\n\n${ragContext}`
            })
        }

        // Add tool results
        if (toolResults.length > 0) {
            const successfulResults = toolResults.filter(t => t.success)

            if (successfulResults.length > 0) {
                const toolContext = successfulResults
                    .map(t => `[${t.tool}] ${JSON.stringify(t.result)}`)
                    .join('\n\n')

                messages.push({
                    role: 'system',
                    content: `Tool execution results:\n\n${toolContext}`
                })
            }
        }

        // Add user input
        messages.push({
            role: 'user',
            content: input
        })

        return messages
    }

    /**
     * Get AI provider for this agent
     */
    protected async getProvider(context: AgentContext): Promise<any> {
        const providerId = this.config.providerId || context.brainConfig.providers.chat

        if (!providerId) {
            throw new Error('No AI provider configured for this agent')
        }

        const { data: provider, error } = await this.getSupabase()
            .from('ai_providers')
            .select('*')
            .eq('id', providerId)
            .single()

        if (error || !provider) {
            throw new Error('AI provider not found')
        }

        return provider
    }

    /**
     * Call LLM (non-streaming)
     */
    protected async callLLM(
        messages: ChatMessage[],
        provider: any
    ): Promise<{ content: string, tokensUsed: number }> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.api_key}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages: messages,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens
            })
        })

        if (!response.ok) {
            throw new Error(`LLM call failed: ${response.statusText}`)
        }

        const result = await response.json()

        return {
            content: result.choices[0].message.content || '',
            tokensUsed: result.usage?.total_tokens || 0
        }
    }

    /**
     * Call LLM with streaming
     */
    protected async *callLLMStream(
        messages: ChatMessage[],
        provider: any
    ): AsyncGenerator<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.api_key}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages: messages,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stream: true
            })
        })

        if (!response.ok) {
            throw new Error(`LLM streaming failed: ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
            throw new Error('No response body')
        }

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(line => line.trim() !== '')

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') continue

                    try {
                        const parsed = JSON.parse(data)
                        const content = parsed.choices[0]?.delta?.content
                        if (content) {
                            yield content
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    }

    /**
     * Create agent session
     */
    protected async createSession(context: AgentContext): Promise<string> {
        const { data, error } = await this.getSupabase()
            .from('agent_sessions')
            .insert({
                conversation_id: context.conversationId,
                agent_type: this.agentType,
                state: context.sessionState || {}
            })
            .select('id')
            .single()

        if (error) {
            console.error('Failed to create agent session:', error)
            return crypto.randomUUID()
        }

        return data.id
    }

    /**
     * Complete agent session
     */
    protected async completeSession(
        sessionId: string,
        toolsUsed: ToolExecution[],
        tokensUsed: number,
        success: boolean
    ): Promise<void> {
        const { error } = await this.getSupabase()
            .from('agent_sessions')
            .update({
                tools_used: toolsUsed.map(t => t.tool),
                tokens_used: tokensUsed,
                completed_at: new Date().toISOString()
            })
            .eq('id', sessionId)

        if (error) {
            console.error('Failed to complete agent session:', error)
        }
    }

    /**
     * Log tool execution
     */
    protected async logToolExecution(
        conversationId: string,
        toolName: string,
        parameters: any,
        result: any,
        executionTime: number,
        success: boolean,
        errorMessage?: string
    ): Promise<void> {
        const { error } = await this.getSupabase()
            .from('tool_executions')
            .insert({
                tool_name: toolName,
                parameters,
                result,
                execution_time_ms: executionTime,
                success,
                error_message: errorMessage
            })

        if (error) {
            console.error('Failed to log tool execution:', error)
        }
    }

    /**
     * Update agent metrics
     */
    protected async updateMetrics(
        context: AgentContext,
        responseTime: number,
        tokensUsed: number,
        toolsCount: number,
        success: boolean
    ): Promise<void> {
        // Get agent ID from database
        const { data: agent } = await this.getSupabase()
            .from('agents')
            .select('id')
            .eq('agent_type', this.agentType)
            .single()

        if (!agent) return

        const today = new Date().toISOString().split('T')[0]

        const { error } = await this.getSupabase().rpc('update_agent_metrics', {
            agent_uuid: agent.id,
            metric_date: today,
            response_time_ms: responseTime,
            tokens: tokensUsed,
            tools_count: toolsCount,
            success: success
        })

        if (error) {
            console.error('Failed to update agent metrics:', error)
        }
    }

    /**
     * Check if this agent can handle the given intent
     * MUST be implemented by subclasses
     */
    abstract canHandle(intent: string): boolean
}
