/**
 * AXIOM ENGINE DEPLOYMENT SERVICE
 * Full port from Lekhika's engineDeploymentService.js
 * 
 * Purpose: Deploy, manage, and orchestrate AI content engines
 * No shortcuts. Production-grade from Day 1.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Database pool (will be injected from main app)
let dbPool: Pool;

export function initializeEngineService(pool: Pool) {
    dbPool = pool;
}

// ============================================================================
// TYPES
// ============================================================================

export interface EngineConfig {
    name: string;
    description?: string;
    templateId: string;
    orgId?: string;
    kbId?: string;
    constitutionId?: string;
    flowConfig: {
        nodes: any[];
        edges: any[];
        models?: any[];
    };
    executionMode?: 'sync' | 'async' | 'queue';
    tier?: 'hobby' | 'pro' | 'enterprise';
    status?: 'active' | 'standby' | 'disabled';
    config?: Record<string, any>;
}

export interface EngineInstance {
    id: string;
    name: string;
    description?: string;
    templateId: string;
    orgId?: string;
    kbId?: string;
    constitutionId?: string;
    status: 'active' | 'standby' | 'disabled' | 'error';
    config: Record<string, any>;
    runsToday: number;
    runsTotal: number;
    lastRunAt?: Date;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface EngineStats {
    totalEngines: number;
    activeEngines: number;
    totalExecutions: number;
    successfulExecutions: number;
    totalTokensUsed: number;
    totalCostEstimate: number;
    enginesByTier: {
        hobby: number;
        pro: number;
        enterprise: number;
    };
}

// ============================================================================
// ENGINE DEPLOYMENT SERVICE CLASS
// ============================================================================

class EngineDeploymentService {

    /**
     * Deploy a new engine from a workflow template
     * Creates an engine_instance with cloned configuration
     */
    async deployEngine(config: EngineConfig, createdBy?: string): Promise<EngineInstance> {
        try {
            const query = `
                INSERT INTO engine_instances (
                    id, name, description, template_id, org_id, kb_id, constitution_id,
                    status, config, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
                )
                RETURNING *
            `;

            const engineId = uuidv4();
            const values = [
                engineId,
                config.name,
                config.description || null,
                config.templateId,
                config.orgId || null,
                config.kbId || null,
                config.constitutionId || null,
                config.status || 'disabled',
                JSON.stringify({
                    flowConfig: config.flowConfig,
                    executionMode: config.executionMode || 'sync',
                    tier: config.tier || 'hobby',
                    createdBy: createdBy,
                    ...config.config
                })
            ];

            const result = await dbPool.query(query, values);
            const row = result.rows[0];

            console.log(`✅ Engine deployed: ${config.name} (${engineId})`);

            return this.mapRowToEngine(row);
        } catch (error) {
            console.error('Engine deployment error:', error);
            throw error;
        }
    }

    /**
     * Get all engines with optional filters
     */
    async getEngines(filters?: {
        orgId?: string;
        status?: string;
        activeOnly?: boolean
    }): Promise<EngineInstance[]> {
        try {
            let query = `
                SELECT e.*, 
                       wt.name as template_name,
                       wt.description as template_description
                FROM engine_instances e
                LEFT JOIN workflow_templates wt ON e.template_id = wt.id
                WHERE 1=1
            `;
            const values: any[] = [];
            let paramIndex = 1;

            if (filters?.orgId) {
                query += ` AND e.org_id = $${paramIndex++}`;
                values.push(filters.orgId);
            }

            if (filters?.status) {
                query += ` AND e.status = $${paramIndex++}`;
                values.push(filters.status);
            }

            if (filters?.activeOnly) {
                query += ` AND e.status = 'active'`;
            }

            query += ` ORDER BY e.created_at DESC`;

            const result = await dbPool.query(query, values);
            return result.rows.map(row => this.mapRowToEngine(row));
        } catch (error) {
            console.error('Error fetching engines:', error);
            return [];
        }
    }

    /**
     * Get all engines (admin view - no filters)
     */
    async getAllEngines(): Promise<EngineInstance[]> {
        try {
            const query = `
                SELECT e.*, 
                       wt.name as template_name
                FROM engine_instances e
                LEFT JOIN workflow_templates wt ON e.template_id = wt.id
                ORDER BY e.created_at DESC
            `;

            const result = await dbPool.query(query);
            return result.rows.map(row => this.mapRowToEngine(row));
        } catch (error) {
            console.error('Error fetching all engines:', error);
            return [];
        }
    }

    /**
     * Get a single engine by ID
     */
    async getEngine(id: string): Promise<EngineInstance | null> {
        try {
            const query = `
                SELECT e.*, 
                       wt.name as template_name,
                       wt.nodes as template_nodes,
                       wt.edges as template_edges
                FROM engine_instances e
                LEFT JOIN workflow_templates wt ON e.template_id = wt.id
                WHERE e.id = $1
            `;

            const result = await dbPool.query(query, [id]);
            if (result.rows.length === 0) return null;

            return this.mapRowToEngine(result.rows[0]);
        } catch (error) {
            console.error('Error fetching engine:', error);
            return null;
        }
    }

    /**
     * Update an existing engine
     */
    async updateEngine(id: string, updates: Partial<EngineConfig>): Promise<EngineInstance | null> {
        try {
            // Build dynamic update query
            const updateFields: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (updates.name !== undefined) {
                updateFields.push(`name = $${paramIndex++}`);
                values.push(updates.name);
            }

            if (updates.description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                values.push(updates.description);
            }

            if (updates.status !== undefined) {
                updateFields.push(`status = $${paramIndex++}`);
                values.push(updates.status);
            }

            if (updates.orgId !== undefined) {
                updateFields.push(`org_id = $${paramIndex++}`);
                values.push(updates.orgId);
            }

            if (updates.kbId !== undefined) {
                updateFields.push(`kb_id = $${paramIndex++}`);
                values.push(updates.kbId);
            }

            if (updates.constitutionId !== undefined) {
                updateFields.push(`constitution_id = $${paramIndex++}`);
                values.push(updates.constitutionId);
            }

            if (updates.config !== undefined) {
                updateFields.push(`config = config || $${paramIndex++}::jsonb`);
                values.push(JSON.stringify(updates.config));
            }

            updateFields.push(`updated_at = NOW()`);

            if (updateFields.length === 1) {
                // Only updated_at, nothing else to update
                return this.getEngine(id);
            }

            values.push(id);

            const query = `
                UPDATE engine_instances
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await dbPool.query(query, values);
            if (result.rows.length === 0) return null;

            console.log(`✅ Engine updated: ${id}`);
            return this.mapRowToEngine(result.rows[0]);
        } catch (error) {
            console.error('Engine update error:', error);
            throw error;
        }
    }

    /**
     * Delete an engine
     */
    async deleteEngine(id: string): Promise<boolean> {
        try {
            const result = await dbPool.query(
                'DELETE FROM engine_instances WHERE id = $1',
                [id]
            );

            if (result.rowCount && result.rowCount > 0) {
                console.log(`✅ Engine deleted: ${id}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Engine deletion error:', error);
            throw error;
        }
    }

    /**
     * Duplicate an existing engine
     */
    async duplicateEngine(id: string, newName?: string): Promise<EngineInstance | null> {
        try {
            const original = await this.getEngine(id);
            if (!original) {
                throw new Error(`Engine ${id} not found`);
            }

            const config: EngineConfig = {
                name: newName || `${original.name} (Copy)`,
                description: original.description,
                templateId: original.templateId,
                orgId: original.orgId,
                kbId: original.kbId,
                constitutionId: original.constitutionId,
                flowConfig: original.config.flowConfig,
                executionMode: original.config.executionMode,
                tier: original.config.tier,
                status: 'disabled', // Duplicates start disabled
                config: original.config
            };

            return this.deployEngine(config);
        } catch (error) {
            console.error('Engine duplication error:', error);
            throw error;
        }
    }

    /**
     * Get engine statistics for analytics dashboard
     */
    async getEngineStats(timeRangeDays: number = 30): Promise<EngineStats> {
        try {
            // Get engine counts
            const enginesQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'active') as active,
                    COUNT(*) FILTER (WHERE config->>'tier' = 'hobby') as hobby,
                    COUNT(*) FILTER (WHERE config->>'tier' = 'pro') as pro,
                    COUNT(*) FILTER (WHERE config->>'tier' = 'enterprise') as enterprise
                FROM engine_instances
            `;
            const enginesResult = await dbPool.query(enginesQuery);
            const engineCounts = enginesResult.rows[0];

            // Get execution stats
            const executionsQuery = `
                SELECT 
                    COUNT(*) as total_executions,
                    COUNT(*) FILTER (WHERE status = 'completed') as successful,
                    COALESCE(SUM(tokens_used), 0) as total_tokens,
                    COALESCE(SUM(cost_usd), 0) as total_cost
                FROM engine_run_logs
                WHERE started_at >= NOW() - INTERVAL '${timeRangeDays} days'
            `;
            const executionsResult = await dbPool.query(executionsQuery);
            const execStats = executionsResult.rows[0];

            return {
                totalEngines: parseInt(engineCounts.total) || 0,
                activeEngines: parseInt(engineCounts.active) || 0,
                totalExecutions: parseInt(execStats.total_executions) || 0,
                successfulExecutions: parseInt(execStats.successful) || 0,
                totalTokensUsed: parseInt(execStats.total_tokens) || 0,
                totalCostEstimate: parseFloat(execStats.total_cost) || 0,
                enginesByTier: {
                    hobby: parseInt(engineCounts.hobby) || 0,
                    pro: parseInt(engineCounts.pro) || 0,
                    enterprise: parseInt(engineCounts.enterprise) || 0
                }
            };
        } catch (error) {
            console.error('Error fetching engine stats:', error);
            return {
                totalEngines: 0,
                activeEngines: 0,
                totalExecutions: 0,
                successfulExecutions: 0,
                totalTokensUsed: 0,
                totalCostEstimate: 0,
                enginesByTier: { hobby: 0, pro: 0, enterprise: 0 }
            };
        }
    }

    /**
     * Get statistics for a single engine
     */
    async getEngineSingleStats(engineId: string, timeRangeDays: number = 30): Promise<{
        runsToday: number;
        runsTotal: number;
        successRate: number;
        avgCost: number;
        avgDuration: number;
        lastRun: Date | null;
        errorRate: number;
        totalTokens: number;
        totalCost: number;
    } | null> {
        try {
            // Check engine exists
            const engineCheck = await dbPool.query(
                'SELECT id, runs_today, runs_total, last_run_at FROM engine_instances WHERE id = $1',
                [engineId]
            );

            if (engineCheck.rows.length === 0) {
                return null;
            }

            const engine = engineCheck.rows[0];

            // Get execution stats for this engine
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_runs,
                    COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
                    COALESCE(AVG(cost_usd), 0) as avg_cost,
                    COALESCE(AVG(duration_ms), 0) as avg_duration,
                    COALESCE(SUM(tokens_used), 0) as total_tokens,
                    COALESCE(SUM(cost_usd), 0) as total_cost
                FROM engine_run_logs
                WHERE engine_id = $1
                AND started_at >= NOW() - INTERVAL '${timeRangeDays} days'
            `;
            const statsResult = await dbPool.query(statsQuery, [engineId]);
            const stats = statsResult.rows[0];

            const totalRuns = parseInt(stats.total_runs) || 0;
            const successfulRuns = parseInt(stats.successful_runs) || 0;
            const failedRuns = parseInt(stats.failed_runs) || 0;

            return {
                runsToday: engine.runs_today || 0,
                runsTotal: engine.runs_total || 0,
                successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 100,
                avgCost: parseFloat(stats.avg_cost) || 0,
                avgDuration: parseFloat(stats.avg_duration) || 0,
                lastRun: engine.last_run_at ? new Date(engine.last_run_at) : null,
                errorRate: totalRuns > 0 ? (failedRuns / totalRuns) * 100 : 0,
                totalTokens: parseInt(stats.total_tokens) || 0,
                totalCost: parseFloat(stats.total_cost) || 0,
            };
        } catch (error) {
            console.error('Error fetching engine single stats:', error);
            return null;
        }
    }

    /**
     * Record engine run start
     */
    async startEngineRun(
        engineId: string,
        orgId: string | null,
        inputData: any
    ): Promise<string> {
        const runId = uuidv4();

        await dbPool.query(`
            INSERT INTO engine_run_logs (
                id, engine_id, org_id, status, input_data, started_at
            ) VALUES ($1, $2, $3, 'running', $4, NOW())
        `, [runId, engineId, orgId, JSON.stringify(inputData)]);

        // Increment run counters
        await dbPool.query(`
            UPDATE engine_instances 
            SET runs_today = runs_today + 1,
                runs_total = runs_total + 1,
                last_run_at = NOW()
            WHERE id = $1
        `, [engineId]);

        return runId;
    }

    /**
     * Record engine run completion
     */
    async completeEngineRun(
        runId: string,
        status: 'completed' | 'failed',
        outputData: any,
        tokensUsed: number,
        costUsd: number,
        durationMs: number,
        errorMessage?: string
    ): Promise<void> {
        await dbPool.query(`
            UPDATE engine_run_logs
            SET status = $2,
                output_data = $3,
                tokens_used = $4,
                cost_usd = $5,
                duration_ms = $6,
                error_message = $7,
                completed_at = NOW()
            WHERE id = $1
        `, [runId, status, JSON.stringify(outputData), tokensUsed, costUsd, durationMs, errorMessage]);
    }

    /**
     * Extract models from step configurations
     */
    extractModelsFromConfigurations(stepConfigurations: Record<string, any>): any[] {
        const allModels: any[] = [];

        Object.values(stepConfigurations || {}).forEach(config => {
            if (config.models && Array.isArray(config.models)) {
                config.models.forEach((model: any) => {
                    const exists = allModels.find(
                        m => m.service === model.service && m.modelId === model.modelId
                    );
                    if (!exists) {
                        allModels.push({
                            service: model.service,
                            model: model.modelId,
                            maxTokens: model.maxTokens || 2000
                        });
                    }
                });
            }
        });

        return allModels;
    }

    /**
     * Map database row to EngineInstance type
     */
    private mapRowToEngine(row: any): EngineInstance {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            templateId: row.template_id,
            orgId: row.org_id,
            kbId: row.kb_id,
            constitutionId: row.constitution_id,
            status: row.status,
            config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config || {},
            runsToday: row.runs_today || 0,
            runsTotal: row.runs_total || 0,
            lastRunAt: row.last_run_at ? new Date(row.last_run_at) : undefined,
            errorMessage: row.error_message,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}

// Export singleton instance
export const engineDeploymentService = new EngineDeploymentService();
