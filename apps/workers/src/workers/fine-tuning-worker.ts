import { Worker, Job } from 'bullmq'
import { QueueName } from '../config/queues'
import { redisConfig } from '../config/redis'
import { Pool } from 'pg'

/**
 * FINE-TUNING WORKER
 * ==================
 * Handles fine-tuning pipeline jobs:
 * - collect: Gather training examples from feedback
 * - format: Prepare data in provider format (OpenAI, Anthropic, Google)
 * - submit: Submit fine-tuning job to provider
 * - monitor: Check job status
 * - deploy: Update model registry with new model
 * 
 * NO INTERNAL SCHEDULER - Jobs queued by API or external triggers
 */

interface FineTuningJob {
    type: 'collect' | 'format' | 'submit' | 'monitor' | 'deploy' | 'full_pipeline'
    orgId: string
    brainTemplateId?: string
    provider?: 'openai' | 'anthropic' | 'google'
    jobId?: string // For monitor/deploy steps
    config?: {
        minExamples?: number
        modelBase?: string
        epochs?: number
    }
}

interface TrainingExample {
    input: string
    output: string
    rating: number
}

const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
})

async function processFineTuningJob(job: Job<FineTuningJob>) {
    const { type, orgId, brainTemplateId, provider = 'openai', jobId, config } = job.data
    console.log(`🎯 [Fine-Tune] Processing ${type} for org ${orgId}`)

    const startTime = Date.now()

    try {
        switch (type) {
            case 'collect': {
                // Collect positive feedback examples
                const examples = await pool.query(`
                    SELECT 
                        m_user.content as input,
                        m_assistant.content as output,
                        f.rating
                    FROM feedback f
                    JOIN messages m_user ON m_user.conversation_id = f.conversation_id AND m_user.role = 'user'
                    JOIN messages m_assistant ON m_assistant.conversation_id = f.conversation_id AND m_assistant.role = 'assistant'
                    JOIN conversations c ON c.id = f.conversation_id
                    WHERE c.org_id = $1
                    AND f.rating >= 4
                    AND f.created_at > NOW() - INTERVAL '30 days'
                    ORDER BY f.created_at DESC
                    LIMIT 1000
                `, [orgId])

                console.log(`🎯 Collected ${examples.rowCount} training examples`)

                return {
                    type,
                    examplesCollected: examples.rowCount,
                    examples: examples.rows
                }
            }

            case 'format': {
                // Format examples for the target provider
                const collected = job.data.config?.examples || []
                const formatted: object[] = []

                for (const ex of collected as TrainingExample[]) {
                    if (provider === 'openai') {
                        formatted.push({
                            messages: [
                                { role: 'user', content: ex.input },
                                { role: 'assistant', content: ex.output }
                            ]
                        })
                    } else if (provider === 'anthropic') {
                        formatted.push({
                            prompt: `\n\nHuman: ${ex.input}\n\nAssistant:`,
                            completion: ` ${ex.output}`
                        })
                    } else if (provider === 'google') {
                        formatted.push({
                            text_input: ex.input,
                            output: ex.output
                        })
                    }
                }

                console.log(`🎯 Formatted ${formatted.length} examples for ${provider}`)

                return { type, provider, formattedCount: formatted.length, formatted }
            }

            case 'submit': {
                // Submit fine-tuning job to provider
                // In production, this would call the actual API
                const formatted = job.data.config?.formatted || []

                if (formatted.length < (config?.minExamples || 10)) {
                    throw new Error(`Insufficient examples: ${formatted.length} < ${config?.minExamples || 10}`)
                }

                // Simulate job submission
                const newJobId = `ft-${Date.now()}-${orgId.slice(0, 8)}`

                // Record in database
                await pool.query(`
                    INSERT INTO brain_version_history (brain_template_id, version, config, change_summary)
                    VALUES ($1, $2, $3, $4)
                `, [
                    brainTemplateId,
                    `fine-tune-${newJobId}`,
                    { provider, exampleCount: formatted.length, jobId: newJobId },
                    `Fine-tuning job submitted with ${formatted.length} examples`
                ])

                console.log(`🎯 Submitted fine-tuning job: ${newJobId}`)

                return { type, jobId: newJobId, status: 'submitted', exampleCount: formatted.length }
            }

            case 'monitor': {
                // Check fine-tuning job status
                if (!jobId) throw new Error('jobId required for monitor')

                // In production, poll the actual API
                // For now, simulate progress
                const statuses = ['validating', 'running', 'running', 'succeeded']
                const status = statuses[Math.floor(Math.random() * statuses.length)]

                console.log(`🎯 Job ${jobId} status: ${status}`)

                return { type, jobId, status }
            }

            case 'deploy': {
                // Deploy the fine-tuned model
                if (!jobId) throw new Error('jobId required for deploy')

                // Update brain template with new model
                await pool.query(`
                    UPDATE brain_templates
                    SET config = jsonb_set(config, '{fineTunedModel}', $1::jsonb),
                        updated_at = NOW()
                    WHERE id = $2
                `, [JSON.stringify({ jobId, deployedAt: new Date().toISOString() }), brainTemplateId])

                console.log(`🎯 Deployed fine-tuned model from job ${jobId}`)

                return { type, jobId, status: 'deployed' }
            }

            case 'full_pipeline': {
                // Run the complete pipeline
                console.log('🎯 Running full fine-tuning pipeline...')

                // Step 1: Collect
                const collectResult = await processFineTuningJob({
                    ...job,
                    data: { ...job.data, type: 'collect' }
                } as Job<FineTuningJob>)

                if (!collectResult.examplesCollected || collectResult.examplesCollected < 10) {
                    throw new Error('Insufficient training examples')
                }

                // Step 2: Format
                const formatResult = await processFineTuningJob({
                    ...job,
                    data: { ...job.data, type: 'format', config: { examples: collectResult.examples } }
                } as Job<FineTuningJob>)

                // Step 3: Submit
                const submitResult = await processFineTuningJob({
                    ...job,
                    data: { ...job.data, type: 'submit', config: { formatted: formatResult.formatted } }
                } as Job<FineTuningJob>)

                return {
                    type: 'full_pipeline',
                    collected: collectResult.examplesCollected,
                    formatted: formatResult.formattedCount,
                    jobId: submitResult.jobId,
                    status: 'submitted'
                }
            }
        }

    } catch (error) {
        console.error(`❌ [Fine-Tune] ${type} failed:`, error)
        throw error
    }
}

const worker = new Worker(QueueName.FINE_TUNING, processFineTuningJob, {
    ...redisConfig,
    concurrency: 1, // Fine-tuning jobs are heavy, run one at a time
    limiter: {
        max: 2,
        duration: 60000, // Max 2 per minute
    },
})

worker.on('completed', (job) => {
    console.log(`✅ Fine-Tuning Job ${job.id} completed:`, job.returnvalue)
})

worker.on('failed', (job, err) => {
    console.error(`❌ Fine-Tuning Job ${job?.id} failed:`, err.message)
})

worker.on('progress', (job, progress) => {
    console.log(`⏳ Fine-Tuning Job ${job.id} progress: ${progress}%`)
})

worker.on('error', (err) => {
    console.error('Fine-Tuning Worker error:', err)
})

console.log('🎯 Fine-Tuning Worker started')

export default worker
