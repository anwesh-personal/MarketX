/**
 * FINE-TUNING PIPELINE - TYPE DEFINITIONS
 * =========================================
 * Complete type definitions for the Fine-tuning system.
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

// ============================================================================
// TRAINING DATA
// ============================================================================

export interface TrainingExample {
    id: string;
    messages: ChatMessage[];
    rating: number;                      // 1-5 from feedback
    source: 'feedback' | 'curated' | 'synthetic';
    orgId: string;
    agentType: string;
    intent?: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
}

export interface TrainingDataset {
    id: string;
    name: string;
    orgId: string;
    agentType: string;
    examples: TrainingExample[];
    totalExamples: number;
    validationSplit: number;              // 0.1 = 10% for validation
    status: 'collecting' | 'ready' | 'processing' | 'uploaded';
    createdAt: Date;
    updatedAt: Date;
}

export interface DataCollectionConfig {
    minRating: number;                    // Minimum rating to include (e.g., 4)
    minExamples: number;                  // Minimum examples before fine-tuning
    maxExamples: number;                  // Cap to prevent over-fitting
    includeAgentTypes: string[];
    excludeIntents?: string[];
    windowDays: number;                   // Collect from last N days
}

// ============================================================================
// FINE-TUNING JOBS
// ============================================================================

export type FineTuningProvider = 'openai' | 'anthropic' | 'google';

export type FineTuningStatus =
    | 'pending'
    | 'validating'
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled';

export interface FineTuningJob {
    id: string;
    externalJobId?: string;              // Provider's job ID
    provider: FineTuningProvider;
    orgId: string;
    datasetId: string;
    baseModel: string;                   // e.g., 'gpt-4o-mini'
    fineTunedModel?: string;             // e.g., 'ft:gpt-4o-mini:org::xxxxx'
    status: FineTuningStatus;
    progress?: number;
    hyperparameters: HyperParameters;
    trainingMetrics?: TrainingMetrics;
    validationMetrics?: ValidationMetrics;
    estimatedCost?: number;
    actualCost?: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}

export interface HyperParameters {
    epochs?: number;                      // Number of epochs (default: auto)
    batchSize?: number;                   // Batch size (default: auto)
    learningRateMultiplier?: number;     // LR multiplier (default: auto)
    suffix?: string;                      // Model name suffix
}

export interface TrainingMetrics {
    trainingLoss: number;
    trainingTokens: number;
    epochs: number;
    steps: number;
}

export interface ValidationMetrics {
    validationLoss: number;
    validationTokens: number;
}

// ============================================================================
// MODEL REGISTRY
// ============================================================================

export type ModelStatus = 'active' | 'testing' | 'deprecated' | 'archived';

export interface FineTunedModel {
    id: string;
    orgId: string;
    agentType: string;
    modelId: string;                     // Provider's model ID
    baseModel: string;
    provider: FineTuningProvider;
    version: string;                     // e.g., 'v1.0.0'
    status: ModelStatus;
    performance: ModelPerformance;
    trainingJobId: string;
    datasetId: string;
    deployedAt?: Date;
    createdAt: Date;
    metadata?: Record<string, any>;
}

export interface ModelPerformance {
    accuracy?: number;                   // From eval
    latencyMs?: number;                  // Average response time
    feedbackScore?: number;              // Average user rating
    totalRequests: number;
    successfulRequests: number;
}

export interface ModelVersion {
    version: string;
    modelId: string;
    deployedAt: Date;
    performance: ModelPerformance;
    isActive: boolean;
}

// ============================================================================
// A/B TESTING
// ============================================================================

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface ABTest {
    id: string;
    name: string;
    orgId: string;
    agentType: string;
    status: ABTestStatus;
    variants: ABTestVariant[];
    trafficAllocation: number[];         // e.g., [50, 50] for 50/50 split
    primaryMetric: 'rating' | 'latency' | 'success_rate' | 'engagement';
    minSampleSize: number;
    maxDurationDays: number;
    results?: ABTestResults;
    winner?: string;                     // Variant ID
    createdAt: Date;
    startedAt?: Date;
    endedAt?: Date;
}

export interface ABTestVariant {
    id: string;
    name: string;
    modelId: string;                     // Can be base model or fine-tuned
    description?: string;
}

export interface ABTestResults {
    variants: VariantResults[];
    statisticalSignificance: number;     // p-value
    confidenceLevel: number;             // e.g., 0.95
    recommendedWinner?: string;
}

export interface VariantResults {
    variantId: string;
    sampleSize: number;
    metrics: {
        avgRating: number;
        avgLatencyMs: number;
        successRate: number;
        engagementScore: number;
    };
    confidence: {
        lower: number;
        upper: number;
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface FineTuningConfig {
    enabled: boolean;
    defaultProvider: FineTuningProvider;
    dataCollection: DataCollectionConfig;
    defaultHyperparameters: HyperParameters;
    autoFineTune: boolean;               // Auto-trigger when enough data
    autoABTest: boolean;                 // Auto-test fine-tuned models
    costLimit: number;                   // Max cost per month
    notifyOnCompletion: boolean;
    adminEmail?: string;
}

// ============================================================================
// EVENTS & CALLBACKS
// ============================================================================

export interface FineTuningEvent {
    type: 'job_started' | 'job_completed' | 'job_failed' | 'model_deployed' | 'test_completed';
    jobId?: string;
    modelId?: string;
    testId?: string;
    timestamp: Date;
    data: Record<string, any>;
}

export type FineTuningCallback = (event: FineTuningEvent) => Promise<void>;
