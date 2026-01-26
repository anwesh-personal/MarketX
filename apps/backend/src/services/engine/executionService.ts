/**
 * AXIOM EXECUTION SERVICE
 * Main orchestrator for workflow/engine execution
 * 
 * Handles:
 * - Sync execution (direct API call, wait for result)
 * - Async execution (queue-based, return job ID)
 * - Token deduction and tracking
 * - Execution logging
 * 
 * Full port from Lekhika's executionService.js
 * Production-grade from Day 1.
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { workflowExecutionService, ExecutionResult, ProgressUpdate, ExecutionOptions } from '../workflow/workflowExecutionService';
import { engineDeploymentService, EngineInstance } from '../engine/engineDeploymentService';
import { aiService } from '../ai/aiService';
import { queueService } from '../queue/queueService';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecuteEngineParams {
    engineId: string;
    userId: string;
    orgId?: string;
    input: Record<string, any>;
    options?: {
        tier?: 'hobby' | 'pro' | 'enterprise';
        executionMode?: 'sync' | 'async';
        timeout?: number;
    };
}

export interface ExecuteEngineResult {
    executionId: string;
    status: 'completed' | 'running' | 'failed' | 'queued';
    result?: ExecutionResult;
    jobId?: string;
    error?: string;
}

// ============================================================================
// EXECUTION SERVICE
// ============================================================================

class ExecutionService {
    private dbPool: Pool | null = null;
    private activeExecutions: Map<string, any> = new Map();
    private maxConcurrent = 5;

    /**
     * Initialize the service
     */
    async initialize(pool: Pool): Promise<void> {
        this.dbPool = pool;
        await aiService.initialize(pool);
        workflowExecutionService.initialize(pool);

        // Register queue processor for async execution
        queueService.process('workflow.execute', async (job) => {
            return this.processQueuedExecution(job.data);
        }, { concurrency: 2 });

        console.log('✅ Execution Service initialized');
    }

    /**
     * Execute an engine (main entry point)
     */
    async executeEngine(params: ExecuteEngineParams): Promise<ExecuteEngineResult> {
        const { engineId, userId, orgId, input, options } = params;
        const executionMode = options?.executionMode || 'sync';

        console.log(`🚀 Execute engine request: ${engineId}`);
        console.log(`   Mode: ${executionMode}, User: ${userId}`);

        // Check capacity
        if (this.activeExecutions.size >= this.maxConcurrent) {
            if (executionMode === 'sync') {
                throw new Error(`Server at capacity (${this.activeExecutions.size}/${this.maxConcurrent}). Try async mode.`);
            }
        }

        // Load engine configuration
        const engine = await engineDeploymentService.getEngine(engineId);
        if (!engine) {
            throw new Error(`Engine not found: ${engineId}`);
        }

        if (engine.status !== 'active') {
            throw new Error(`Engine is not active: ${engine.status}`);
        }

        // Create execution record
        const executionId = await this.createExecutionRecord(engine, userId, orgId, input);

        if (executionMode === 'async') {
            // Queue for async processing
            const job = queueService.add('workflow.execute', 'engine-execution', {
                executionId,
                engineId,
                engine,
                userId,
                orgId,
                input,
                options
            });

            return {
                executionId,
                status: 'queued',
                jobId: job.id
            };
        }

        // Sync execution
        try {
            const result = await this.runExecution(executionId, engine, userId, orgId, input, options);

            return {
                executionId,
                status: result.success ? 'completed' : 'failed',
                result,
                error: result.error
            };
        } catch (error: any) {
            await this.updateExecutionStatus(executionId, 'failed', { error: error.message });

            return {
                executionId,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Process a queued execution
     */
    private async processQueuedExecution(data: any): Promise<ExecutionResult> {
        const { executionId, engine, userId, orgId, input, options } = data;

        try {
            const result = await this.runExecution(executionId, engine, userId, orgId, input, options);
            return result;
        } catch (error: any) {
            await this.updateExecutionStatus(executionId, 'failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run the actual execution
     */
    private async runExecution(
        executionId: string,
        engine: EngineInstance,
        userId: string,
        orgId: string | undefined,
        input: Record<string, any>,
        options?: any
    ): Promise<ExecutionResult> {
        const startTime = Date.now();

        // Mark as active
        this.activeExecutions.set(executionId, {
            status: 'running',
            startTime,
            userId,
            engineId: engine.id
        });

        try {
            await this.updateExecutionStatus(executionId, 'running');

            // Get workflow from engine config
            const flowConfig = engine.config?.flowConfig;
            if (!flowConfig || !flowConfig.nodes || !flowConfig.edges) {
                throw new Error('Engine has no valid workflow configuration');
            }

            // Progress callback to update DB
            const progressCallback = async (update: ProgressUpdate) => {
                await this.updateExecutionProgress(executionId, update);
            };

            // Execute workflow with engine context for KB loading
            const result = await workflowExecutionService.executeWorkflow(
                flowConfig.nodes,
                flowConfig.edges,
                input,
                executionId,
                progressCallback,
                {
                    executionId,
                    userId,
                    orgId,
                    tier: options?.tier || engine.config?.tier || 'hobby'
                },
                { engineId: engine.id } // Pass engineId for KB loading
            );

            // Update completion
            if (result.success) {
                await this.updateExecutionStatus(executionId, 'completed', {
                    result: result.lastNodeOutput?.content,
                    tokensUsed: result.tokenUsage.totalTokens,
                    cost: result.tokenUsage.totalCost,
                    durationMs: result.durationMs
                });

                // Deduct tokens from user balance
                if (result.tokenUsage.totalTokens > 0) {
                    await this.deductUserTokens(userId, result.tokenUsage.totalTokens, executionId);
                }
            } else {
                await this.updateExecutionStatus(executionId, 'failed', {
                    error: result.error
                });
            }

            return result;

        } finally {
            this.activeExecutions.delete(executionId);
        }
    }

    /**
     * Create execution record in database
     */
    private async createExecutionRecord(
        engine: EngineInstance,
        userId: string,
        orgId: string | undefined,
        input: Record<string, any>
    ): Promise<string> {
        const executionId = uuidv4();

        if (this.dbPool) {
            await this.dbPool.query(`
                INSERT INTO engine_run_logs (
                    id, engine_id, org_id, status, input_data, started_at
                ) VALUES ($1, $2, $3, 'pending', $4, NOW())
            `, [executionId, engine.id, orgId, JSON.stringify(input)]);
        }

        // Also update engine run counters
        await engineDeploymentService.startEngineRun(engine.id, orgId || null, input);

        return executionId;
    }

    /**
     * Update execution status
     */
    private async updateExecutionStatus(
        executionId: string,
        status: string,
        data?: Record<string, any>
    ): Promise<void> {
        if (!this.dbPool) return;

        const updates: string[] = [`status = $2`];
        const values: any[] = [executionId, status];
        let paramIndex = 3;

        if (status === 'completed' || status === 'failed') {
            updates.push(`completed_at = NOW()`);
        }

        if (data?.error) {
            updates.push(`error_message = $${paramIndex++}`);
            values.push(data.error);
        }

        if (data?.tokensUsed !== undefined) {
            updates.push(`tokens_used = $${paramIndex++}`);
            values.push(data.tokensUsed);
        }

        if (data?.cost !== undefined) {
            updates.push(`cost_usd = $${paramIndex++}`);
            values.push(data.cost);
        }

        if (data?.durationMs !== undefined) {
            updates.push(`duration_ms = $${paramIndex++}`);
            values.push(data.durationMs);
        }

        if (data?.result !== undefined) {
            updates.push(`output_data = $${paramIndex++}`);
            values.push(JSON.stringify({ finalOutput: data.result }));
        }

        await this.dbPool.query(
            `UPDATE engine_run_logs SET ${updates.join(', ')} WHERE id = $1`,
            values
        );
    }

    /**
     * Update execution progress
     */
    private async updateExecutionProgress(
        executionId: string,
        update: ProgressUpdate
    ): Promise<void> {
        if (!this.dbPool) return;

        // Store progress in node_execution_log JSONB column
        const progressData = {
            nodeId: update.nodeId,
            nodeName: update.nodeName,
            progress: update.progress,
            status: update.status,
            nodeIndex: update.nodeIndex,
            totalNodes: update.totalNodes,
            tokens: update.tokens,
            cost: update.cost,
            timestamp: new Date().toISOString()
        };

        await this.dbPool.query(`
            UPDATE engine_run_logs
            SET node_execution_log = COALESCE(node_execution_log, '[]'::jsonb) || $2::jsonb
            WHERE id = $1
        `, [executionId, JSON.stringify([progressData])]);
    }

    /**
     * Deduct tokens from user balance
     */
    private async deductUserTokens(
        userId: string,
        tokens: number,
        executionId: string
    ): Promise<void> {
        if (!this.dbPool) return;

        try {
            // Log token usage
            await this.dbPool.query(`
                INSERT INTO token_usage_logs (
                    id, user_id, tokens, change_type, reason, reference_id, created_at
                ) VALUES ($1, $2, $3, 'debit', 'workflow_execution', $4, NOW())
            `, [uuidv4(), userId, tokens, executionId]);

            // Update user token balance (if you have such a column)
            // await this.dbPool.query(`
            //     UPDATE users SET token_balance = token_balance - $1 WHERE id = $2
            // `, [tokens, userId]);

            console.log(`💰 Deducted ${tokens} tokens from user ${userId}`);
        } catch (error) {
            console.error('Failed to deduct tokens:', error);
        }
    }

    /**
     * Get execution status
     */
    async getExecutionStatus(executionId: string): Promise<any> {
        if (!this.dbPool) return null;

        const result = await this.dbPool.query(
            `SELECT * FROM engine_run_logs WHERE id = $1`,
            [executionId]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            engineId: row.engine_id,
            status: row.status,
            progress: row.node_execution_log?.length || 0,
            tokensUsed: row.tokens_used,
            cost: row.cost_usd,
            durationMs: row.duration_ms,
            error: row.error_message,
            startedAt: row.started_at,
            completedAt: row.completed_at
        };
    }

    /**
     * Stop a running execution
     */
    stopExecution(executionId: string): void {
        workflowExecutionService.stopWorkflow(executionId);
    }

    /**
     * Get active execution count
     */
    getActiveCount(): number {
        return this.activeExecutions.size;
    }

    /**
     * Get active executions
     */
    getActiveExecutions(): string[] {
        return Array.from(this.activeExecutions.keys());
    }
}

// Export singleton instance
export const executionService = new ExecutionService();
