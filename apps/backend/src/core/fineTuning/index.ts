/**
 * FINE-TUNING PIPELINE - MODULE INDEX
 * =====================================
 * Central export for the Fine-Tuning system.
 */

// Main Orchestrator
export {
    FineTuningOrchestrator,
    initializeFineTuning,
    getFineTuning
} from './FineTuningOrchestrator';

// Data Collection
export {
    DataCollector,
    initializeDataCollector,
    getDataCollector
} from './DataCollector';

// Data Formatting
export { dataFormatter, DataFormatter } from './DataFormatter';

// Job Management
export {
    JobManager,
    initializeJobManager,
    getJobManager
} from './JobManager';

// Model Registry
export {
    ModelRegistry,
    initializeModelRegistry,
    getModelRegistry
} from './ModelRegistry';

// A/B Testing
export {
    ABTester,
    initializeABTester,
    getABTester
} from './ABTester';

// Types
export type {
    // Training Data
    TrainingExample,
    ChatMessage,
    TrainingDataset,
    DataCollectionConfig,

    // Fine-tuning Jobs
    FineTuningProvider,
    FineTuningStatus,
    FineTuningJob,
    HyperParameters,
    TrainingMetrics,
    ValidationMetrics,

    // Model Registry
    ModelStatus,
    FineTunedModel,
    ModelPerformance,
    ModelVersion,

    // A/B Testing
    ABTestStatus,
    ABTest,
    ABTestVariant,
    ABTestResults,
    VariantResults,

    // Configuration
    FineTuningConfig,
    FineTuningEvent,
    FineTuningCallback
} from './types';
