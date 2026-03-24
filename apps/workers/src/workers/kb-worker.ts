import { Worker } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { processKBDocument } from '../processors/kb/kb-processor'

const worker = new Worker(QueueName.KB_PROCESSING, processKBDocument, {
    connection: redisConfig,
    prefix: 'axiom:',
    concurrency: 5,
    limiter: {
        max: 10,
        duration: 1000,
    },
})

worker.on('completed', (job) => {
    console.log(`✅ KB Job ${job.id} completed:`, job.returnvalue)
})

worker.on('failed', (job, err) => {
    console.error(`❌ KB Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ KB Job ${job.id} progress: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('KB Worker error:', err)
})

console.log('🚀 KB Worker started')

export default worker
