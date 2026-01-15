import { Queue, QueueOptions } from 'bullmq'

export enum QueueName {
    KB_PROCESSING = 'kb-processing',
    CONVERSATION_SUMMARY = 'conversation-summary',
    ANALYTICS = 'analytics',
    LEARNING_LOOP = 'learning-loop',
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

export const queues = {
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
            priority: 3,
        },
    }),
}
