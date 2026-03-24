import { Worker } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { processWorkflowExecution } from '../processors/workflow/workflow-processor'

const worker = new Worker(QueueName.WORKFLOW_EXECUTION, processWorkflowExecution, {
    connection: redisConfig,
    prefix: 'axiom:',
    concurrency: 10, // Higher concurrency for workflow execution
    limiter: {
        max: 20,
        duration: 1000,
    },
})

worker.on('completed', (job) => {
    console.log(`✅ Workflow ${job.id} completed:`, job.returnvalue?.success ? 'SUCCESS' : 'FAILURE')
})

worker.on('failed', (job, err) => {
    console.error(`❌ Workflow ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    const p = progress as { status?: string; percentage?: number; currentNode?: string }
    console.log(`⏳ Workflow ${job.id}: ${p.status} - ${p.currentNode || ''} (${p.percentage || 0}%)`)
})

worker.on('error', (err) => {
    console.error('Workflow Execution Worker error:', err)
})

console.log('🚀 Workflow Execution Worker started')

export default worker
