/**
 * MODEL REGISTRY
 * ================
 * Tracks and manages fine-tuned model versions.
 * 
 * Features:
 * - Model version tracking
 * - Performance metrics
 * - Deployment management
 * - Rollback support
 * - Model lifecycle management
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

import { Pool } from 'pg';
import {
    FineTunedModel,
    ModelStatus,
    ModelPerformance,
    ModelVersion,
    FineTuningProvider
} from './types';

// ============================================================================
// MODEL REGISTRY CLASS
// ============================================================================

export class ModelRegistry {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    // ========================================================================
    // MODEL REGISTRATION
    // ========================================================================

    /**
     * Register a new fine-tuned model
     */
    async registerModel(
        orgId: string,
        agentType: string,
        modelId: string,
        baseModel: string,
        provider: FineTuningProvider,
        trainingJobId: string,
        datasetId: string
    ): Promise<FineTunedModel> {
        // Get next version number
        const version = await this.getNextVersion(orgId, agentType);

        const model: FineTunedModel = {
            id: `model_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            orgId,
            agentType,
            modelId,
            baseModel,
            provider,
            version,
            status: 'testing',
            performance: {
                totalRequests: 0,
                successfulRequests: 0
            },
            trainingJobId,
            datasetId,
            createdAt: new Date()
        };

        await this.pool.query(
            `INSERT INTO fine_tuned_models (
                id, org_id, agent_type, model_id, base_model, provider,
                version, status, performance, training_job_id, dataset_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                model.id,
                model.orgId,
                model.agentType,
                model.modelId,
                model.baseModel,
                model.provider,
                model.version,
                model.status,
                JSON.stringify(model.performance),
                model.trainingJobId,
                model.datasetId,
                model.createdAt
            ]
        );

        return model;
    }

    /**
     * Get next version for agent type
     */
    private async getNextVersion(orgId: string, agentType: string): Promise<string> {
        const { rows } = await this.pool.query(
            `SELECT version FROM fine_tuned_models 
             WHERE org_id = $1 AND agent_type = $2 
             ORDER BY created_at DESC LIMIT 1`,
            [orgId, agentType]
        );

        if (rows.length === 0) {
            return 'v1.0.0';
        }

        // Parse current version and increment
        const current = rows[0].version;
        const match = current.match(/v(\d+)\.(\d+)\.(\d+)/);
        if (!match) {
            return 'v1.0.0';
        }

        const [, major, minor, patch] = match.map(Number);
        return `v${major}.${minor + 1}.0`;
    }

    // ========================================================================
    // MODEL RETRIEVAL
    // ========================================================================

    /**
     * Get model by ID
     */
    async getModel(modelId: string): Promise<FineTunedModel | null> {
        const { rows } = await this.pool.query(
            `SELECT * FROM fine_tuned_models WHERE id = $1`,
            [modelId]
        );

        if (rows.length === 0) return null;
        return this.mapModelRow(rows[0]);
    }

    /**
     * Get active model for agent type
     */
    async getActiveModel(orgId: string, agentType: string): Promise<FineTunedModel | null> {
        const { rows } = await this.pool.query(
            `SELECT * FROM fine_tuned_models 
             WHERE org_id = $1 AND agent_type = $2 AND status = 'active'
             ORDER BY deployed_at DESC LIMIT 1`,
            [orgId, agentType]
        );

        if (rows.length === 0) return null;
        return this.mapModelRow(rows[0]);
    }

    /**
     * Get all models for an org
     */
    async getOrgModels(orgId: string): Promise<FineTunedModel[]> {
        const { rows } = await this.pool.query(
            `SELECT * FROM fine_tuned_models WHERE org_id = $1 ORDER BY created_at DESC`,
            [orgId]
        );

        return rows.map(row => this.mapModelRow(row));
    }

    /**
     * Get all versions for an agent type
     */
    async getVersionHistory(orgId: string, agentType: string): Promise<ModelVersion[]> {
        const { rows } = await this.pool.query(
            `SELECT version, model_id, deployed_at, performance, status 
             FROM fine_tuned_models 
             WHERE org_id = $1 AND agent_type = $2 
             ORDER BY created_at DESC`,
            [orgId, agentType]
        );

        return rows.map(row => ({
            version: row.version,
            modelId: row.model_id,
            deployedAt: row.deployed_at ? new Date(row.deployed_at) : new Date(),
            performance: row.performance || {},
            isActive: row.status === 'active'
        }));
    }

    // ========================================================================
    // MODEL LIFECYCLE
    // ========================================================================

    /**
     * Deploy a model (set as active)
     */
    async deployModel(modelId: string): Promise<FineTunedModel> {
        const model = await this.getModel(modelId);
        if (!model) {
            throw new Error('Model not found');
        }

        // Deactivate current active model
        await this.pool.query(
            `UPDATE fine_tuned_models SET status = 'deprecated'
             WHERE org_id = $1 AND agent_type = $2 AND status = 'active'`,
            [model.orgId, model.agentType]
        );

        // Activate new model
        await this.pool.query(
            `UPDATE fine_tuned_models SET status = 'active', deployed_at = NOW()
             WHERE id = $1`,
            [modelId]
        );

        model.status = 'active';
        model.deployedAt = new Date();

        console.log(`🚀 Model ${model.version} deployed for ${model.agentType}`);

        return model;
    }

    /**
     * Rollback to previous version
     */
    async rollbackToPrevious(orgId: string, agentType: string): Promise<FineTunedModel | null> {
        // Get current active model
        const current = await this.getActiveModel(orgId, agentType);

        // Get previous version
        const { rows } = await this.pool.query(
            `SELECT * FROM fine_tuned_models 
             WHERE org_id = $1 AND agent_type = $2 AND status = 'deprecated'
             ORDER BY deployed_at DESC LIMIT 1`,
            [orgId, agentType]
        );

        if (rows.length === 0) {
            console.log('No previous version to rollback to');
            return null;
        }

        const previous = this.mapModelRow(rows[0]);

        // Deactivate current
        if (current) {
            await this.pool.query(
                `UPDATE fine_tuned_models SET status = 'deprecated' WHERE id = $1`,
                [current.id]
            );
        }

        // Activate previous
        await this.pool.query(
            `UPDATE fine_tuned_models SET status = 'active', deployed_at = NOW() WHERE id = $1`,
            [previous.id]
        );

        console.log(`⏪ Rolled back to ${previous.version} for ${agentType}`);

        return previous;
    }

    /**
     * Archive a model
     */
    async archiveModel(modelId: string): Promise<void> {
        await this.pool.query(
            `UPDATE fine_tuned_models SET status = 'archived' WHERE id = $1`,
            [modelId]
        );
    }

    // ========================================================================
    // PERFORMANCE TRACKING
    // ========================================================================

    /**
     * Update model performance metrics
     */
    async updatePerformance(
        modelId: string,
        metrics: Partial<ModelPerformance>
    ): Promise<void> {
        const model = await this.getModel(modelId);
        if (!model) return;

        const updated: ModelPerformance = {
            ...model.performance,
            ...metrics,
            totalRequests: (model.performance.totalRequests || 0) + 1,
            successfulRequests: metrics.accuracy
                ? (model.performance.successfulRequests || 0) + 1
                : model.performance.successfulRequests || 0
        };

        await this.pool.query(
            `UPDATE fine_tuned_models SET performance = $2 WHERE id = $1`,
            [modelId, JSON.stringify(updated)]
        );
    }

    /**
     * Record a request to a model
     */
    async recordRequest(
        modelId: string,
        latencyMs: number,
        success: boolean,
        userRating?: number
    ): Promise<void> {
        const model = await this.getModel(modelId);
        if (!model) return;

        const perf = model.performance;
        perf.totalRequests++;
        if (success) perf.successfulRequests++;

        // Update rolling averages
        if (perf.latencyMs) {
            perf.latencyMs = (perf.latencyMs * (perf.totalRequests - 1) + latencyMs) / perf.totalRequests;
        } else {
            perf.latencyMs = latencyMs;
        }

        if (userRating && perf.feedbackScore !== undefined) {
            const currentTotal = perf.feedbackScore * (perf.totalRequests - 1);
            perf.feedbackScore = (currentTotal + userRating) / perf.totalRequests;
        } else if (userRating) {
            perf.feedbackScore = userRating;
        }

        await this.pool.query(
            `UPDATE fine_tuned_models SET performance = $2 WHERE id = $1`,
            [modelId, JSON.stringify(perf)]
        );
    }

    /**
     * Get performance comparison between versions
     */
    async compareVersions(
        orgId: string,
        agentType: string,
        version1: string,
        version2: string
    ): Promise<{
        version1: ModelPerformance;
        version2: ModelPerformance;
        winner: string;
    }> {
        const { rows } = await this.pool.query(
            `SELECT version, performance FROM fine_tuned_models 
             WHERE org_id = $1 AND agent_type = $2 AND version IN ($3, $4)`,
            [orgId, agentType, version1, version2]
        );

        if (rows.length < 2) {
            throw new Error('Both versions must exist');
        }

        const perf1 = rows.find(r => r.version === version1)?.performance || {};
        const perf2 = rows.find(r => r.version === version2)?.performance || {};

        // Determine winner based on feedback score
        const score1 = perf1.feedbackScore || 0;
        const score2 = perf2.feedbackScore || 0;

        return {
            version1: perf1,
            version2: perf2,
            winner: score1 >= score2 ? version1 : version2
        };
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Map database row to model object
     */
    private mapModelRow(row: any): FineTunedModel {
        return {
            id: row.id,
            orgId: row.org_id,
            agentType: row.agent_type,
            modelId: row.model_id,
            baseModel: row.base_model,
            provider: row.provider,
            version: row.version,
            status: row.status,
            performance: row.performance || {},
            trainingJobId: row.training_job_id,
            datasetId: row.dataset_id,
            deployedAt: row.deployed_at ? new Date(row.deployed_at) : undefined,
            createdAt: new Date(row.created_at),
            metadata: row.metadata
        };
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let registryInstance: ModelRegistry | null = null;

export function initializeModelRegistry(pool: Pool): ModelRegistry {
    if (!registryInstance) {
        registryInstance = new ModelRegistry(pool);
    }
    return registryInstance;
}

export function getModelRegistry(): ModelRegistry {
    if (!registryInstance) {
        throw new Error('ModelRegistry not initialized');
    }
    return registryInstance;
}
