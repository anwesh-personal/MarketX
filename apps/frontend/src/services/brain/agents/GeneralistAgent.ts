import { Agent, AgentConfig, AgentContext } from './Agent'
import { ragOrchestrator } from '../RAGOrchestrator'

// ============================================================
// GENERALIST AGENT
// ============================================================

export class GeneralistAgent extends Agent {
    name = 'Generalist Agent'
    agentType = 'generalist'

    config: AgentConfig = {
        systemPrompt: `You are a helpful AI assistant. Answer questions accurately using the knowledge base and your general knowledge. Be conversational, friendly, and concise.

Guidelines:
- **Use the knowledge base** when relevant context is available
- **Be honest** about what you don't know
- **Stay conversational** - you're a helpful companion, not a robot
- **Ask clarifying questions** when user intent is unclear
- **Cite sources** when using knowledge base information
- **Keep responses focused** - don't over-explain simple questions

You're great at:
- Answering general questions
- Providing explanations
- Having natural conversations
- Finding information quickly
- Connecting different ideas`,
        temperature: 0.7,
        maxTokens: 2000,
        tools: ['kb_search', 'memory_recall', 'web_search', 'calculator']
    }

    /**
     * Generalist handles everything that doesn't match specialists
     */
    canHandle(intent: string): boolean {
        // Generalist is the fallback - always returns true
        return true
    }

    /**
     * Execute generalist tools
     */
    protected async executeTool(
        toolName: string,
        input: string,
        context: AgentContext
    ): Promise<any> {
        switch (toolName) {
            case 'kb_search':
                return this.searchKnowledgeBase(input, context)

            case 'memory_recall':
                return this.recallMemories(input, context)

            case 'web_search':
                return this.searchWeb(input)

            case 'calculator':
                return this.calculate(input)

            default:
                return null
        }
    }

    /**
     * Search knowledge base
     */
    private async searchKnowledgeBase(
        query: string,
        context: AgentContext
    ): Promise<any> {
        const ragResult = await ragOrchestrator.retrieve(query, {
            orgId: context.orgId,
            userId: context.userId,
            brainConfig: context.brainConfig,
            brainTemplateId: context.brainTemplateId
        })

        return {
            found: ragResult.documents.length > 0,
            documentCount: ragResult.documents.length,
            topResults: ragResult.documents.slice(0, 3).map(doc => ({
                content: doc.content.substring(0, 300),
                score: doc.score,
                citation: doc.citation
            }))
        }
    }

    /**
     * Recall user-specific memories
     * (Placeholder - implement full memory system in Phase 6)
     */
    private async recallMemories(
        context: string,
        agentContext: AgentContext
    ): Promise<any> {
        // TODO: Implement full memory retrieval
        // For now, return structure
        return {
            memoriesFound: 0,
            recentInteractions: [],
            userPreferences: {}
        }
    }

    /**
     * Web search (placeholder - integrate with actual search API)
     */
    private async searchWeb(query: string): Promise<any> {
        // TODO: Integrate with SerpAPI, Google Custom Search, etc.
        return {
            available: false,
            message: 'Web search not yet configured',
            query
        }
    }

    /**
     * Simple calculator for math expressions
     */
    private calculate(expression: string): any {
        try {
            // Extract mathematical expression
            const mathPattern = /[\d\+\-\*\/\(\)\.\s]+/g
            const match = expression.match(mathPattern)

            if (!match) {
                return {
                    success: false,
                    error: 'No mathematical expression found'
                }
            }

            const expr = match[0].trim()

            // Safe eval using Function (limited to math operations)
            // In production, use a proper math parser like math.js
            const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '')
            const result = Function(`'use strict'; return (${sanitized})`)()

            return {
                success: true,
                expression: expr,
                result: result,
                formatted: `${expr} = ${result}`
            }
        } catch (error: any) {
            return {
                success: false,
                error: 'Invalid mathematical expression',
                message: error.message
            }
        }
    }

    /**
     * Smart tool selection for generalist queries
     */
    protected async selectTools(
        input: string,
        context: AgentContext
    ): Promise<string[]> {
        const lowerInput = input.toLowerCase()
        const selectedTools: string[] = []

        // Check if query needs knowledge base
        const needsKB = this.shouldSearchKB(lowerInput, context)
        if (needsKB) {
            selectedTools.push('kb_search')
        }

        // Check for mathematical expressions
        if (this.containsMath(input)) {
            selectedTools.push('calculator')
        }

        // Check for current events (web search)
        if (this.needsWebSearch(lowerInput)) {
            selectedTools.push('web_search')
        }

        // Use memory for personalized queries
        if (this.needsPersonalization(lowerInput)) {
            selectedTools.push('memory_recall')
        }

        return selectedTools
    }

    /**
     * Determine if query should search KB
     */
    private shouldSearchKB(input: string, context: AgentContext): boolean {
        if (!context.brainConfig.rag.enabled) return false

        // Search KB for specific questions
        const kbKeywords = [
            'what', 'who', 'when', 'where', 'why', 'how',
            'explain', 'tell me', 'describe', 'define',
            'show', 'find', 'search', 'info', 'information'
        ]

        return kbKeywords.some(keyword => input.includes(keyword))
    }

    /**
     * Detect mathematical expressions
     */
    private containsMath(input: string): boolean {
        const mathPatterns = [
            /\d+\s*[\+\-\*\/]\s*\d+/,
            /calculate|compute|solve|math/i,
            /what\s+is\s+\d+/i
        ]

        return mathPatterns.some(pattern => pattern.test(input))
    }

    /**
     * Determine if query needs web search
     */
    private needsWebSearch(input: string): boolean {
        const webKeywords = [
            'current', 'latest', 'recent', 'today', 'now',
            'news', 'update', 'happening', '2026', '2025'
        ]

        return webKeywords.some(keyword => input.includes(keyword))
    }

    /**
     * Determine if query needs personalization
     */
    private needsPersonalization(input: string): boolean {
        const personalKeywords = [
            'my', 'i', 'me', 'remember', 'last time',
            'previous', 'before', 'history'
        ]

        return personalKeywords.some(keyword => input.includes(keyword))
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const generalistAgent = new GeneralistAgent()
