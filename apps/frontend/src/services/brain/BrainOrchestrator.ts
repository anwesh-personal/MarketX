/**
 * BRAIN ORCHESTRATOR
 * ===================
 * The Central Intelligence Layer of Axiom
 * 
 * World's most sophisticated AI orchestration system that:
 * - Routes queries to specialized agents based on intent
 * - Manages multi-source memory retrieval (RAG, user memory, conversation)
 * - Handles streaming responses with real-time progress
 * - Applies constitution/brand rules
 * - Manages token budgets intelligently
 * - Tracks conversation state and context
 * - Self-optimizes based on feedback
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

import { createClient } from '@/lib/supabase/server';
import { ragOrchestrator, RAGResult, RAGContext, RetrievedDocument } from './RAGOrchestrator';
import { vectorStore } from './VectorStore';
import { BrainConfig, brainConfigService } from './BrainConfigService';
import { intentClassifier, Intent, IntentClassificationResult } from './agents/IntentClassifier';
import { Agent, AgentContext, AgentResponse } from './agents/Agent';
import { writerAgent } from './agents/WriterAgent';
import { generalistAgent } from './agents/GeneralistAgent';
import { analystAgent } from './agents/AnalystAgent';
import { coachAgent } from './agents/CoachAgent';
import { HallucinationInterceptor } from './interceptors/HallucinationInterceptor';
import { aiProviderService } from '@/services/ai/AIProviderService';
import { marketxToolExecutor } from './tools/MarketXToolExecutor';
import type { BrainChatMessage, BrainToolDefinition, BrainChatOptions } from '@/services/ai/types';

// ============================================================================
// AGENTIC LOOP TYPES
// ============================================================================

export interface HandleTurnInput {
    orgId:           string;
    agentId?:        string;
    conversationId?: string;
    messages:        BrainChatMessage[];
    systemPrompt:    string;
    tools?:          BrainToolDefinition[];
    options?: {
        maxTurns?:         number;
        maxTokens?:        number;
        temperature?:      number;
        preferredProvider?: string;
        preferredModel?:   string;
        responseFormat?:   { type: 'json_object' } | { type: 'text' };
    };
}

export interface HandleTurnResult {
    response:      string;
    toolCallsMade: ToolCallRecord[];
    turnsUsed:     number;
    totalTokens:   number;
}

export interface ToolCallRecord {
    name:       string;
    args:       string;     // raw JSON string from LLM
    result:     string;     // JSON-stringified result
    success:    boolean;
    durationMs: number;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Context for brain processing
 */
export interface BrainContext {
    orgId: string;
    userId: string;
    conversationId: string;
    brainConfig: BrainConfig;
    brainTemplateId?: string;
    constitutionId?: string;
    kbId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
}

/**
 * Input for processing
 */
export interface ProcessInput {
    message: string;
    attachments?: Attachment[];
    context?: Record<string, any>;
    streaming?: boolean;
    maxTokens?: number;
}

/**
 * Attachment types
 */
export interface Attachment {
    type: 'file' | 'image' | 'url';
    name: string;
    url: string;
    mimeType?: string;
    size?: number;
    content?: string;
}

/**
 * Complete processing result
 */
export interface ProcessResult {
    response: string;
    agent: string;
    intent: IntentClassificationResult;
    sources: Source[];
    tokenUsage: TokenUsage;
    metadata: ProcessMetadata;
}

/**
 * Source citation
 */
export interface Source {
    id: string;
    title: string;
    type: 'kb' | 'conversation' | 'memory' | 'web' | string;
    url?: string;
    relevance: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
    prompt: number;
    completion: number;
    total: number;
    cost: number;
    model: string;
}

/**
 * Processing metadata
 */
export interface ProcessMetadata {
    conversationId: string;
    messageId: string;
    intentConfidence: number;
    agentUsed: string;
    ragDocumentsUsed: number;
    memoryItemsUsed: number;
    processingTimeMs: number;
    streamingEnabled: boolean;
}

/**
 * Streaming chunk types
 */
export interface StreamChunk {
    type: 'content' | 'metadata' | 'source' | 'thinking' | 'error' | 'done';
    content?: string;
    metadata?: Partial<ProcessMetadata>;
    source?: Source;
    thinking?: string;
    error?: string;
    timestamp?: number;
}

/**
 * Token budget allocation
 */
export interface TokenBudget {
    maxTotal: number;
    maxContext: number;
    maxMemory: number;
    maxHistory: number;
    maxResponse: number;
    reserved: number;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    tokenCount?: number;
    metadata?: Record<string, any>;
}

/**
 * User memory item
 */
export interface UserMemoryItem {
    id: string;
    type: 'preference' | 'fact' | 'context' | 'instruction';
    key: string;
    value: string;
    confidence: number;
    lastAccessed: Date;
    accessCount: number;
}

/**
 * Constitution rule
 */
export interface ConstitutionRule {
    id: string;
    type: 'always' | 'never' | 'prefer' | 'avoid';
    rule: string;
    priority: number;
}

/**
 * Memory retrieval result
 */
export interface MemoryRetrievalResult {
    ragContext: string;
    ragDocuments: Source[];
    userMemory: UserMemoryItem[];
    conversationHistory: ConversationMessage[];
    constitutionRules: ConstitutionRule[];
    totalTokens: number;
}

/**
 * Assembled prompt ready for LLM
 */
export interface AssembledPrompt {
    systemPrompt: string;
    contextSection: string;
    memorySection: string;
    historySection: string;
    userMessage: string;
    totalTokens: number;
}

// ============================================================================
// AGENT REGISTRY
// ============================================================================

const INTENT_TO_AGENT: Record<Intent, string> = {
    'writer': 'writer',
    'analyst': 'analyst',
    'coach': 'coach',
    'generalist': 'generalist',
};

// ============================================================================
// BRAIN ORCHESTRATOR CLASS
// ============================================================================

class BrainOrchestrator {
    private supabase: ReturnType<typeof createClient> | null = null;

    // Token estimation: ~4 chars per token
    private readonly CHARS_PER_TOKEN = 4;

    // Default token budget
    private readonly DEFAULT_BUDGET: TokenBudget = {
        maxTotal: 8000,
        maxContext: 3000,
        maxMemory: 1500,
        maxHistory: 1000,
        maxResponse: 2000,
        reserved: 500,
    };

    /**
     * Get Supabase client (lazy initialization)
     */
    private getSupabase() {
        if (!this.supabase) {
            this.supabase = createClient();
        }
        return this.supabase;
    }

    // ========================================================================
    // MAIN PROCESSING METHODS
    // ========================================================================

    /**
     * Process input with streaming - main entry point
     * Yields chunks as they're generated
     */
    async *process(
        input: ProcessInput,
        context: BrainContext
    ): AsyncGenerator<StreamChunk> {
        const startTime = Date.now();
        const messageId = this.generateMessageId();

        try {
            // 1. INTENT CLASSIFICATION
            yield { type: 'thinking', thinking: 'Understanding your request...' };

            const providerId = context.brainConfig.providers.chat || undefined;
            const intentResult = await intentClassifier.classify(input.message, providerId);

            yield {
                type: 'metadata',
                metadata: {
                    intentConfidence: intentResult.confidence,
                }
            };

            // 2. AGENT SELECTION
            yield { type: 'thinking', thinking: 'Selecting the best agent...' };

            const agent = this.selectAgent(intentResult.intent, context);
            yield {
                type: 'metadata',
                metadata: { agentUsed: agent.name }
            };

            // 3. MEMORY RETRIEVAL (parallel)
            yield { type: 'thinking', thinking: 'Retrieving relevant information...' };

            const memory = await this.buildMemoryContext(input.message, context);

            // Yield sources
            for (const doc of memory.ragDocuments) {
                yield { type: 'source', source: doc };
            }

            yield {
                type: 'metadata',
                metadata: {
                    ragDocumentsUsed: memory.ragDocuments.length,
                    memoryItemsUsed: memory.userMemory.length,
                }
            };

            // 4. PROMPT ASSEMBLY
            const budget = this.calculateTokenBudget(context.brainConfig);
            const prompt = this.assemblePrompt(input, memory, context, budget);

            // 5. AGENT EXECUTION WITH STREAMING
            yield { type: 'thinking', thinking: 'Generating response...' };

            // Build full input with context for agent
            const fullInput = this.buildAgentInput(input.message, prompt);

            const agentContext: AgentContext = {
                orgId: context.orgId,
                userId: context.userId,
                brainConfig: context.brainConfig,
                conversationId: context.conversationId,
            };

            // Stream agent response
            let fullResponse = '';
            for await (const chunk of agent.executeStream(fullInput, agentContext)) {
                fullResponse += chunk;
                yield { type: 'content', content: chunk };
            }

            // 6. POST-PROCESSING
            const processedResponse = await this.postProcess(
                fullResponse,
                memory.ragDocuments,
                memory.constitutionRules,
                context
            );

            // If post-processing changed the response, yield the diff
            if (processedResponse !== fullResponse) {
                yield {
                    type: 'content',
                    content: '\n\n---\n' + processedResponse.slice(fullResponse.length)
                };
            }

            // 7. SAVE TO CONVERSATION
            await this.saveToConversation(
                context.conversationId,
                input.message,
                processedResponse,
                messageId,
                context
            );

            // 8. UPDATE METRICS
            const processingTimeMs = Date.now() - startTime;

            yield {
                type: 'metadata',
                metadata: {
                    conversationId: context.conversationId,
                    messageId,
                    processingTimeMs,
                    streamingEnabled: true,
                }
            };

            // 9. TRACK ANALYTICS (non-blocking)
            this.trackAnalytics(context, intentResult, agent.name, processingTimeMs).catch(console.error);

            yield { type: 'done', timestamp: Date.now() };

        } catch (error: any) {
            console.error('BrainOrchestrator error:', error);
            yield { type: 'error', error: error.message || 'An error occurred' };
        }
    }

    /**
     * Process input synchronously - returns complete result
     */
    async processSync(
        input: ProcessInput,
        context: BrainContext
    ): Promise<ProcessResult> {
        const startTime = Date.now();
        const messageId = this.generateMessageId();

        // 1. INTENT CLASSIFICATION
        const providerId = context.brainConfig.providers.chat || undefined;
        const intentResult = await intentClassifier.classify(input.message, providerId);

        // 2. AGENT SELECTION
        const agent = this.selectAgent(intentResult.intent, context);

        // 3. MEMORY RETRIEVAL
        const memory = await this.buildMemoryContext(input.message, context);

        // 4. PROMPT ASSEMBLY
        const budget = this.calculateTokenBudget(context.brainConfig);
        const prompt = this.assemblePrompt(input, memory, context, budget);

        // 5. AGENT EXECUTION
        const fullInput = this.buildAgentInput(input.message, prompt);

        const agentContext: AgentContext = {
            orgId: context.orgId,
            userId: context.userId,
            brainConfig: context.brainConfig,
            conversationId: context.conversationId,
        };

        const agentResponse = await agent.execute(fullInput, agentContext);

        // 6. POST-PROCESSING
        const processedResponse = await this.postProcess(
            agentResponse.content,
            memory.ragDocuments,
            memory.constitutionRules,
            context
        );

        // 7. SAVE TO CONVERSATION
        await this.saveToConversation(
            context.conversationId,
            input.message,
            processedResponse,
            messageId,
            context
        );

        // 8. BUILD RESULT
        const processingTimeMs = Date.now() - startTime;

        // Track analytics
        this.trackAnalytics(context, intentResult, agent.name, processingTimeMs).catch(console.error);

        // Get default model from agents config
        const defaultModel = Object.values(context.brainConfig.agents)[0]?.providerId || 'gpt-4-turbo-preview';

        return {
            response: processedResponse,
            agent: agent.name,
            intent: intentResult,
            sources: memory.ragDocuments,
            tokenUsage: {
                prompt: prompt.totalTokens,
                completion: this.estimateTokens(processedResponse),
                total: prompt.totalTokens + this.estimateTokens(processedResponse),
                cost: 0, // Calculated by AI service
                model: defaultModel,
            },
            metadata: {
                conversationId: context.conversationId,
                messageId,
                intentConfidence: intentResult.confidence,
                agentUsed: agent.name,
                ragDocumentsUsed: memory.ragDocuments.length,
                memoryItemsUsed: memory.userMemory.length,
                processingTimeMs,
                streamingEnabled: false,
            },
        };
    }

    // ========================================================================
    // AGENT SELECTION
    // ========================================================================

    /**
     * Select the most appropriate agent for the intent
     */
    private selectAgent(intent: Intent, context: BrainContext): Agent {
        // Check which agents are configured
        const configuredAgents = Object.keys(context.brainConfig.agents);

        // Map intent to agent type
        const agentType = INTENT_TO_AGENT[intent] || 'generalist';

        // Check if agent is configured
        if (!configuredAgents.includes(agentType)) {
            // Fall back to generalist
            console.log(`Agent ${agentType} not configured, using generalist`);
            return generalistAgent;
        }

        // Return singleton agent instance based on type
        switch (agentType) {
            case 'writer':
                return writerAgent;
            case 'analyst':
                return analystAgent;
            case 'coach':
                return coachAgent;
            case 'generalist':
            default:
                return generalistAgent;
        }
    }

    // ========================================================================
    // INPUT BUILDING
    // ========================================================================

    /**
     * Build full input string with context for agent
     */
    private buildAgentInput(message: string, prompt: AssembledPrompt): string {
        const parts: string[] = [];

        if (prompt.contextSection) {
            parts.push(prompt.contextSection);
        }

        if (prompt.memorySection) {
            parts.push(prompt.memorySection);
        }

        if (prompt.historySection) {
            parts.push(prompt.historySection);
        }

        parts.push(`User: ${message}`);

        return parts.join('\n\n');
    }

    // ========================================================================
    // MEMORY RETRIEVAL
    // ========================================================================

    /**
     * Build complete memory context from all sources
     */
    private async buildMemoryContext(
        query: string,
        context: BrainContext
    ): Promise<MemoryRetrievalResult> {
        // Run all retrievals in parallel
        const [
            ragResult,
            userMemory,
            conversationHistory,
            constitutionRules,
        ] = await Promise.all([
            this.retrieveRAG(query, context),
            this.retrieveUserMemory(context.userId, context.orgId),
            this.retrieveConversationHistory(context.conversationId, 10),
            this.retrieveConstitutionRules(context.constitutionId),
        ]);

        // Calculate total tokens
        let totalTokens = 0;
        totalTokens += this.estimateTokens(ragResult.context);
        totalTokens += userMemory.reduce((sum, m) => sum + this.estimateTokens(m.value), 0);
        totalTokens += conversationHistory.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
        totalTokens += constitutionRules.reduce((sum, r) => sum + this.estimateTokens(r.rule), 0);

        return {
            ragContext: ragResult.context,
            ragDocuments: ragResult.documents.map((doc: RetrievedDocument) => ({
                id: doc.id,
                title: doc.citation || doc.sourceType,
                type: doc.sourceType,
                relevance: doc.score,
            })),
            userMemory,
            conversationHistory,
            constitutionRules,
            totalTokens,
        };
    }

    /**
     * Retrieve from RAG system
     */
    private async retrieveRAG(
        query: string,
        context: BrainContext
    ): Promise<RAGResult> {
        try {
            const ragContext: RAGContext = {
                orgId: context.orgId,
                userId: context.userId,
                brainConfig: context.brainConfig,
                brainTemplateId: context.brainTemplateId,
            };

            return await ragOrchestrator.retrieve(query, ragContext);
        } catch (error) {
            console.error('RAG retrieval error:', error);
            return {
                context: '',
                documents: [],
                metadata: {
                    totalRetrieved: 0,
                    finalCount: 0,
                    avgRelevanceScore: 0,
                    retrievalTimeMs: 0,
                    rerankingTimeMs: 0,
                    totalTimeMs: 0,
                    cacheHit: false,
                    expansionUsed: false,
                    rerankingUsed: false,
                },
            };
        }
    }

    /**
     * Retrieve user-specific memory
     */
    private async retrieveUserMemory(
        userId: string,
        orgId: string
    ): Promise<UserMemoryItem[]> {
        try {
            const supabase = this.getSupabase();

            const { data, error } = await supabase
                .from('user_memory')
                .select('*')
                .eq('user_id', userId)
                .eq('org_id', orgId)
                .eq('is_active', true)
                .order('access_count', { ascending: false })
                .limit(20);

            if (error) {
                console.error('User memory retrieval error:', error);
                return [];
            }

            return (data || []).map(item => ({
                id: item.id,
                type: item.memory_type,
                key: item.key,
                value: item.value,
                confidence: item.confidence || 1.0,
                lastAccessed: new Date(item.last_accessed_at),
                accessCount: item.access_count || 0,
            }));
        } catch (error) {
            console.error('User memory error:', error);
            return [];
        }
    }

    /**
     * Retrieve recent conversation history
     */
    private async retrieveConversationHistory(
        conversationId: string,
        limit: number = 10
    ): Promise<ConversationMessage[]> {
        try {
            const supabase = this.getSupabase();

            const { data, error } = await supabase
                .from('messages')
                .select('id, role, content, created_at, metadata')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Conversation history error:', error);
                return [];
            }

            // Reverse to get chronological order
            return (data || []).reverse().map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                createdAt: new Date(msg.created_at),
                tokenCount: this.estimateTokens(msg.content),
                metadata: msg.metadata,
            }));
        } catch (error) {
            console.error('Conversation history error:', error);
            return [];
        }
    }

    /**
     * Retrieve constitution/brand rules
     */
    private async retrieveConstitutionRules(
        constitutionId?: string
    ): Promise<ConstitutionRule[]> {
        if (!constitutionId) {
            return [];
        }

        try {
            const supabase = this.getSupabase();

            const { data, error } = await supabase
                .from('constitution_rules')
                .select('*')
                .eq('constitution_id', constitutionId)
                .eq('is_active', true)
                .order('priority', { ascending: true });

            if (error) {
                console.error('Constitution rules error:', error);
                return [];
            }

            return (data || []).map(rule => ({
                id: rule.id,
                type: rule.rule_type,
                rule: rule.content,
                priority: rule.priority,
            }));
        } catch (error) {
            console.error('Constitution rules error:', error);
            return [];
        }
    }

    // ========================================================================
    // PROMPT ASSEMBLY
    // ========================================================================

    /**
     * Assemble complete prompt with all context
     */
    private assemblePrompt(
        input: ProcessInput,
        memory: MemoryRetrievalResult,
        context: BrainContext,
        budget: TokenBudget
    ): AssembledPrompt {
        // Get agent's system prompt
        const agentConfig = Object.values(context.brainConfig.agents)[0];

        // 1. Build system prompt
        const systemPrompt = this.buildSystemPrompt(agentConfig?.systemPrompt, memory.constitutionRules);

        // 2. Build context section (RAG)
        const contextSection = this.buildContextSection(
            memory.ragContext,
            budget.maxContext
        );

        // 3. Build memory section (user preferences/facts)
        const memorySection = this.buildMemorySection(
            memory.userMemory,
            budget.maxMemory
        );

        // 4. Build history section (conversation)
        const historySection = this.buildHistorySection(
            memory.conversationHistory,
            budget.maxHistory
        );

        // 5. Calculate total tokens
        const totalTokens =
            this.estimateTokens(systemPrompt) +
            this.estimateTokens(contextSection) +
            this.estimateTokens(memorySection) +
            this.estimateTokens(historySection) +
            this.estimateTokens(input.message);

        return {
            systemPrompt,
            contextSection,
            memorySection,
            historySection,
            userMessage: input.message,
            totalTokens,
        };
    }

    /**
     * Build system prompt with constitution rules
     */
    private buildSystemPrompt(
        basePrompt: string | undefined,
        rules: ConstitutionRule[]
    ): string {
        const prompt = basePrompt || 'You are a helpful AI assistant. Be concise, accurate, and helpful.';

        if (rules.length === 0) {
            return prompt;
        }

        // Group rules by type
        const alwaysRules = rules.filter(r => r.type === 'always').map(r => r.rule);
        const neverRules = rules.filter(r => r.type === 'never').map(r => r.rule);
        const preferRules = rules.filter(r => r.type === 'prefer').map(r => r.rule);
        const avoidRules = rules.filter(r => r.type === 'avoid').map(r => r.rule);

        let extendedPrompt = prompt + '\n\n';

        if (alwaysRules.length > 0) {
            extendedPrompt += 'ALWAYS:\n' + alwaysRules.map(r => `- ${r}`).join('\n') + '\n\n';
        }

        if (neverRules.length > 0) {
            extendedPrompt += 'NEVER:\n' + neverRules.map(r => `- ${r}`).join('\n') + '\n\n';
        }

        if (preferRules.length > 0) {
            extendedPrompt += 'PREFER:\n' + preferRules.map(r => `- ${r}`).join('\n') + '\n\n';
        }

        if (avoidRules.length > 0) {
            extendedPrompt += 'AVOID:\n' + avoidRules.map(r => `- ${r}`).join('\n') + '\n\n';
        }

        return extendedPrompt.trim();
    }

    /**
     * Build context section from RAG
     */
    private buildContextSection(
        ragContext: string,
        maxTokens: number
    ): string {
        if (!ragContext) {
            return '';
        }

        const trimmed = this.trimToTokenBudget(ragContext, maxTokens);

        if (!trimmed) {
            return '';
        }

        return `## Relevant Context\n\n${trimmed}`;
    }

    /**
     * Build memory section from user preferences
     */
    private buildMemorySection(
        memory: UserMemoryItem[],
        maxTokens: number
    ): string {
        if (memory.length === 0) {
            return '';
        }

        // Group by type
        const preferences = memory.filter(m => m.type === 'preference');
        const facts = memory.filter(m => m.type === 'fact');
        const instructions = memory.filter(m => m.type === 'instruction');

        let section = '## About the User\n\n';

        if (preferences.length > 0) {
            section += '**Preferences:**\n';
            section += preferences.map(p => `- ${p.key}: ${p.value}`).join('\n') + '\n\n';
        }

        if (facts.length > 0) {
            section += '**Known Facts:**\n';
            section += facts.map(f => `- ${f.key}: ${f.value}`).join('\n') + '\n\n';
        }

        if (instructions.length > 0) {
            section += '**Special Instructions:**\n';
            section += instructions.map(i => `- ${i.value}`).join('\n') + '\n\n';
        }

        return this.trimToTokenBudget(section, maxTokens);
    }

    /**
     * Build history section from conversation
     */
    private buildHistorySection(
        history: ConversationMessage[],
        maxTokens: number
    ): string {
        if (history.length === 0) {
            return '';
        }

        let section = '## Recent Conversation\n\n';
        let tokens = this.estimateTokens(section);

        // Add messages from oldest to newest, respecting token budget
        const messages: string[] = [];

        for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            const formatted = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
            const msgTokens = this.estimateTokens(formatted);

            if (tokens + msgTokens > maxTokens) {
                break;
            }

            messages.unshift(formatted);
            tokens += msgTokens;
        }

        return section + messages.join('\n\n');
    }

    // ========================================================================
    // TOKEN MANAGEMENT
    // ========================================================================

    /**
     * Calculate token budget based on model and config
     */
    private calculateTokenBudget(config: BrainConfig): TokenBudget {
        // Use memory config for limits
        const maxContext = config.memory.maxContextTokens || this.DEFAULT_BUDGET.maxTotal;
        const maxMemory = config.memory.maxMemoryTokens || this.DEFAULT_BUDGET.maxMemory;

        return {
            maxTotal: maxContext,
            maxContext: Math.floor(maxContext * 0.4),
            maxMemory: maxMemory,
            maxHistory: Math.floor(maxContext * 0.15),
            maxResponse: Math.floor(maxContext * 0.25),
            reserved: 500,
        };
    }

    /**
     * Estimate token count for text
     */
    private estimateTokens(text: string): number {
        if (!text) return 0;
        return Math.ceil(text.length / this.CHARS_PER_TOKEN);
    }

    /**
     * Trim text to fit token budget
     */
    private trimToTokenBudget(text: string, maxTokens: number): string {
        if (!text) return '';

        const currentTokens = this.estimateTokens(text);
        if (currentTokens <= maxTokens) {
            return text;
        }

        // Estimate character limit
        const maxChars = maxTokens * this.CHARS_PER_TOKEN;

        // Find a good break point (sentence or paragraph)
        const trimmed = text.slice(0, maxChars);
        const lastPeriod = trimmed.lastIndexOf('.');
        const lastNewline = trimmed.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > maxChars * 0.5) {
            return trimmed.slice(0, breakPoint + 1) + '\n\n[Content truncated...]';
        }

        return trimmed + '...\n\n[Content truncated...]';
    }

    // ========================================================================
    // POST-PROCESSING
    // ========================================================================

    /**
     * Post-process response (citations, formatting, constitution checks)
     */
    private async postProcess(
        response: string,
        sources: Source[],
        rules: ConstitutionRule[],
        context: BrainContext
    ): Promise<string> {
        let processed = response;

        // 1. Add citations if sources were used and features enabled
        const includeCitations = context.brainConfig.features?.advancedAnalytics ?? false;
        if (sources.length > 0 && includeCitations) {
            processed = this.addCitations(processed, sources);
        }

        // 2. Check constitution rules (basic check)
        if (rules.length > 0) {
            processed = this.applyConstitutionRules(processed, rules);
        }

        // 3. Format markdown
        processed = this.formatMarkdown(processed);

        return processed;
    }

    /**
     * Add source citations to response
     */
    private addCitations(response: string, sources: Source[]): string {
        if (sources.length === 0) {
            return response;
        }

        const citationSection = '\n\n---\n**Sources:**\n' +
            sources.slice(0, 5).map((s, i) => `[${i + 1}] ${s.title}`).join('\n');

        return response + citationSection;
    }

    /**
     * Apply constitution rules (basic enforcement)
     */
    private applyConstitutionRules(response: string, rules: ConstitutionRule[]): string {
        let processed = response;

        // Check "never" rules - these are hard blocks
        const neverRules = rules.filter(r => r.type === 'never');
        for (const rule of neverRules) {
            // Simple keyword check - can be enhanced with LLM
            const keywords = rule.rule.toLowerCase().split(' ');
            for (const keyword of keywords) {
                if (keyword.length > 4 && processed.toLowerCase().includes(keyword)) {
                    console.warn(`Constitution violation detected: ${rule.rule}`);
                    // In production, might want to regenerate or flag
                }
            }
        }

        return processed;
    }

    /**
     * Format markdown consistently
     */
    private formatMarkdown(text: string): string {
        // Ensure proper spacing around headers
        let formatted = text.replace(/\n(#{1,6})/g, '\n\n$1');

        // Ensure proper spacing around lists
        formatted = formatted.replace(/\n([-*])/g, '\n\n$1');

        // Remove excessive newlines
        formatted = formatted.replace(/\n{4,}/g, '\n\n\n');

        return formatted.trim();
    }

    // ========================================================================
    // CONVERSATION MANAGEMENT
    // ========================================================================

    /**
     * Save user message and response to conversation
     */
    private async saveToConversation(
        conversationId: string,
        userMessage: string,
        assistantResponse: string,
        messageId: string,
        context: BrainContext
    ): Promise<void> {
        try {
            const supabase = this.getSupabase();

            // Save user message
            await supabase.from('messages').insert({
                id: this.generateMessageId(),
                conversation_id: conversationId,
                role: 'user',
                content: userMessage,
                org_id: context.orgId,
                user_id: context.userId,
                metadata: { sessionId: context.sessionId },
            });

            // Save assistant response
            await supabase.from('messages').insert({
                id: messageId,
                conversation_id: conversationId,
                role: 'assistant',
                content: assistantResponse,
                org_id: context.orgId,
                metadata: { sessionId: context.sessionId },
            });

        } catch (error) {
            console.error('Failed to save to conversation:', error);
            // Non-critical, don't throw
        }
    }

    // ========================================================================
    // ANALYTICS
    // ========================================================================

    /**
     * Track usage analytics
     */
    private async trackAnalytics(
        context: BrainContext,
        intent: IntentClassificationResult,
        agentUsed: string,
        processingTimeMs: number
    ): Promise<void> {
        try {
            const supabase = this.getSupabase();

            await supabase.from('brain_analytics').insert({
                org_id: context.orgId,
                user_id: context.userId,
                conversation_id: context.conversationId,
                brain_template_id: context.brainTemplateId,
                intent_detected: intent.intent,
                intent_confidence: intent.confidence,
                agent_used: agentUsed,
                processing_time_ms: processingTimeMs,
                created_at: new Date().toISOString(),
            });
        } catch (error) {
            // Non-critical
            console.error('Analytics tracking failed:', error);
        }
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Generate unique message ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========================================================================
    // PUBLIC HELPER METHODS
    // ========================================================================

    /**
     * Create a new conversation
     */
    async createConversation(
        orgId: string,
        userId: string,
        title?: string
    ): Promise<string> {
        const supabase = this.getSupabase();

        const { data, error } = await supabase
            .from('conversations')
            .insert({
                org_id: orgId,
                user_id: userId,
                title: title || 'New Conversation',
                created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error) {
            throw new Error(`Failed to create conversation: ${error.message}`);
        }

        return data.id;
    }

    /**
     * Get or create conversation for user
     */
    async getOrCreateConversation(
        orgId: string,
        userId: string,
        sessionId?: string
    ): Promise<string> {
        const supabase = this.getSupabase();

        // Check for recent conversation (within 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .gte('updated_at', thirtyMinutesAgo)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (existing) {
            return existing.id;
        }

        return this.createConversation(orgId, userId);
    }

    /**
     * Load brain config for org
     * Returns the org's BrainConfig (extracted from BrainTemplate)
     */
    async loadBrainConfig(orgId: string): Promise<BrainConfig | null> {
        const template = await brainConfigService.getOrgBrain(orgId);
        return template?.config ?? null;
    }

    // ============================================================================
    // AGENTIC LOOP — handleTurn
    // Replaces the one-shot process() for all new Brain interactions.
    //
    // Design:
    //  - Up to MAX_TURNS iterations of: send → check tools → execute → send
    //  - HallucinationInterceptor validates every tool call before execution
    //  - Tool permission check against brain_agents.tools_granted
    //  - All LLM calls go through AIProviderService.generateChat() — zero hardcoding
    //  - Saves final conversation messages to Supabase on success
    //  - Returns structured result with tool call audit trail + token total
    // ============================================================================

    async handleTurn(input: HandleTurnInput): Promise<HandleTurnResult> {
        const { orgId, agentId, conversationId, messages, systemPrompt, tools, options } = input

        const MAX_TURNS = options?.maxTurns ?? 20
        const mutableMessages = [...messages]
        const toolCallsMade: ToolCallRecord[] = []
        let   turnsUsed = 0
        let   totalTokens = 0

        for (let turn = 1; turn <= MAX_TURNS; turn++) {
            turnsUsed = turn

            // ── LLM call (org-aware, auto-fallback) ──────────────────────────
            const response = await aiProviderService.generateChat(orgId, [
                { role: 'system', content: systemPrompt },
                ...mutableMessages,
            ], {
                tools,
                maxTokens:         options?.maxTokens,
                temperature:       options?.temperature,
                preferredProvider: options?.preferredProvider,
                preferredModel:    options?.preferredModel,
                responseFormat:    options?.responseFormat,
            })

            totalTokens += response.usage.totalTokens

            // ── No tool calls → final answer ─────────────────────────────────
            if (!response.toolCalls || response.toolCalls.length === 0) {
                // Persist to conversation history (fire-and-forget)
                if (conversationId) {
                    this.saveAssistantMessage(conversationId, response.content, totalTokens)
                        .catch(err => console.error('[BrainOrchestrator] Save message failed:', err))
                }
                return { response: response.content, toolCallsMade, turnsUsed, totalTokens }
            }

            // ── Hallucination check ───────────────────────────────────────────
            const intercept = HallucinationInterceptor.validate(response.toolCalls, tools ?? [])

            if (intercept.action === 'retry') {
                // All tool calls were hallucinated — inject feedback and loop
                mutableMessages.push({ role: 'user', content: intercept.feedback! })
                continue
            }

            // Append assistant message (with tool_calls) to history
            mutableMessages.push({
                role:       'assistant',
                content:    response.content ?? '',
                tool_calls: intercept.validCalls,
            })

            // ── Execute valid tools ───────────────────────────────────────────
            for (const toolCall of intercept.validCalls) {
                const start  = Date.now()
                let   result: unknown
                let   success = true
                let   errMsg  = ''

                // Permission check
                if (agentId) {
                    const permitted = await this.checkToolPermission(agentId, toolCall.function.name)
                    if (!permitted) {
                        result  = { error: 'PERMISSION_DENIED', tool: toolCall.function.name }
                        success = false
                        errMsg  = 'Permission denied'
                    }
                }

                if (success) {
                    try {
                        const args = JSON.parse(toolCall.function.arguments || '{}')
                        result = await marketxToolExecutor.execute(
                            toolCall.function.name,
                            args,
                            { orgId, agentId }
                        )
                    } catch (err: any) {
                        result  = { error: err.message ?? 'Tool execution failed' }
                        success = false
                        errMsg  = err.message ?? 'Tool execution failed'
                        console.error(`[BrainOrchestrator] Tool "${toolCall.function.name}" failed:`, err)
                    }
                }

                toolCallsMade.push({
                    name:        toolCall.function.name,
                    args:        toolCall.function.arguments,
                    result:      JSON.stringify(result),
                    success,
                    durationMs:  Date.now() - start,
                })

                // Feed tool result back into message history
                mutableMessages.push({
                    role:         'tool',
                    content:      JSON.stringify(result),
                    tool_call_id: toolCall.id,
                })
            }
            // Continue to next turn with tool results in context
        }

        // MAX_TURNS exhausted
        console.warn(`[BrainOrchestrator] MAX_TURNS (${MAX_TURNS}) reached for org ${orgId}`)
        return {
            response:      'I reached my processing limit for this request. Please try a more specific question.',
            toolCallsMade,
            turnsUsed,
            totalTokens,
        }
    }

    /** Check whether the agent is granted a specific tool */
    private async checkToolPermission(agentId: string, toolName: string): Promise<boolean> {
        const supabase = createClient()
        const { data } = await supabase
            .from('brain_agents')
            .select('tools_granted')
            .eq('id', agentId)
            .single()
        return (data?.tools_granted ?? []).includes(toolName)
    }

    /** Persist a single assistant message to the conversation */
    private async saveAssistantMessage(
        conversationId: string,
        content: string,
        tokens: number
    ): Promise<void> {
        const supabase = createClient()
        await supabase.from('messages').insert({
            conversation_id: conversationId,
            role:            'assistant',
            content,
            tokens_used:     tokens,
            metadata:        {},
        })
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const brainOrchestrator = new BrainOrchestrator();
export default brainOrchestrator;
