import { Worker } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { aggregateAnalytics } from '../processors/analytics/aggregator'

const worker = new Worker(QueueName.ANALYTICS, aggregateAnalytics, {
    connection: redisConfig,
    prefix: 'axiom:',
    concurrency: 2,
    limiter: {
        max: 3,
        duration: 1000,
    },
})

worker.on('completed', (job) => {
    console.log(`✅ Analytics Job ${job.id} completed:`, job.returnvalue)
})

worker.on('failed', (job, err) => {
    console.error(`❌ Analytics Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ Analytics Job ${job.id} progress: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('Analytics Worker error:', err)
})

console.log('🚀 Analytics Worker started')

export default worker
