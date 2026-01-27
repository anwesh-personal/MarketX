import { Worker } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { summarizeConversation } from '../processors/conversation/summarizer'

const worker = new Worker(QueueName.CONVERSATION_SUMMARY, summarizeConversation, {
    connection: redisConfig,
    concurrency: 3,
    limiter: {
        max: 5,
        duration: 1000,
    },
})

worker.on('completed', (job) => {
    console.log(`✅ Conversation Job ${job.id} completed:`, job.returnvalue)
})

worker.on('failed', (job, err) => {
    console.error(`❌ Conversation Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ Conversation Job ${job.id} progress: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('Conversation Worker error:', err)
})

console.log('🚀 Conversation Worker started')

export default worker
