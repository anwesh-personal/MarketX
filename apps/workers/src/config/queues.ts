/**
 * AXIOM Worker Queue Definitions
 * 
 * This file defines the BullMQ queues used by the worker system.
 * Standalone implementation - does not depend on frontend.
 */

import { Queue, QueueOptions } from 'bullmq';

// ============================================================================
// QUEUE NAMES
// ============================================================================

export enum QueueName {
    // Existing
    KB_PROCESSING = 'kb-processing',
    CONVERSATION_SUMMARY = 'conversation-summary',
    ANALYTICS = 'analytics',

    // Brain System
    LEARNING_LOOP = 'learning-loop',
    DREAM_STATE = 'dream-state',
    FINE_TUNING = 'fine-tuning',

    // Execution
    WORKFLOW_EXECUTION = 'workflow-execution',
    ENGINE_EXECUTION = 'engine-execution',
    SCHEDULED_TASK = 'scheduled-task',
}

// ============================================================================
// CONNECTION CONFIGURATION
// ============================================================================

export function getRedisConnectionOptions() {
    if (process.env.REDIS_URL) {
        // Parse REDIS_URL for BullMQ compatibility (Railway format)
        const url = new URL(process.env.REDIS_URL);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            maxRetriesPerRequest: null,
        };
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    };
}

const defaultOptions: QueueOptions = {
    connection: getRedisConnectionOptions(),
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

// ============================================================================
// QUEUE INSTANCES (Lazy Initialization)
// ============================================================================

interface QueueInstances {
    kbProcessing: Queue;
    conversationSummary: Queue;
    analytics: Queue;
    learningLoop: Queue;
    dreamState: Queue;
    fineTuning: Queue;
    workflowExecution: Queue;
    engineExecution: Queue;
    scheduledTask: Queue;
}

let _queues: QueueInstances | null = null;

function getQueues(): QueueInstances {
    if (!_queues) {
        _queues = {
            kbProcessing: new Queue(QueueName.KB_PROCESSING, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 1,
                },
            }),

            conversationSummary: new Queue(QueueName.CONVERSATION_SUMMARY, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 2,
                },
            }),

            analytics: new Queue(QueueName.ANALYTICS, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 3,
                },
            }),

            learningLoop: new Queue(QueueName.LEARNING_LOOP, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 2,
                },
            }),

            dreamState: new Queue(QueueName.DREAM_STATE, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 3,
                    attempts: 5,
                    backoff: {
                        type: 'exponential',
                        delay: 10000,
                    },
                },
            }),

            fineTuning: new Queue(QueueName.FINE_TUNING, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 1,
                    attempts: 3,
                },
            }),

            workflowExecution: new Queue(QueueName.WORKFLOW_EXECUTION, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 1,
                    attempts: 3,
                },
            }),

            engineExecution: new Queue(QueueName.ENGINE_EXECUTION, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 1,
                    attempts: 3,
                },
            }),

            scheduledTask: new Queue(QueueName.SCHEDULED_TASK, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 2,
                    attempts: 5,
                    backoff: {
                        type: 'exponential',
                        delay: 60000,
                    },
                },
            }),
        };
    }
    return _queues;
}

// Proxy for lazy access
export const queues = new Proxy({} as QueueInstances, {
    get(target, prop: string) {
        const actualQueues = getQueues();
        return actualQueues[prop as keyof typeof actualQueues];
    },
    ownKeys() {
        return [
            'kbProcessing',
            'conversationSummary',
            'analytics',
            'learningLoop',
            'dreamState',
            'fineTuning',
            'workflowExecution',
            'engineExecution',
            'scheduledTask',
        ];
    },
    getOwnPropertyDescriptor() {
        return {
            enumerable: true,
            configurable: true,
        };
    },
});
