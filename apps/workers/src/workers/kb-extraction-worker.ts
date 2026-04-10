import { Worker } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { processKBExtraction } from '../processors/kb/kb-extraction-processor'

const worker = new Worker(QueueName.KB_EXTRACTION, processKBExtraction, {
    connection: redisConfig,
    prefix: 'axiom:',
    concurrency: 3,
    limiter: {
        max: 5,
        duration: 60000, // Max 5 extractions per minute (LLM rate limits)
    },
})

worker.on('completed', (job) => {
    console.log(`✅ [KBExtraction] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
    console.error(`❌ [KBExtraction] Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ [KBExtraction] Job ${job.id}: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('[KBExtraction] Worker error:', err)
})

worker.on('ready', () => {
    console.log(`🧠 KB Extraction Worker ready (queue: ${QueueName.KB_EXTRACTION}, concurrency: 3)`)
})

export default worker
