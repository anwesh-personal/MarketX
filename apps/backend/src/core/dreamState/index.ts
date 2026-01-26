/**
 * DREAM STATE - MODULE INDEX
 * ===========================
 * Central export for the Dream State background processing system.
 */

// Main Orchestrator
export {
    DreamStateOrchestrator,
    initializeDreamState,
    getDreamState
} from './DreamStateOrchestrator';

// Types
export type {
    DreamSchedule,
    DreamJobType,
    DreamJobStatus,
    DreamJob,
    DreamJobResult,
    DreamInsightType,
    DreamInsight,
    DreamCycle,
    DreamCycleSummary,
    MemoryConsolidationConfig,
    MemoryPair,
    ConsolidationResult,
    EmbeddingOptimizationConfig,
    OptimizationResult,
    PatternConfig,
    QueryPattern,
    PatternResult,
    SummaryConfig,
    ConversationSummaryData,
    SummaryResult,
    FeedbackConfig,
    FeedbackPattern,
    FeedbackResult,
    CleanupConfig,
    CleanupResult,
    DreamJobHandler,
    DreamStateConfig,
    DreamHealthStatus
} from './types';
