/**
 * SELF-HEALING SYSTEM - TYPE DEFINITIONS
 * ========================================
 * Complete type definitions for the Self-Healing error recovery system.
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

export type ErrorCategory =
    | 'ai_provider'         // OpenAI, Anthropic, etc. errors
    | 'database'            // Supabase/PostgreSQL errors
    | 'vector_store'        // Embedding/search errors
    | 'rate_limit'          // API rate limiting
    | 'timeout'             // Request timeouts
    | 'validation'          // Input validation errors
    | 'authentication'      // Auth/permission errors
    | 'configuration'       // Missing or invalid config
    | 'resource'            // Memory, CPU, storage issues
    | 'external_api'        // Third-party API errors
    | 'unknown';            // Unclassified errors

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ClassifiedError {
    id: string;
    originalError: Error;
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
    code?: string;
    context: ErrorContext;
    timestamp: Date;
    fingerprint: string;        // Unique hash for deduplication
    isRecoverable: boolean;
    suggestedAction?: RecoveryAction;
}

export interface ErrorContext {
    orgId?: string;
    userId?: string;
    agentType?: string;
    requestId?: string;
    endpoint?: string;
    inputSummary?: string;
    stackTrace?: string;
    metadata?: Record<string, any>;
}

// ============================================================================
// RECOVERY ACTIONS
// ============================================================================

export type RecoveryActionType =
    | 'retry'                   // Retry with same parameters
    | 'retry_with_backoff'      // Retry with exponential backoff
    | 'failover'                // Switch to backup provider/service
    | 'degrade'                 // Use degraded mode (simpler response)
    | 'cache_fallback'          // Return cached response
    | 'queue'                   // Queue for later processing
    | 'escalate'                // Alert human operators
    | 'circuit_break'           // Open circuit breaker
    | 'skip'                    // Skip this operation
    | 'user_feedback'           // Ask user for clarification
    | 'none';                   // No recovery possible

export interface RecoveryAction {
    type: RecoveryActionType;
    description: string;
    parameters?: RecoveryParameters;
    maxAttempts?: number;
    backoffMs?: number;
    fallbackProvider?: string;
    cacheKey?: string;
    escalationChannel?: string;
}

export interface RecoveryParameters {
    retryDelayMs?: number;
    maxRetries?: number;
    backoffMultiplier?: number;
    timeoutMs?: number;
    fallbackValue?: any;
    degradedMode?: string;
    alternativeProvider?: string;
}

// ============================================================================
// RECOVERY RESULT
// ============================================================================

export interface RecoveryResult {
    success: boolean;
    action: RecoveryActionType;
    attemptsUsed: number;
    totalDurationMs: number;
    finalError?: ClassifiedError;
    recoveredValue?: any;
    degraded: boolean;
    notes: string[];
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreaker {
    id: string;
    service: string;
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailure?: Date;
    lastSuccess?: Date;
    openedAt?: Date;
    halfOpenAt?: Date;
    config: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
    failureThreshold: number;       // Failures to open circuit
    successThreshold: number;       // Successes to close from half-open
    timeoutMs: number;              // Time in open state before half-open
    monitoringWindowMs: number;     // Window for counting failures
    samplingRate: number;           // % of requests to allow in half-open
}

// ============================================================================
// ERROR PATTERNS
// ============================================================================

export interface ErrorPattern {
    id: string;
    fingerprint: string;
    category: ErrorCategory;
    occurrences: number;
    firstSeen: Date;
    lastSeen: Date;
    averageRecoveryTimeMs: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    bestRecoveryAction?: RecoveryActionType;
    isResolved: boolean;
    resolution?: string;
}

// ============================================================================
// HEALTH INDICATORS
// ============================================================================

export interface ServiceHealth {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTimeMs: number;
    errorRate: number;              // 0.0 to 1.0
    lastCheck: Date;
    circuitState: CircuitState;
    metrics: ServiceMetrics;
}

export interface ServiceMetrics {
    requestsTotal: number;
    requestsSuccess: number;
    requestsFailed: number;
    avgResponseTimeMs: number;
    p95ResponseTimeMs: number;
    p99ResponseTimeMs: number;
    lastHourErrorRate: number;
}

// ============================================================================
// SELF-HEALING CONFIG
// ============================================================================

export interface SelfHealingConfig {
    enabled: boolean;

    // Retry configuration
    defaultMaxRetries: number;
    defaultBackoffMs: number;
    maxBackoffMs: number;
    backoffMultiplier: number;

    // Circuit breaker defaults
    circuitBreaker: CircuitBreakerConfig;

    // Provider failover
    aiProviderOrder: string[];      // Ordered list of AI providers
    enableAutoFailover: boolean;

    // Monitoring
    healthCheckIntervalMs: number;
    errorPatternWindowHours: number;

    // Alerting
    alertThresholds: AlertThresholds;
    alertChannels: AlertChannel[];
}

export interface AlertThresholds {
    errorRateWarning: number;       // e.g., 0.05 = 5%
    errorRateCritical: number;      // e.g., 0.20 = 20%
    responseTimeWarning: number;    // ms
    responseTimeCritical: number;   // ms
    circuitOpenCount: number;       // Number of open circuits for alert
}

export interface AlertChannel {
    type: 'email' | 'slack' | 'webhook' | 'console';
    endpoint: string;
    minSeverity: ErrorSeverity;
    enabled: boolean;
}

// ============================================================================
// RECOVERY STRATEGY
// ============================================================================

export interface RecoveryStrategy {
    category: ErrorCategory;
    primaryAction: RecoveryAction;
    fallbackActions: RecoveryAction[];
    escalationAfterAttempts: number;
    circuitBreakerEnabled: boolean;
    cacheEnabled: boolean;
    degradedModeEnabled: boolean;
}

// ============================================================================
// HANDLER INTERFACE
// ============================================================================

export interface ErrorHandler {
    canHandle(error: Error, context?: ErrorContext): boolean;
    classify(error: Error, context?: ErrorContext): ClassifiedError;
    recover(error: ClassifiedError): Promise<RecoveryResult>;
    onRecoverySuccess(error: ClassifiedError, result: RecoveryResult): void;
    onRecoveryFailure(error: ClassifiedError, result: RecoveryResult): void;
}
