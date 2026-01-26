/**
 * FINE-TUNING ORCHESTRATOR
 * ==========================
 * Central orchestrator for the entire fine-tuning pipeline.
 * 
 * Features:
 * - End-to-end fine-tuning workflow
 * - Automated data collection
 * - Job management
 * - Model deployment
 * - A/B testing integration
 * - Performance monitoring
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

import { Pool } from 'pg';
import {
    FineTuningConfig,
    TrainingDataset,
    FineTuningJob,
    FineTunedModel,
    ABTest,
    FineTuningEvent,
    FineTuningCallback,
    FineTuningProvider,
    HyperParameters
} from './types';
import { DataCollector, initializeDataCollector, getDataCollector } from './DataCollector';
import { dataFormatter } from './DataFormatter';
import { JobManager, initializeJobManager, getJobManager } from './JobManager';
import { ModelRegistry, initializeModelRegistry, getModelRegistry } from './ModelRegistry';
import { ABTester, initializeABTester, getABTester } from './ABTester';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: FineTuningConfig = {
    enabled: true,
    defaultProvider: 'openai',
    dataCollection: {
        minRating: 4,
        minExamples: 100,
        maxExamples: 10000,
        includeAgentTypes: ['writer', 'analyst', 'coach', 'generalist'],
        windowDays: 90
    },
    defaultHyperparameters: {},
    autoFineTune: false,
    autoABTest: true,
    costLimit: 100,
    notifyOnCompletion: true
};

// ============================================================================
// FINE-TUNING ORCHESTRATOR
// ============================================================================

export class FineTuningOrchestrator {
    private pool: Pool;
    private config: FineTuningConfig;
    private dataCollector!: DataCollector;
    private jobManager!: JobManager;
    private modelRegistry!: ModelRegistry;
    private abTester!: ABTester;
    private callbacks: FineTuningCallback[] = [];
    private initialized: boolean = false;

    constructor(pool: Pool, config?: Partial<FineTuningConfig>) {
        this.pool = pool;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Initialize all components
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('🔧 Initializing Fine-Tuning Pipeline...');

        // Initialize components
        this.dataCollector = initializeDataCollector(this.pool, this.config.dataCollection);
        this.jobManager = initializeJobManager(this.pool);
        this.modelRegistry = initializeModelRegistry(this.pool);
        this.abTester = initializeABTester(this.pool);

        // Ensure tables exist
        await this.ensureTables();

        this.initialized = true;
        console.log('🔧 Fine-Tuning Pipeline ready');
    }

    /**
     * Shutdown
     */
    async shutdown(): Promise<void> {
        this.jobManager?.shutdown();
    }

    /**
     * Ensure required tables exist
     */
    private async ensureTables(): Promise<void> {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS training_datasets (
                id TEXT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                org_id UUID NOT NULL,
                agent_type VARCHAR(50) NOT NULL,
                validation_split DECIMAL(3,2) DEFAULT 0.1,
                total_examples INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'collecting',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS training_examples (
                id TEXT PRIMARY KEY,
                dataset_id TEXT REFERENCES training_datasets(id),
                org_id UUID NOT NULL,
                agent_type VARCHAR(50) NOT NULL,
                messages JSONB NOT NULL,
                rating INTEGER,
                source VARCHAR(20) DEFAULT 'feedback',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS fine_tuning_jobs (
                id TEXT PRIMARY KEY,
                external_job_id TEXT,
                provider VARCHAR(20) NOT NULL,
                org_id UUID NOT NULL,
                dataset_id TEXT,
                base_model VARCHAR(100) NOT NULL,
                fine_tuned_model VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                hyperparameters JSONB DEFAULT '{}',
                training_metrics JSONB,
                validation_metrics JSONB,
                estimated_cost DECIMAL(10,2),
                actual_cost DECIMAL(10,2),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                started_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                error TEXT
            );

            CREATE TABLE IF NOT EXISTS fine_tuned_models (
                id TEXT PRIMARY KEY,
                org_id UUID NOT NULL,
                agent_type VARCHAR(50) NOT NULL,
                model_id VARCHAR(255) NOT NULL,
                base_model VARCHAR(100) NOT NULL,
                provider VARCHAR(20) NOT NULL,
                version VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'testing',
                performance JSONB DEFAULT '{}',
                training_job_id TEXT,
                dataset_id TEXT,
                deployed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                metadata JSONB DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS ab_tests (
                id TEXT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                org_id UUID NOT NULL,
                agent_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'draft',
                variants JSONB NOT NULL,
                traffic_allocation INTEGER[] NOT NULL,
                primary_metric VARCHAR(20) DEFAULT 'rating',
                min_sample_size INTEGER DEFAULT 100,
                max_duration_days INTEGER DEFAULT 14,
                results JSONB,
                winner TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                started_at TIMESTAMPTZ,
                ended_at TIMESTAMPTZ
            );

            CREATE TABLE IF NOT EXISTS ab_test_metrics (
                id TEXT PRIMARY KEY,
                test_id TEXT NOT NULL,
                variant_id TEXT NOT NULL,
                rating INTEGER,
                latency_ms INTEGER,
                success BOOLEAN,
                engagement DECIMAL(5,2),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS training_examples_dataset_idx ON training_examples(dataset_id);
            CREATE INDEX IF NOT EXISTS fine_tuning_jobs_org_idx ON fine_tuning_jobs(org_id);
            CREATE INDEX IF NOT EXISTS fine_tuned_models_org_idx ON fine_tuned_models(org_id, agent_type);
            CREATE INDEX IF NOT EXISTS ab_tests_org_idx ON ab_tests(org_id, agent_type, status);
            CREATE INDEX IF NOT EXISTS ab_test_metrics_test_idx ON ab_test_metrics(test_id, variant_id);
        `);
    }

    // ========================================================================
    // MAIN WORKFLOW
    // ========================================================================

    /**
     * Run the complete fine-tuning workflow for an agent type
     */
    async runFineTuningWorkflow(
        orgId: string,
        agentType: string,
        options: {
            baseModel?: string;
            provider?: FineTuningProvider;
            hyperparameters?: HyperParameters;
            skipABTest?: boolean;
        } = {}
    ): Promise<{
        datasetId: string;
        jobId: string;
        estimatedCost: number;
    }> {
        if (!this.initialized) {
            await this.initialize();
        }

        console.log(`🚀 Starting fine-tuning workflow for ${agentType}...`);

        // Step 1: Collect training data
        console.log('📊 Collecting training data...');
        const examples = await this.dataCollector.collectFromFeedback(orgId, agentType);

        if (examples.length < this.config.dataCollection.minExamples) {
            throw new Error(
                `Not enough training examples. Have ${examples.length}, need ${this.config.dataCollection.minExamples}`
            );
        }

        // Step 2: Filter and deduplicate
        console.log('🔍 Filtering and deduplicating...');
        let filteredExamples = this.dataCollector.filterByQuality(examples);
        filteredExamples = this.dataCollector.deduplicateExamples(filteredExamples);

        // Step 3: Validate data
        console.log('✅ Validating dataset...');
        const validation = dataFormatter.validateDataset(filteredExamples);
        if (!validation.valid) {
            throw new Error(`Invalid dataset: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
            console.log(`⚠️ Warnings: ${validation.warnings.join(', ')}`);
        }

        // Step 4: Create dataset
        console.log('📁 Creating dataset...');
        const dataset = await this.dataCollector.createDataset(
            `${agentType}-${new Date().toISOString().split('T')[0]}`,
            orgId,
            agentType
        );
        await this.dataCollector.addToDataset(dataset.id, filteredExamples);

        // Update dataset with examples for job submission
        dataset.examples = filteredExamples;
        dataset.totalExamples = filteredExamples.length;

        // Step 5: Estimate cost
        const baseModel = options.baseModel || 'gpt-4o-mini';
        const provider = options.provider || this.config.defaultProvider;
        const costEstimate = dataFormatter.estimateCost(filteredExamples, provider, baseModel);

        if (costEstimate.estimatedCost > this.config.costLimit) {
            throw new Error(
                `Estimated cost $${costEstimate.estimatedCost} exceeds limit $${this.config.costLimit}`
            );
        }

        console.log(`💰 Estimated cost: $${costEstimate.estimatedCost}`);

        // Step 6: Submit fine-tuning job
        console.log('🔄 Submitting fine-tuning job...');
        const job = await this.jobManager.createJob(
            orgId,
            dataset,
            baseModel,
            provider,
            options.hyperparameters || this.config.defaultHyperparameters
        );

        console.log(`✅ Fine-tuning job created: ${job.id}`);

        // Emit event
        await this.emitEvent({
            type: 'job_started',
            jobId: job.id,
            timestamp: new Date(),
            data: { orgId, agentType, baseModel }
        });

        return {
            datasetId: dataset.id,
            jobId: job.id,
            estimatedCost: costEstimate.estimatedCost
        };
    }

    /**
     * Handle job completion (called by job manager polling or webhook)
     */
    async onJobCompleted(jobId: string): Promise<void> {
        const job = await this.jobManager.getJob(jobId);
        if (!job || job.status !== 'succeeded' || !job.fineTunedModel) {
            return;
        }

        console.log(`🎉 Fine-tuning job ${jobId} completed!`);

        // Get dataset info
        const dataset = await this.dataCollector.getDataset(job.datasetId);
        if (!dataset) return;

        // Register model
        const model = await this.modelRegistry.registerModel(
            job.orgId,
            dataset.agentType,
            job.fineTunedModel,
            job.baseModel,
            job.provider,
            job.id,
            job.datasetId
        );

        console.log(`📝 Model registered: ${model.version}`);

        // Emit event
        await this.emitEvent({
            type: 'job_completed',
            jobId: job.id,
            modelId: model.id,
            timestamp: new Date(),
            data: { fineTunedModel: job.fineTunedModel }
        });

        // Auto-start A/B test if enabled
        if (this.config.autoABTest) {
            await this.startABTest(job.orgId, dataset.agentType, model);
        }
    }

    /**
     * Start A/B test for new model
     */
    async startABTest(
        orgId: string,
        agentType: string,
        newModel: FineTunedModel
    ): Promise<ABTest> {
        // Get current active model (if any) to compare against
        const currentModel = await this.modelRegistry.getActiveModel(orgId, agentType);

        const variants = [
            {
                id: 'control',
                name: currentModel ? `Current (${currentModel.version})` : 'Base Model',
                modelId: currentModel?.modelId || newModel.baseModel,
                description: 'Control group'
            },
            {
                id: 'treatment',
                name: `Fine-tuned (${newModel.version})`,
                modelId: newModel.modelId,
                description: 'New fine-tuned model'
            }
        ];

        const test = await this.abTester.createTest(
            `${agentType} Fine-tune Test ${new Date().toISOString().split('T')[0]}`,
            orgId,
            agentType,
            variants
        );

        await this.abTester.startTest(test.id);

        console.log(`🧪 A/B test started: ${test.name}`);

        return test;
    }

    // ========================================================================
    // MODEL MANAGEMENT
    // ========================================================================

    /**
     * Deploy a model (make it active)
     */
    async deployModel(modelId: string): Promise<FineTunedModel> {
        const model = await this.modelRegistry.deployModel(modelId);

        await this.emitEvent({
            type: 'model_deployed',
            modelId: model.id,
            timestamp: new Date(),
            data: { version: model.version, agentType: model.agentType }
        });

        return model;
    }

    /**
     * Rollback to previous model version
     */
    async rollbackModel(orgId: string, agentType: string): Promise<FineTunedModel | null> {
        return this.modelRegistry.rollbackToPrevious(orgId, agentType);
    }

    /**
     * Get active model for an agent type
     */
    async getActiveModel(orgId: string, agentType: string): Promise<FineTunedModel | null> {
        return this.modelRegistry.getActiveModel(orgId, agentType);
    }

    /**
     * Get model to use for a request (handles A/B testing)
     */
    async getModelForRequest(
        orgId: string,
        agentType: string
    ): Promise<{ modelId: string; isFineTuned: boolean; testId?: string; variantId?: string }> {
        // Check for active A/B test
        const activeTest = await this.abTester.getActiveTest(orgId, agentType);

        if (activeTest) {
            const variant = await this.abTester.selectVariant(activeTest.id);
            if (variant) {
                return {
                    modelId: variant.modelId,
                    isFineTuned: variant.id === 'treatment',
                    testId: activeTest.id,
                    variantId: variant.id
                };
            }
        }

        // No A/B test, use active model or default
        const activeModel = await this.modelRegistry.getActiveModel(orgId, agentType);

        if (activeModel) {
            return {
                modelId: activeModel.modelId,
                isFineTuned: true
            };
        }

        // No fine-tuned model, return base model
        return {
            modelId: 'gpt-4o-mini',
            isFineTuned: false
        };
    }

    /**
     * Record request metrics for A/B testing and model performance
     */
    async recordRequestMetrics(
        orgId: string,
        agentType: string,
        modelId: string,
        metrics: {
            latencyMs: number;
            success: boolean;
            testId?: string;
            variantId?: string;
        }
    ): Promise<void> {
        // Record for A/B test
        if (metrics.testId && metrics.variantId) {
            await this.abTester.recordMetric(metrics.testId, metrics.variantId, {
                latencyMs: metrics.latencyMs,
                success: metrics.success
            });
        }

        // Record for model performance
        const model = await this.modelRegistry.getActiveModel(orgId, agentType);
        if (model && model.modelId === modelId) {
            await this.modelRegistry.recordRequest(
                model.id,
                metrics.latencyMs,
                metrics.success
            );
        }
    }

    // ========================================================================
    // STATUS & REPORTING
    // ========================================================================

    /**
     * Get fine-tuning status for an org
     */
    async getStatus(orgId: string): Promise<{
        activeJobs: FineTuningJob[];
        recentModels: FineTunedModel[];
        activeTests: ABTest[];
        dataReadiness: Record<string, { ready: boolean; count: number; required: number }>;
    }> {
        const jobs = await this.jobManager.getOrgJobs(orgId);
        const activeJobs = jobs.filter(j =>
            j.status === 'pending' || j.status === 'queued' || j.status === 'running'
        );

        const models = await this.modelRegistry.getOrgModels(orgId);
        const recentModels = models.slice(0, 10);

        const tests = await this.abTester.getOrgTests(orgId);
        const activeTests = tests.filter(t => t.status === 'running');

        const dataReadiness: Record<string, { ready: boolean; count: number; required: number }> = {};
        for (const agentType of this.config.dataCollection.includeAgentTypes) {
            const readiness = await this.dataCollector.hasEnoughData(orgId, agentType);
            dataReadiness[agentType] = {
                ready: readiness.ready,
                count: readiness.currentCount,
                required: readiness.minRequired
            };
        }

        return {
            activeJobs,
            recentModels,
            activeTests,
            dataReadiness
        };
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    /**
     * Register a callback for events
     */
    onEvent(callback: FineTuningCallback): void {
        this.callbacks.push(callback);
    }

    /**
     * Emit an event
     */
    private async emitEvent(event: FineTuningEvent): Promise<void> {
        for (const callback of this.callbacks) {
            try {
                await callback(event);
            } catch (error) {
                console.error('Error in fine-tuning event callback:', error);
            }
        }
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let orchestratorInstance: FineTuningOrchestrator | null = null;

export function initializeFineTuning(pool: Pool, config?: Partial<FineTuningConfig>): FineTuningOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new FineTuningOrchestrator(pool, config);
    }
    return orchestratorInstance;
}

export function getFineTuning(): FineTuningOrchestrator {
    if (!orchestratorInstance) {
        throw new Error('FineTuningOrchestrator not initialized');
    }
    return orchestratorInstance;
}
