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
    config?: Record<string, any> // Dynamic config for pipeline steps
}

interface TrainingExample {
    input: string
    output: string
    rating: number
}

interface FineTuningResult {
    type: string
    examplesCollected?: number
    examples?: TrainingExample[]
    provider?: string
    formattedCount?: number
    formatted?: object[]
    jobId?: string
    status?: string
    exampleCount?: number
    collected?: number
    fineTunedModel?: string | null
}

const isProduction = process.env.NODE_ENV === 'production'

/** Throw with status and body if !res.ok; otherwise return parsed JSON. */
async function fetchOkJson<T = unknown>(res: Response): Promise<T> {
    const text = await res.text()
    let body: unknown
    try {
        body = text ? JSON.parse(text) : {}
    } catch {
        body = {}
    }
    if (!res.ok) {
        const msg = typeof (body as { error?: { message?: string } })?.error?.message === 'string'
            ? (body as { error: { message: string } }).error.message
            : text || res.statusText
        throw new Error(`OpenAI API ${res.status}: ${msg}`)
    }
    return body as T
}

/** Validate file upload response has id. */
function assertFileResponse(body: unknown): { id: string } {
    if (!body || typeof body !== 'object' || !('id' in body) || typeof (body as { id: unknown }).id !== 'string') {
        throw new Error(`OpenAI file response missing id: ${JSON.stringify(body)}`)
    }
    return body as { id: string }
}

/** Validate fine-tune job response has expected shape. */
function assertJobResponse(body: unknown): { id?: string; status?: string; fine_tuned_model?: string | null } {
    if (!body || typeof body !== 'object') {
        throw new Error(`OpenAI job response invalid: ${JSON.stringify(body)}`)
    }
    const b = body as Record<string, unknown>
    return {
        id: typeof b.id === 'string' ? b.id : undefined,
        status: typeof b.status === 'string' ? b.status : undefined,
        fine_tuned_model: b.fine_tuned_model == null ? null : typeof b.fine_tuned_model === 'string' ? b.fine_tuned_model : null,
    }
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
})

async function processFineTuningJob(job: Job<FineTuningJob>): Promise<FineTuningResult> {
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
                    examplesCollected: examples.rowCount ?? 0,
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
                const formatted = job.data.config?.formatted || []
                if (formatted.length < (config?.minExamples || 10)) {
                    throw new Error(`Insufficient examples: ${formatted.length} < ${config?.minExamples || 10}`)
                }

                let newJobId: string

                if (provider === 'openai') {
                    const openaiKey = process.env.OPENAI_API_KEY
                    if (!openaiKey) throw new Error('OPENAI_API_KEY not set — cannot submit fine-tune job')

                    // Upload training file to OpenAI Files API
                    const jsonl = formatted
                        .map((ex: any) => JSON.stringify({
                            messages: [
                                { role: 'user',      content: ex.input  },
                                { role: 'assistant', content: ex.output },
                            ]
                        }))
                        .join('\n')

                    const fileRes = await fetch('https://api.openai.com/v1/files', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${openaiKey}` },
                        body: (() => {
                            const fd = new FormData()
                            fd.append('purpose', 'fine-tune')
                            fd.append('file', new Blob([jsonl], { type: 'text/plain' }), 'training.jsonl')
                            return fd
                        })(),
                    })
                    const fileData = assertFileResponse(await fetchOkJson(fileRes))

                    // Create fine-tuning job
                    const ftRes = await fetch('https://api.openai.com/v1/fine_tuning/jobs', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            training_file: fileData.id,
                            model: config?.baseModel || 'gpt-4o-mini-2024-07-18',
                            suffix: `marketx-${orgId.slice(0, 8)}`,
                        }),
                    })
                    const ftData = assertJobResponse(await fetchOkJson(ftRes))
                    if (!ftData.id) throw new Error(`OpenAI fine-tune submit failed: missing job id`)
                    newJobId = ftData.id
                } else {
                    throw new Error(`Fine-tuning for provider "${provider}" not yet implemented. Only "openai" is supported.`)
                }

                await pool.query(`
                    INSERT INTO brain_version_history (brain_template_id, version, config, change_summary)
                    VALUES ($1, $2, $3, $4)
                `, [
                    brainTemplateId,
                    `fine-tune-${newJobId}`,
                    { provider, exampleCount: formatted.length, jobId: newJobId },
                    `Fine-tuning job submitted to ${provider} with ${formatted.length} examples`,
                ])

                console.log(`🎯 Fine-tune job submitted to ${provider}: ${newJobId}`)
                return { type, jobId: newJobId, status: 'submitted', exampleCount: formatted.length }
            }

            case 'monitor': {
                if (!jobId) throw new Error('jobId required for monitor')

                if (provider === 'openai') {
                    const openaiKey = process.env.OPENAI_API_KEY
                    if (!openaiKey) throw new Error('OPENAI_API_KEY not set')

                    const res = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}`, {
                        headers: { Authorization: `Bearer ${openaiKey}` },
                    })
                    const data = assertJobResponse(await fetchOkJson(res))
                    const status = data.status || 'unknown'
                    const fineTunedModel = data.fine_tuned_model ?? null

                    console.log(`🎯 Fine-tune job ${jobId} status: ${status}${fineTunedModel ? ` → model: ${fineTunedModel}` : ''}`)
                    return { type, jobId, status, fineTunedModel }
                }

                throw new Error(`Monitor for provider "${provider}" not yet implemented.`)
            }

            case 'deploy': {
                if (!jobId) throw new Error('jobId required for deploy')

                // Fetch actual fine-tuned model ID from provider before deploying
                let fineTunedModel: string | null = job.data.config?.fineTunedModel || null

                if (!fineTunedModel && provider === 'openai') {
                    const openaiKey = process.env.OPENAI_API_KEY
                    if (!openaiKey) throw new Error('OPENAI_API_KEY not set')
                    const res = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}`, {
                        headers: { Authorization: `Bearer ${openaiKey}` },
                    })
                    const data = assertJobResponse(await fetchOkJson(res))
                    if (data.status !== 'succeeded') {
                        throw new Error(`Cannot deploy: fine-tune job ${jobId} status is "${data.status ?? 'unknown'}", not "succeeded"`)
                    }
                    fineTunedModel = data.fine_tuned_model ?? null
                }

                if (!fineTunedModel) throw new Error(`No fine-tuned model ID found for job ${jobId}`)

                // Write the actual model ID into brain_templates.config so BrainOrchestrator uses it
                await pool.query(`
                    UPDATE brain_templates
                    SET config = jsonb_set(
                        jsonb_set(config, '{model}', $1::jsonb),
                        '{fineTunedModel}',
                        $2::jsonb
                    ),
                    updated_at = NOW()
                    WHERE id = $3
                `, [
                    JSON.stringify(fineTunedModel),
                    JSON.stringify({ jobId, modelId: fineTunedModel, deployedAt: new Date().toISOString(), provider }),
                    brainTemplateId,
                ])

                console.log(`🎯 Deployed fine-tuned model ${fineTunedModel} from job ${jobId}`)
                return { type, jobId, fineTunedModel, status: 'deployed' }
            }

            case 'full_pipeline': {
                // Run the complete pipeline
                console.log('🎯 Running full fine-tuning pipeline...')

                // Step 1: Collect examples
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

                if ((examples.rowCount ?? 0) < 10) {
                    throw new Error(`Insufficient training examples: ${examples.rowCount}`)
                }

                console.log(`🎯 Collected ${examples.rowCount} training examples`)

                // Step 2: Format for provider
                const formatted: object[] = []
                for (const ex of examples.rows) {
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

                // Step 3: Submit job
                const newJobId = `ft-${Date.now()}-${orgId.slice(0, 8)}`
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

                return {
                    type: 'full_pipeline',
                    collected: examples.rowCount ?? 0,
                    formatted: formatted,
                    jobId: newJobId,
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
    connection: redisConfig,
    prefix: 'axiom:',
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
