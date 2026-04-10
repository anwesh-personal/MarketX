import { Worker } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { processKBGeneration } from '../processors/kb/kb-generation-orchestrator'

const worker = new Worker(QueueName.KB_GENERATION, processKBGeneration, {
    connection: redisConfig,
    prefix: 'axiom:',
    concurrency: 1, // Sequential — only one KB generation at a time (heavy LLM usage)
    limiter: {
        max: 1,
        duration: 60000,
    },
})

worker.on('completed', (job) => {
    console.log(`✅ [KBGeneration] Job ${job.id} completed — questionnaire=${job.data.questionnaire_id}`)
})

worker.on('failed', (job, err) => {
    console.error(`❌ [KBGeneration] Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ [KBGeneration] Job ${job.id}: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('[KBGeneration] Worker error:', err)
})

worker.on('ready', () => {
    console.log(`📚 KB Generation Worker ready (queue: ${QueueName.KB_GENERATION}, concurrency: 1)`)
})

export default worker
