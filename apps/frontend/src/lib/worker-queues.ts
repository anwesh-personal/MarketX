import { Queue, QueueOptions } from 'bullmq'

export enum QueueName {
    // Existing
    KB_PROCESSING = 'kb-processing',
    CONVERSATION_SUMMARY = 'conversation-summary',
    ANALYTICS = 'analytics',

    // Brain System
    LEARNING_LOOP = 'learning-loop',
    DREAM_STATE = 'dream-state',
    FINE_TUNING = 'fine-tuning',

    // Execution (From Backend Consolidation)
    WORKFLOW_EXECUTION = 'workflow-execution',
    ENGINE_EXECUTION = 'engine-execution',
    SCHEDULED_TASK = 'scheduled-task',

    // Mastery Agents (strategic decisions)
    MASTERY_AGENT = 'mastery-agent',
}

// Support REDIS_URL (Railway format) or separate host/port/password
const connectionOptions = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    }

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
}

// Lazy queue initialization to prevent connection during build time
let _queues: {
    kbProcessing: Queue
    conversationSummary: Queue
    analytics: Queue
    learningLoop: Queue
    dreamState: Queue
    fineTuning: Queue
    workflowExecution: Queue
    engineExecution: Queue
    scheduledTask: Queue
    masteryAgent: Queue
} | null = null

function getQueues() {
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
                    priority: 2, // Higher priority - learning is important
                },
            }),

            dreamState: new Queue(QueueName.DREAM_STATE, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 3, // Lower priority - runs during idle
                    attempts: 5, // More retries for background tasks
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
                    priority: 1, // High priority - user-initiated
                    attempts: 3,
                },
            }),

            workflowExecution: new Queue(QueueName.WORKFLOW_EXECUTION, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 1, // Critical - user-facing execution
                    attempts: 3,
                },
            }),

            engineExecution: new Queue(QueueName.ENGINE_EXECUTION, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 1, // Critical - user-facing execution
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

            masteryAgent: new Queue(QueueName.MASTERY_AGENT, {
                ...defaultOptions,
                defaultJobOptions: {
                    ...defaultOptions.defaultJobOptions,
                    priority: 1,
                    attempts: 3,
                },
            }),
        }
    }
    return _queues
}

// Proxy object for lazy access - queues are created on first access
export const queues = new Proxy({} as {
    kbProcessing: Queue
    conversationSummary: Queue
    analytics: Queue
    learningLoop: Queue
    dreamState: Queue
    fineTuning: Queue
    workflowExecution: Queue
    engineExecution: Queue
    scheduledTask: Queue
    masteryAgent: Queue
}, {
    get(target, prop: string) {
        const actualQueues = getQueues()
        return actualQueues[prop as keyof typeof actualQueues]
    },
    ownKeys() {
        return ['kbProcessing', 'conversationSummary', 'analytics', 'learningLoop', 'dreamState', 'fineTuning', 'workflowExecution', 'engineExecution', 'scheduledTask', 'masteryAgent']
    },
    getOwnPropertyDescriptor(target, prop) {
        return {
            enumerable: true,
            configurable: true,
        }
    },
})

