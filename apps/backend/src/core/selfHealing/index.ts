/**
 * SELF-HEALING - MODULE INDEX
 * ============================
 * Central export for the Self-Healing error recovery system.
 */

// Main Orchestrator
export {
    SelfHealingOrchestrator,
    initializeSelfHealing,
    getSelfHealing
} from './SelfHealingOrchestrator';

// Types
export type {
    ErrorCategory,
    ErrorSeverity,
    ClassifiedError,
    ErrorContext,
    RecoveryAction,
    RecoveryActionType,
    RecoveryResult,
    RecoveryParameters,
    CircuitBreaker,
    CircuitState,
    CircuitBreakerConfig,
    ErrorPattern,
    ServiceHealth,
    ServiceMetrics,
    SelfHealingConfig,
    AlertThresholds,
    AlertChannel,
    RecoveryStrategy,
    ErrorHandler
} from './types';
