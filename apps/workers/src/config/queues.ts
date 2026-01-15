import { Queue, QueueOptions } from 'bullmq'
import { redisConfig } from './redis'

export enum QueueName {
    KB_PROCESSING = 'kb-processing',
    CONVERSATION_SUMMARY = 'conversation-summary',
    ANALYTICS = 'analytics',
    LEARNING_LOOP = 'learning-loop',
}

const defaultOptions: QueueOptions = {
    ...redisConfig,
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
