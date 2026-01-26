/**
 * DREAM STATE - TYPE DEFINITIONS
 * ================================
 * Complete type definitions for the Dream State background processing system.
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

// ============================================================================
// DREAM SCHEDULE
// ============================================================================

export interface DreamSchedule {
    enabled: boolean;
    startHour: number;           // 0-23, e.g., 2 for 2 AM
    endHour: number;             // 0-23, e.g., 6 for 6 AM
    timezone: string;            // e.g., 'Asia/Kolkata', 'America/New_York'
    maxDurationMinutes: number;  // Max time per cycle, e.g., 240 (4 hours)
    priority: 'low' | 'normal' | 'high';
    daysOfWeek: number[];        // 0-6, 0=Sunday
}

// ============================================================================
// DREAM JOBS
// ============================================================================

export type DreamJobType =
    | 'memory_consolidation'
    | 'embedding_optimization'
    | 'pattern_precomputation'
    | 'conversation_summary'
    | 'feedback_analysis'
    | 'cleanup'
    | 'cache_warmup'
    | 'analytics_rollup';

export type DreamJobStatus =
    | 'pending'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'skipped';

export interface DreamJob {
    id: string;
    type: DreamJobType;
    orgId: string;
    priority: number;            // 1 (highest) to 10 (lowest)
    status: DreamJobStatus;
    progress: number;            // 0-100
    retryCount: number;
    maxRetries: number;
    timeoutMinutes: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    result?: DreamJobResult;
    error?: string;
    metadata?: Record<string, any>;
}

export interface DreamJobResult {
    success: boolean;
    processed: number;
    updated: number;
    deleted: number;
    errors: number;
    insights: DreamInsight[];
    durationMs: number;
    memoryUsedMB?: number;
    details?: Record<string, any>;
}

// ============================================================================
// DREAM INSIGHTS
// ============================================================================

export type DreamInsightType =
    | 'optimization'
    | 'pattern'
    | 'anomaly'
    | 'recommendation'
    | 'performance'
    | 'resource';

export interface DreamInsight {
    id: string;
    type: DreamInsightType;
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'critical';
    actionRequired: boolean;
    suggestedAction?: string;
    data: Record<string, any>;
    createdAt: Date;
}

// ============================================================================
// DREAM CYCLE
// ============================================================================

export interface DreamCycle {
    id: string;
    orgId: string;
    startedAt: Date;
    endedAt?: Date;
    status: 'running' | 'completed' | 'failed' | 'interrupted';
    jobsCompleted: number;
    jobsFailed: number;
    totalDurationMs?: number;
    insights: DreamInsight[];
    summary?: DreamCycleSummary;
}

export interface DreamCycleSummary {
    memoriesConsolidated: number;
    embeddingsOptimized: number;
    patternsPrecomputed: number;
    conversationsSummarized: number;
    feedbackAnalyzed: number;
    dataCleanedMB: number;
    overallHealthScore: number;  // 0-100
    recommendations: string[];
}

// ============================================================================
// MEMORY CONSOLIDATION
// ============================================================================

export interface MemoryConsolidationConfig {
    similarityThreshold: number;     // e.g., 0.95 for near-duplicates
    maxAgeMonths: number;            // Archive memories older than this
    minAccessCount: number;          // Keep memories accessed at least this many times
    strengthenThreshold: number;     // Access count to strengthen memory
    batchSize: number;               // Process in batches
}

export interface MemoryPair {
    memory1Id: string;
    memory2Id: string;
    similarity: number;
    mergeStrategy: 'keep_first' | 'keep_second' | 'combine';
}

export interface ConsolidationResult {
    duplicatesFound: number;
    memoriesMerged: number;
    memoriesArchived: number;
    memoriesStrengthened: number;
    indicesUpdated: boolean;
    spaceRecoveredMB: number;
}

// ============================================================================
// EMBEDDING OPTIMIZATION
// ============================================================================

export interface EmbeddingOptimizationConfig {
    reembedThreshold: number;        // Re-embed if quality score below this
    batchSize: number;
    modelUpgrade: boolean;           // Use newer embedding model if available
    clusterOptimization: boolean;    // Optimize vector clusters
}

export interface OptimizationResult {
    embeddingsAnalyzed: number;
    embeddingsRegenerated: number;
    clustersOptimized: number;
    averageQualityBefore: number;
    averageQualityAfter: number;
    improvementPercent: number;
}

// ============================================================================
// PATTERN PRECOMPUTATION
// ============================================================================

export interface PatternConfig {
    topK: number;                    // Number of top patterns to precompute
    minOccurrences: number;          // Minimum query occurrences to consider
    cacheExpireDays: number;         // How long to cache patterns
}

export interface QueryPattern {
    pattern: string;
    occurrences: number;
    avgResponseTimeMs: number;
    cachedResponse?: string;
    cachedAt?: Date;
}

export interface PatternResult {
    patternsAnalyzed: number;
    patternsPrecomputed: number;
    cacheHitRateBefore: number;
    expectedCacheHitRate: number;
    topPatterns: QueryPattern[];
}

// ============================================================================
// CONVERSATION SUMMARY
// ============================================================================

export interface SummaryConfig {
    minMessagesForSummary: number;   // Minimum messages to generate summary
    maxAgeDays: number;              // Summarize conversations older than this
    compressionRatio: number;        // Target compression, e.g., 0.2 = 20% of original
}

export interface ConversationSummaryData {
    conversationId: string;
    messageCount: number;
    summary: string;
    keyTopics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    actionItems: string[];
    originalTokens: number;
    summaryTokens: number;
}

export interface SummaryResult {
    conversationsAnalyzed: number;
    conversationsSummarized: number;
    totalTokensSaved: number;
    averageCompressionRatio: number;
    summaries: ConversationSummaryData[];
}

// ============================================================================
// FEEDBACK ANALYSIS
// ============================================================================

export interface FeedbackConfig {
    minFeedbackCount: number;        // Minimum feedback items to analyze
    sentimentAnalysis: boolean;
    topicExtraction: boolean;
    trendDetection: boolean;
}

export interface FeedbackPattern {
    category: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    frequency: number;
    trend: 'improving' | 'stable' | 'declining';
    examples: string[];
    suggestedImprovement?: string;
}

export interface FeedbackResult {
    feedbackAnalyzed: number;
    patternsIdentified: number;
    overallSentiment: number;        // -1 to 1
    sentimentTrend: 'improving' | 'stable' | 'declining';
    patterns: FeedbackPattern[];
    actionItems: string[];
}

// ============================================================================
// CLEANUP
// ============================================================================

export interface CleanupConfig {
    deleteOrphanedEmbeddings: boolean;
    deleteOldLogs: boolean;
    logRetentionDays: number;
    deleteExpiredCache: boolean;
    vacuumDatabase: boolean;
    archiveOldConversations: boolean;
    conversationArchiveAgeDays: number;
}

export interface CleanupResult {
    orphanedEmbeddingsDeleted: number;
    logsDeleted: number;
    cacheEntriesExpired: number;
    conversationsArchived: number;
    spaceRecoveredMB: number;
    databaseVacuumed: boolean;
}

// ============================================================================
// JOB HANDLER INTERFACE
// ============================================================================

export interface DreamJobHandler<TConfig = any, TResult = DreamJobResult> {
    type: DreamJobType;
    defaultConfig: TConfig;

    run(orgId: string, config: TConfig): Promise<TResult>;

    estimateTime(orgId: string): Promise<number>;  // Returns estimated minutes

    canRun(orgId: string): Promise<boolean>;  // Pre-flight check

    onProgress(callback: (progress: number) => void): void;
}

// ============================================================================
// ORCHESTRATOR CONFIG
// ============================================================================

export interface DreamStateConfig {
    enabled: boolean;
    defaultSchedule: DreamSchedule;
    jobPriorities: Record<DreamJobType, number>;
    maxConcurrentJobs: number;
    healthCheckIntervalMinutes: number;
    alertOnFailure: boolean;
    alertEmail?: string;
    slackWebhook?: string;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface DreamHealthStatus {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    lastCycleAt?: Date;
    lastCycleSuccess: boolean;
    pendingJobs: number;
    failedJobsLast24h: number;
    avgCycleDurationMinutes: number;
    systemHealth: {
        database: boolean;
        vectorStore: boolean;
        aiProvider: boolean;
        storage: boolean;
    };
    insights: DreamInsight[];
}
