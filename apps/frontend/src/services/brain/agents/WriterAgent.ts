import { Agent, AgentConfig, AgentContext } from './Agent'
import { ragOrchestrator } from '../RAGOrchestrator'

// ============================================================
// WRITER AGENT
// ============================================================

export class WriterAgent extends Agent {
    name = 'Writer Agent'
    agentType = 'writer'

    config: AgentConfig = {
        systemPrompt: `You are an expert content writer with access to the knowledge base. Your task is to create engaging, well-structured content based on user requirements and available context.

Guidelines:
- **Always cite sources** when using information from the knowledge base ([1], [2], etc.)
- **Maintain consistent tone** and style appropriate to the content type
- **Structure content clearly** with headings, subheadings, and logical flow
- **Optimize for readability** using short paragraphs, bullet points, and clear language
- **Include relevant examples** to illustrate key points
- **Proofread for grammar** and clarity

Content Types You Excel At:
- Blog posts and articles
- Marketing copy and landing pages
- Technical documentation
- Social media content
- Email campaigns
- Product descriptions
- Case studies and whitepapers`,
        temperature: 0.8, // Higher for creativity
        maxTokens: 4000,  // Allow long-form content
        tools: ['kb_search', 'content_outline', 'style_analysis', 'grammar_check']
    }

    /**
     * Check if this agent can handle the user's intent
     */
    canHandle(intent: string): boolean {
        const writerKeywords = [
            'write', 'create', 'draft', 'compose', 'blog', 'article',
            'content', 'copy', 'post', 'email', 'description',
            'whitepaper', 'case study', 'documentation', 'guide'
        ]

        const lowerIntent = intent.toLowerCase()
        return writerKeywords.some(keyword => lowerIntent.includes(keyword))
    }

    /**
     * Execute writing-specific tools
     */
    protected async executeTool(
        toolName: string,
        input: string,
        context: AgentContext
    ): Promise<any> {
        switch (toolName) {
            case 'kb_search':
                return this.searchKnowledgeBase(input, context)

            case 'content_outline':
                return this.generateOutline(input, context)

            case 'style_analysis':
                return this.analyzeStyle(input)

            case 'grammar_check':
                return this.checkGrammar(input)

            default:
                console.warn(`Unknown tool: ${toolName}`)
                return null
        }
    }

    /**
   * Search knowledge base for relevant content
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
            documentsFound: ragResult.documents.length,
            documents: ragResult.documents.slice(0, 5).map(doc => ({
                content: doc.content.substring(0, 500) + '...',
                score: doc.score,
                citation: doc.citation
            })),
            context: ragResult.context
        }
    }

    /**
     * Generate content outline using LLM
     */
    private async generateOutline(
        topic: string,
        context: AgentContext
    ): Promise<any> {
        try {
            const provider = await this.getProvider(context)

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.api_key}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-turbo-preview',
                    messages: [{
                        role: 'system',
                        content: 'You are a content strategist. Generate a detailed outline for the given topic with main sections and key points. Format as a structured list.'
                    }, {
                        role: 'user',
                        content: `Topic: ${topic}`
                    }],
                    temperature: 0.7,
                    max_tokens: 800
                })
            })

            if (!response.ok) {
                throw new Error('Outline generation failed')
            }

            const result = await response.json()
            const outlineText = result.choices[0].message.content

            // Parse outline into sections
            const sections = outlineText
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.trim())

            return {
                outline: sections,
                rawOutline: outlineText
            }
        } catch (error) {
            console.error('Outline generation failed:', error)
            return {
                outline: [],
                error: 'Failed to generate outline'
            }
        }
    }

    /**
     * Analyze writing style
     */
    private analyzeStyle(text: string): any {
        // Calculate readability metrics
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
        const words = text.split(/\s+/).filter(w => w.length > 0)
        const characters = text.replace(/\s/g, '').length

        const avgWordsPerSentence = words.length / sentences.length
        const avgCharsPerWord = characters / words.length

        // Flesch Reading Ease (simplified)
        const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * (characters / words.length)

        // Determine readability level
        let readability = 'Very Difficult'
        if (fleschScore >= 90) readability = 'Very Easy'
        else if (fleschScore >= 80) readability = 'Easy'
        else if (fleschScore >= 70) readability = 'Fairly Easy'
        else if (fleschScore >= 60) readability = 'Standard'
        else if (fleschScore >= 50) readability = 'Fairly Difficult'
        else if (fleschScore >= 30) readability = 'Difficult'

        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            characterCount: characters,
            avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
            avgCharsPerWord: Math.round(avgCharsPerWord * 10) / 10,
            fleschReadingEase: Math.round(fleschScore),
            readabilityLevel: readability,
            recommendations: this.getStyleRecommendations(avgWordsPerSentence, avgCharsPerWord)
        }
    }

    /**
     * Get style improvement recommendations
     */
    private getStyleRecommendations(avgWordsPerSentence: number, avgCharsPerWord: number): string[] {
        const recommendations: string[] = []

        if (avgWordsPerSentence > 25) {
            recommendations.push('Consider breaking up long sentences for better readability')
        }

        if (avgWordsPerSentence < 10) {
            recommendations.push('Vary sentence length to improve flow')
        }

        if (avgCharsPerWord > 6) {
            recommendations.push('Use simpler words where possible to improve accessibility')
        }

        if (recommendations.length === 0) {
            recommendations.push('Style looks good! Keep up the clear writing.')
        }

        return recommendations
    }

    /**
     * Check grammar (simplified - in production integrate with real grammar API)
     */
    private checkGrammar(text: string): any {
        // Basic checks
        const issues: any[] = []

        // Check for common issues
        const commonMistakes = [
            { pattern: /\btheir\s+is\b/gi, suggestion: 'there is' },
            { pattern: /\bits\s+a\b/gi, suggestion: "it's a" },
            { pattern: /\bcould\s+of\b/gi, suggestion: 'could have' },
            { pattern: /\bshould\s+of\b/gi, suggestion: 'should have' },
            { pattern: /\bwould\s+of\b/gi, suggestion: 'would have' }
        ]

        commonMistakes.forEach(mistake => {
            const matches = text.match(mistake.pattern)
            if (matches) {
                issues.push({
                    issue: matches[0],
                    suggestion: mistake.suggestion,
                    type: 'grammar'
                })
            }
        })

        // Check for passive voice (simplified)
        const passivePattern = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi
        const passiveMatches = text.match(passivePattern)
        if (passiveMatches && passiveMatches.length > 5) {
            issues.push({
                issue: 'Frequent passive voice',
                suggestion: 'Consider using more active voice for clarity',
                type: 'style'
            })
        }

        return {
            issuesFound: issues.length,
            issues: issues.slice(0, 10), // Top 10
            summary: issues.length === 0
                ? 'No major grammar issues detected'
                : `Found ${issues.length} potential issue(s)`
        }
    }

    /**
     * Smart tool selection for writing tasks
     */
    protected async selectTools(
        input: string,
        context: AgentContext
    ): Promise<string[]> {
        const lowerInput = input.toLowerCase()
        const selectedTools: string[] = []

        // Always search KB if available and RAG is enabled
        if (context.brainConfig.rag.enabled) {
            selectedTools.push('kb_search')
        }

        // Use outline tool for longer content requests
        if (lowerInput.includes('article') ||
            lowerInput.includes('blog') ||
            lowerInput.includes('guide') ||
            lowerInput.includes('whitepaper')) {
            selectedTools.push('content_outline')
        }

        // Use style analysis if user mentions analysis or review
        if (lowerInput.includes('analyze') ||
            lowerInput.includes('review') ||
            lowerInput.includes('improve')) {
            selectedTools.push('style_analysis')
        }

        // Use grammar check if explicitly requested or for final drafts
        if (lowerInput.includes('grammar') ||
            lowerInput.includes('proofread') ||
            lowerInput.includes('final')) {
            selectedTools.push('grammar_check')
        }

        return selectedTools
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const writerAgent = new WriterAgent()
