import { queues } from './worker-queues'

export async function enqueueKBProcessing(data: {
    kbId: string
    documentId: string
    content: string
    orgId: string  // REQUIRED - used to fetch AI provider from AI Management
    metadata?: Record<string, any>
}) {
    const job = await queues.kbProcessing.add('process-document', data, {
        jobId: `kb-${data.documentId}`,
    })

    return {
        jobId: job.id!,
        queueName: 'kb-processing',
    }
}

export async function enqueueConversationSummary(data: {
    conversationId: string
    orgId: string  // REQUIRED - used to fetch AI provider from AI Management
    messageCount?: number
}) {
    const job = await queues.conversationSummary.add('summarize', data, {
        jobId: `summary-${data.conversationId}-${Date.now()}`,
    })

    return {
        jobId: job.id!,
        queueName: 'conversation-summary',
    }
}

export async function enqueueAnalytics(data: {
    type: 'daily' | 'hourly' | 'realtime' | 'belief-confidence' | 'allocation-engine'
    date?: string
    orgId?: string
    lookbackDays?: number
}) {
    const job = await queues.analytics.add('aggregate', data, {
        jobId: `analytics-${data.type}-${data.date || Date.now()}`,
    })

    return {
        jobId: job.id!,
        queueName: 'analytics',
    }
}

export async function enqueueBeliefConfidenceRecompute(data: {
    orgId?: string
    lookbackDays?: number
}) {
    const payload = {
        type: 'belief-confidence' as const,
        orgId: data.orgId,
        lookbackDays: data.lookbackDays ?? 7,
    }
    const job = await queues.analytics.add('aggregate', payload, {
        jobId: `analytics-belief-confidence-${data.orgId || 'all'}-${Date.now()}`,
    })

    return {
        jobId: job.id!,
        queueName: 'analytics',
    }
}

export async function enqueueAllocationRebalance(data: {
    orgId?: string
    lookbackDays?: number
}) {
    const payload = {
        type: 'allocation-engine' as const,
        orgId: data.orgId,
        lookbackDays: data.lookbackDays ?? 14,
    }
    const job = await queues.analytics.add('aggregate', payload, {
        jobId: `analytics-allocation-engine-${data.orgId || 'all'}-${Date.now()}`,
    })

    return {
        jobId: job.id!,
        queueName: 'analytics',
    }
}

export async function getJobStatus(queueName: string, jobId: string) {
    const queue = (queues as any)[queueName]
    if (!queue) {
        throw new Error(`Queue ${queueName} not found`)
    }

    const job = await queue.getJob(jobId)
    if (!job) {
        return null
    }

    const state = await job.getState()

    return {
        id: job.id,
        name: job.name,
        state,
        progress: job.progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
    }
}
