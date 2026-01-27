/**
 * AXIOM QUEUE SERVICE (Redis/BullMQ)
 * ==================================
 * Connects to Redis to push jobs to the worker queues.
 * Acts as the Producer for the Worker System.
 */

import { Queue, QueueOptions, Job, JobsOptions } from 'bullmq';
import { EventEmitter } from 'events';

// Re-export types for consumers
export type { Job, JobsOptions } from 'bullmq';

// Queue Names must match apps/frontend/src/lib/worker-queues.ts
export enum QueueName {
    KB_PROCESSING = 'kb-processing',
    CONVERSATION_SUMMARY = 'conversation-summary',
    ANALYTICS = 'analytics',
    LEARNING_LOOP = 'learning-loop',
    DREAM_STATE = 'dream-state',
    FINE_TUNING = 'fine-tuning',
    WORKFLOW_EXECUTION = 'workflow-execution', // Fixed: was 'workflow-execute'
}

// Redis Connection Options
const connectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
};

const defaultOptions: QueueOptions = {
    connection: connectionOptions,
    prefix: 'axiom:',
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
};

class QueueService {
    private queues: Map<string, Queue> = new Map();

    /**
     * Get or create a queue instance
     */
    private getQueue(name: string): Queue {
        if (!this.queues.has(name)) {
            console.log(`🔌 Connecting to queue: ${name}`);
            this.queues.set(name, new Queue(name, defaultOptions));
        }
        return this.queues.get(name)!;
    }

    /**
     * Helper getters for specific queues
     */
    get kbProcessing() { return this.getQueue(QueueName.KB_PROCESSING); }
    get conversationSummary() { return this.getQueue(QueueName.CONVERSATION_SUMMARY); }
    get analytics() { return this.getQueue(QueueName.ANALYTICS); }
    get learningLoop() { return this.getQueue(QueueName.LEARNING_LOOP); }
    get dreamState() { return this.getQueue(QueueName.DREAM_STATE); }
    get fineTuning() { return this.getQueue(QueueName.FINE_TUNING); }
    get workflowExecution() { return this.getQueue(QueueName.WORKFLOW_EXECUTION); }

    /**
     * Add a job to a queue
     * Generic method for adding jobs to any queue
     */
    async add<T = any>(
        queueName: string,
        jobName: string,
        data: T,
        opts?: JobsOptions
    ): Promise<Job<T>> {
        const queue = this.getQueue(queueName);
        return queue.add(jobName, data, opts);
    }

    /**
     * Close all connections
     */
    async close() {
        await Promise.all(
            Array.from(this.queues.values()).map(q => q.close())
        );
        this.queues.clear();
    }
}

// Export singleton
export const queueService = new QueueService();
