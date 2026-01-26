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
}

const connectionOptions = {
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
}, {
    get(target, prop: string) {
        const actualQueues = getQueues()
        return actualQueues[prop as keyof typeof actualQueues]
    },
    ownKeys() {
        return ['kbProcessing', 'conversationSummary', 'analytics', 'learningLoop', 'dreamState', 'fineTuning']
    },
    getOwnPropertyDescriptor(target, prop) {
        return {
            enumerable: true,
            configurable: true,
        }
    },
})

