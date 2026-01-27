/**
 * ENGINE EXECUTION WORKER
 * =======================
 * Processes async workflow/engine execution jobs from the queue.
 * 
 * This worker lives in apps/workers (consumer) and processes jobs
 * queued by apps/backend (producer).
 * 
 * Queue: workflow-execute
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { workflowExecutionService } from '../processors/workflow-execution-processor';

// ============================================================================
// TYPES
// ============================================================================

export interface EngineExecutionJob {
    executionId: string;
    engineId: string;
    engine: {
        id: string;
        name: string;
        config: any;
        status: string;
    };
    userId: string;
    orgId?: string;
    input: Record<string, any>;
    options?: {
        tier?: 'hobby' | 'pro' | 'enterprise';
        timeout?: number;
    };
}

export interface EngineExecutionResult {
    success: boolean;
    executionId: string;
    output?: any;
    tokensUsed?: number;
    cost?: number;
    durationMs?: number;
    error?: string;
}

// ============================================================================
// REDIS CONFIGURATION
// ============================================================================

const getRedisConfig = () => {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        const url = new URL(redisUrl);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
        };
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    };
};

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// ============================================================================
// JOB PROCESSOR
// ============================================================================

async function processEngineExecution(job: Job<EngineExecutionJob>): Promise<EngineExecutionResult> {
    const { executionId, engineId, engine, userId, orgId, input, options } = job.data;
    const startTime = Date.now();

    console.log(`⚡ Processing engine execution: ${executionId}`);
    console.log(`   Engine: ${engine.name} (${engineId})`);
    console.log(`   User: ${userId}`);

    try {
        // Update status to running
        await updateExecutionStatus(executionId, 'running');

        // Get workflow configuration from engine
        const flowConfig = engine.config?.flowConfig;
        if (!flowConfig || !flowConfig.nodes || !flowConfig.edges) {
            throw new Error('Engine has no valid workflow configuration');
        }

        // Execute workflow directly using ported processor (NO BACKEND CALLBACK!)
        const result = await workflowExecutionService.executeWorkflow(
            flowConfig.nodes,
            flowConfig.edges,
            input,
            executionId,
            (update) => {
                // Progress callback - log for now (will add Redis publishing)
                console.log(`[Progress ${executionId}] ${update.nodeName}: ${update.status}`);
            },
            {
                executionId,
                userId,
                tier: options?.tier || 'hobby',
                orgId,
            },
            {
                engineId,
            }
        );

        const durationMs = Date.now() - startTime;

        if (result.success) {
            await updateExecutionStatus(executionId, 'completed', {
                result: result.lastNodeOutput?.content,
                tokensUsed: result.tokenUsage?.totalTokens,
                cost: result.tokenUsage?.totalCost,
                durationMs,
            });

            console.log(`✅ Engine execution completed: ${executionId} (${durationMs}ms)`);

            return {
                success: true,
                executionId,
                output: result.lastNodeOutput?.content,
                tokensUsed: result.tokenUsage?.totalTokens,
                cost: result.tokenUsage?.totalCost,
                durationMs,
            };
        } else {
            throw new Error(result.error || 'Execution failed without error message');
        }

    } catch (error: any) {
        const durationMs = Date.now() - startTime;
        console.error(`❌ Engine execution failed: ${executionId} - ${error.message}`);

        await updateExecutionStatus(executionId, 'failed', {
            error: error.message,
            durationMs,
        });

        return {
            success: false,
            executionId,
            error: error.message,
            durationMs,
        };
    }
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function updateExecutionStatus(
    executionId: string,
    status: string,
    data?: {
        result?: any;
        tokensUsed?: number;
        cost?: number;
        durationMs?: number;
        error?: string;
    }
): Promise<void> {
    if (!supabase) {
        console.warn('⚠️ No Supabase client - skipping DB update');
        return;
    }

    const updates: Record<string, any> = { status };

    if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
    }

    if (data?.error) {
        updates.error_message = data.error;
    }

    if (data?.tokensUsed !== undefined) {
        updates.tokens_used = data.tokensUsed;
    }

    if (data?.cost !== undefined) {
        updates.cost_usd = data.cost;
    }

    if (data?.durationMs !== undefined) {
        updates.duration_ms = data.durationMs;
    }

    if (data?.result !== undefined) {
        updates.output_data = { finalOutput: data.result };
    }

    const { error } = await supabase
        .from('engine_run_logs')
        .update(updates)
        .eq('id', executionId);

    if (error) {
        console.error(`Failed to update execution status: ${error.message}`);
    }
}

// ============================================================================
// WORKER SETUP
// ============================================================================

const QUEUE_NAME = 'workflow-execution'; // Fixed: was 'workflow-execute'

const worker = new Worker<EngineExecutionJob, EngineExecutionResult>(
    QUEUE_NAME,
    processEngineExecution,
    {
        connection: getRedisConfig(),
        concurrency: 2,
        limiter: {
            max: 10,
            duration: 60000, // 10 jobs per minute max
        },
    }
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed: ${result.success ? 'success' : 'failed'}`);
});

worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed: ${error.message}`);
});

worker.on('error', (error) => {
    console.error('Worker error:', error);
});

worker.on('ready', () => {
    console.log(`🚀 Engine Execution Worker ready (queue: ${QUEUE_NAME})`);
});

// ============================================================================
// EXPORTS
// ============================================================================

export { worker as engineExecutionWorker };
export default worker;
