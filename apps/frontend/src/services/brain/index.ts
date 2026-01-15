// ============================================================
// AXIOM BRAIN - SERVICE INDEX
// Central export hub for all brain services
// ============================================================

// ============================================================
// CORE SERVICES
// ============================================================

export { brainConfigService } from './BrainConfigService'
export { vectorStore } from './VectorStore'
export { TextChunker } from './TextChunker'
export { ragOrchestrator } from './RAGOrchestrator'

// ============================================================
// AGENTS
// ============================================================

export { Agent } from './agents/Agent'
export { writerAgent } from './agents/WriterAgent'
export { generalistAgent } from './agents/GeneralistAgent'
export { intentClassifier } from './agents/IntentClassifier'

// Add more agents as they're created:
// export { analystAgent } from './agents/AnalystAgent'
// export { coachAgent } from './agents/CoachAgent'

// ============================================================
// TYPE EXPORTS
// ============================================================

// Brain Configuration
export type {
    BrainConfig,
    AgentConfig as BrainAgentConfig,
    RAGConfig,
    MemoryConfig,
    LimitsConfig,
    FeaturesConfig,
    BrainTemplate,
    OrgBrainAssignment,
    BrainVersionHistory,
    BrainRequestLog,
    BrainPerformanceMetrics
} from './BrainConfigService'

// Vector Store
export type {
    EmbeddingDocument,
    SearchResult,
    SearchOptions,
    VectorSearchOptions,
    EmbeddingStats
} from './VectorStore'

// Text Chunker
export type {
    Chunk,
    ChunkingOptions
} from './TextChunker'

// RAG Orchestrator
export type {
    RAGContext,
    RAGResult,
    RetrievedDocument,
    QueryExpansion
} from './RAGOrchestrator'

// Agents
export type {
    AgentConfig,
    AgentContext,
    AgentResponse,
    ToolExecution,
    ChatMessage
} from './agents/Agent'

// Intent Classification
export type {
    Intent,
    IntentClassificationResult
} from './agents/IntentClassifier'

// ============================================================
// BRAIN SYSTEM - UNIFIED API
// ============================================================

import { brainConfigService } from './BrainConfigService'
import { vectorStore } from './VectorStore'
import { TextChunker } from './TextChunker'
import { ragOrchestrator } from './RAGOrchestrator'
import { writerAgent } from './agents/WriterAgent'
import { generalistAgent } from './agents/GeneralistAgent'
import { intentClassifier } from './agents/IntentClassifier'

/**
 * Unified Brain System API
 * Provides clean, organized access to all brain services
 */
export const brain = {
    // Configuration management
    config: brainConfigService,

    // Vector & embeddings
    vector: vectorStore,

    // Text processing
    chunker: TextChunker,

    // RAG orchestration
    rag: ragOrchestrator,

    // Intent classification
    classify: intentClassifier,

    // Available agents
    agents: {
        writer: writerAgent,
        generalist: generalistAgent,
        // analyst: analystAgent,
        // coach: coachAgent,
    },

    // System metadata
    version: '1.0.0',
    name: 'Axiom Brain',

    // Feature flags
    features: {
        multiAgent: true,
        ragEnabled: true,
        queryExpansion: true,
        reranking: true,
        streaming: true,
        caching: true,
        toolExecution: true,
        performanceTracking: true
    }
}

// ============================================================
// USAGE EXAMPLES
// ============================================================

/**
 * Example 1: Simple chat interaction
 * 
 * import { brain } from '@/services/brain'
 * 
 * // Get org's brain configuration
 * const brainConfig = await brain.config.getOrgBrain(orgId)
 * 
 * // Execute a query
 * const response = await brain.agents.writer.execute(
 *   "Write a blog post about AI",
 *   { orgId, userId, conversationId, brainConfig }
 * )
 */

/**
 * Example 2: RAG retrieval
 * 
 * import { brain } from '@/services/brain'
 * 
 * // Retrieve relevant context
 * const result = await brain.rag.retrieve(
 *   "What is machine learning?",
 *   { orgId, userId, brainConfig }
 * )
 * 
 * console.log(result.context) // Formatted context with citations
 * console.log(result.documents) // Retrieved documents
 * console.log(result.metadata) // Performance metrics
 */

/**
 * Example 3: Intent classification
 * 
 * import { brain } from '@/services/brain'
 * 
 * const classification = await brain.classify.classify(
 *   "Write a report on Q4 sales",
 *   providerId
 * )
 * 
 * console.log(classification.intent) // 'analyst'
 * console.log(classification.confidence) // 0.92
 */

/**
 * Example 4: Vector search
 * 
 * import { brain } from '@/services/brain'
 * 
 * const results = await brain.vector.search(
 *   "AI applications",
 *   { orgId, topK: 5 },
 *   providerId
 * )
 */

/**
 * Example 5: Text chunking
 * 
 * import { brain } from '@/services/brain'
 * 
 * const chunks = brain.chunker.chunk(longText, {
 *   maxChunkSize: 1000,
 *   chunkOverlap: 200,
 *   respectSentences: true
 * })
 */
