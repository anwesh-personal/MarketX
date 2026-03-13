/**
 * SCHEDULED TASK WORKER
 * =====================
 * Processes jobs on the `scheduled-task` queue.
 *
 * Job types:
 *   - dream_cycle        → push to dream-state queue
 *   - learning_loop      → push to learning-loop queue
 *   - kb_reprocess       → push to kb-processing queue
 *   - analytics_rollup   → push to analytics queue
 *   - custom             → log and acknowledge (noop)
 *
 * Designed for cron-triggered or event-triggered scheduled work.
 * The worker itself does not schedule — it only processes jobs placed here.
 * Use an external scheduler (pg_cron, GitHub Actions, Railway Cron) to enqueue jobs.
 */

import { Worker, Job, Queue } from 'bullmq';
import { QueueName, getRedisConnectionOptions } from '../config/queues';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledTaskJob {
    taskType:
        | 'dream_cycle'
        | 'learning_loop'
        | 'kb_reprocess'
        | 'analytics_rollup'
        | 'custom';
    orgId?: string;
    agentId?: string;
    payload?: Record<string, any>;
    /** Human-readable label for logs */
    label?: string;
}

// ============================================================================
// DOWNSTREAM QUEUE REFS
// ============================================================================

const connection = getRedisConnectionOptions();

const dreamStateQueue    = new Queue(QueueName.DREAM_STATE,    { connection, prefix: 'axiom:' });
const learningLoopQueue  = new Queue(QueueName.LEARNING_LOOP,  { connection, prefix: 'axiom:' });
const kbProcessingQueue  = new Queue(QueueName.KB_PROCESSING,  { connection, prefix: 'axiom:' });
const analyticsQueue     = new Queue(QueueName.ANALYTICS,      { connection, prefix: 'axiom:' });

// ============================================================================
// PROCESSOR
// ============================================================================

async function processScheduledTask(job: Job<ScheduledTaskJob>) {
    const { taskType, orgId, agentId, payload = {}, label } = job.data;
    const tag = label || taskType;

    console.log(`⏰ [ScheduledTask] Processing: ${tag} | org=${orgId || 'global'}`);

    switch (taskType) {

        case 'dream_cycle': {
            await dreamStateQueue.add('scheduled_dream_cycle', {
                jobType: 'full_dream_cycle',
                orgId,
                agentId,
                triggeredBy: 'scheduler',
                ...payload,
            });
            console.log(`✅ [ScheduledTask] dream_cycle dispatched for org=${orgId}`);
            break;
        }

        case 'learning_loop': {
            await learningLoopQueue.add('scheduled_learning_loop', {
                jobType: 'daily_optimization',
                orgId,
                agentId,
                triggeredBy: 'scheduler',
                ...payload,
            });
            console.log(`✅ [ScheduledTask] learning_loop dispatched for org=${orgId}`);
            break;
        }

        case 'kb_reprocess': {
            if (!payload.documentId && !payload.sectionId) {
                console.warn(`[ScheduledTask] kb_reprocess requires documentId or sectionId`);
                break;
            }
            await kbProcessingQueue.add('scheduled_kb_reprocess', {
                documentId: payload.documentId,
                sectionId: payload.sectionId,
                orgId,
                agentId,
                triggeredBy: 'scheduler',
                forceReembed: payload.forceReembed ?? false,
            });
            console.log(`✅ [ScheduledTask] kb_reprocess dispatched for org=${orgId}`);
            break;
        }

        case 'analytics_rollup': {
            await analyticsQueue.add('scheduled_analytics_rollup', {
                rollupType: payload.rollupType || 'daily',
                orgId,
                date: payload.date || new Date().toISOString().split('T')[0],
                triggeredBy: 'scheduler',
            });
            console.log(`✅ [ScheduledTask] analytics_rollup dispatched for org=${orgId}`);
            break;
        }

        case 'custom': {
            console.log(`[ScheduledTask] Custom task acknowledged:`, JSON.stringify(payload).substring(0, 200));
            break;
        }

        default: {
            console.warn(`[ScheduledTask] Unknown taskType: ${taskType} — job acknowledged`);
        }
    }

    return { success: true, taskType, orgId };
}

// ============================================================================
// WORKER SETUP
// ============================================================================

const worker = new Worker<ScheduledTaskJob>(
    QueueName.SCHEDULED_TASK,
    processScheduledTask,
    {
        connection,
        concurrency: 5,
        limiter: {
            max: 20,
            duration: 60000,
        },
    }
);

worker.on('completed', (job, result) => {
    console.log(`✅ [ScheduledTask] Job ${job.id} done: ${result.taskType}`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ [ScheduledTask] Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
    console.error('[ScheduledTask] Worker error:', err);
});

worker.on('ready', () => {
    console.log(`🚀 Scheduled Task Worker ready (queue: ${QueueName.SCHEDULED_TASK})`);
});

export { worker as scheduledTaskWorker };
export default worker;
