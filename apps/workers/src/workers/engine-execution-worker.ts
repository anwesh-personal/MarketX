/**
 * ENGINE EXECUTION WORKER
 * =======================
 * Processes async workflow/engine execution jobs from the queue.
 * 
 * This worker lives in apps/workers (consumer) and processes jobs
 * queued by apps/backend (producer).
 * 
 * Queue: workflow-execute
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { workflowExecutionService } from '../processors/workflow-execution-processor';
import { publishProgress, publishExecutionComplete } from '../utils/progress-publisher';
import { runMasteryPipeline } from '../utils/mastery-pipeline';
import { validateOutputQuality, logKnowledgeGap } from '../utils/quality-validator';
import { verifyEmailsWithRefinery } from '../utils/refinery-verify';
import { pushCampaignToMta } from '../utils/campaign-pusher';

// ============================================================================
// TYPES
// ============================================================================

export interface EngineExecutionJob {
    executionId: string;
    engineId: string;
    engine: {
        id: string;
        name: string;
        config: any;
        status: string;
    };
    userId: string;
    orgId?: string;
    input: Record<string, any>;
    options?: {
        tier?: 'hobby' | 'pro' | 'enterprise';
        timeout?: number;
    };
}

export interface EngineExecutionResult {
    success: boolean;
    executionId: string;
    output?: any;
    tokensUsed?: number;
    cost?: number;
    durationMs?: number;
    error?: string;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// ============================================================================
// JOB PROCESSOR
// ============================================================================

async function processEngineExecution(job: Job<EngineExecutionJob>): Promise<EngineExecutionResult> {
    const { executionId, engineId, engine, userId, orgId, input, options } = job.data;
    const startTime = Date.now();

    console.log(`⚡ Processing engine execution: ${executionId}`);
    console.log(`   Engine: ${engine.name} (${engineId})`);
    console.log(`   User: ${userId}`);

    try {
        // Update status to running
        await updateExecutionStatus(executionId, 'running');

        // Get workflow configuration from engine config or snapshot
        const flowConfig = engine.config?.flowConfig;
        if (!flowConfig || !flowConfig.nodes || !flowConfig.edges) {
            throw new Error('Engine has no valid workflow configuration');
        }

        // Extract agent config from snapshot for runtime use
        const snapshot = (engine as any).snapshot || engine.config?.bundle_snapshot || {};
        const agentConfigs = snapshot.agents || [];
        const defaultLlm = snapshot.default_llm || {};

        // Build engine context with resolved agent LLM/prompt config
        // This allows the execution processor to use per-engine AI settings
        const engineContext: Record<string, any> = {};
        if (agentConfigs.length > 0 || defaultLlm.provider) {
            const primaryAgent = agentConfigs.find((a: any) => a.is_primary) || agentConfigs[0];
            if (primaryAgent?.llm || defaultLlm.provider) {
                const llm = primaryAgent?.llm || defaultLlm;
                engineContext.defaultProvider = llm.provider;
                engineContext.defaultModel = llm.model;
                engineContext.defaultTemperature = llm.temperature;
                engineContext.defaultMaxTokens = llm.max_tokens;
            }
            if (primaryAgent?.prompts) {
                engineContext.systemPromptOverride = [
                    primaryAgent.prompts.foundation,
                    primaryAgent.prompts.persona,
                    primaryAgent.prompts.domain,
                    primaryAgent.prompts.guardrails,
                ].filter(Boolean).join('\n\n');
            }
            engineContext.agents = agentConfigs;
            engineContext.brainAgentIds = snapshot.brain_agent_ids;
        }

        // Merge engine context into input so nodes can access it
        const enrichedInput: Record<string, any> = {
            ...input,
            _engine_context: engineContext,
            _org_id: orgId,
            _api_key_mode: snapshot.api_key_mode || 'platform',
            ...(engineContext.defaultProvider ? { provider: engineContext.defaultProvider } : {}),
            ...(engineContext.defaultModel ? { ai_model: engineContext.defaultModel } : {}),
        };

        // ─── PRE-SEND MASTERY PIPELINE ──────────────────────────
        // Run headless mastery agents (angle, timing, contact scoring)
        // before workflow execution. Results merge into input.
        let masteryPreSend = null;
        if (orgId) {
            try {
                masteryPreSend = await runMasteryPipeline('pre_send', orgId, enrichedInput);
                if (masteryPreSend.decisions.length > 0) {
                    Object.assign(enrichedInput, masteryPreSend.enrichedInput);
                    enrichedInput._mastery_pre_send = masteryPreSend.decisions;
                    console.log(`🎯 Pre-send mastery: ${masteryPreSend.decisions.length} agents, ${masteryPreSend.totalDurationMs}ms`);
                }
            } catch (err: any) {
                console.warn(`⚠ Pre-send mastery failed (non-blocking): ${err.message}`);
            }
        }

        // ─── WORKFLOW EXECUTION ────────────────────────────────
        const result = await workflowExecutionService.executeWorkflow(
            flowConfig.nodes,
            flowConfig.edges,
            enrichedInput,
            executionId,
            (update) => {
                publishProgress(executionId, update);
            },
            {
                executionId,
                userId,
                tier: options?.tier || 'hobby',
                orgId,
            },
            {
                engineId,
            }
        );

        // ─── POST-REPLY MASTERY PIPELINE ────────────────────────
        // Validate output quality, compliance, tone.
        let masteryPostReply = null;
        if (orgId && result.success && result.lastNodeOutput) {
            try {
                const postInput = {
                    ...enrichedInput,
                    _workflow_output: result.lastNodeOutput.content,
                    _token_usage: result.tokenUsage,
                };
                masteryPostReply = await runMasteryPipeline('post_reply', orgId, postInput);
                if (masteryPostReply.decisions.length > 0) {
                    console.log(`🔍 Post-reply mastery: ${masteryPostReply.decisions.length} agents, ${masteryPostReply.totalDurationMs}ms`);
                }
            } catch (err: any) {
                console.warn(`⚠ Post-reply mastery failed (non-blocking): ${err.message}`);
            }
        }

        const durationMs = Date.now() - startTime;

        if (result.success) {
            // ─── QUALITY VALIDATION + SELF-HEALING ──────────────────
            const selfHealing = input.brain_context?.self_healing || {};
            const enableRetry = selfHealing.enableRetryOnLowQuality ?? true;
            const minQuality = selfHealing.minQualityScore ?? 0.6;
            const logGaps = selfHealing.logGapsToLearning ?? true;

            if (result.lastNodeOutput?.content) {
                const qualityResult = validateOutputQuality(
                    result.lastNodeOutput.content,
                    input,
                    { minQualityScore: minQuality }
                );

                if (!qualityResult.passed) {
                    console.warn(`⚠ Quality check failed: ${qualityResult.score.toFixed(2)} < ${minQuality} (${qualityResult.issues.length} issues)`);

                    // Log knowledge gap for learning loop
                    if (logGaps && orgId) {
                        const brainAgentId = input.brain_context?.agent_id || null;
                        await logKnowledgeGap(
                            orgId,
                            brainAgentId,
                            qualityResult,
                            input.prompt || JSON.stringify(input.writer_input || {}).slice(0, 500)
                        );
                    }

                    // Note: Self-healing retry would go here in future.
                    // Currently we log the gap and continue — output is still stored.
                    // Full retry requires re-queuing the job with enhanced prompt.
                }
            }

            // ─── PHASE 8A: REFINERY EMAIL VERIFICATION ──────────────
            // Verify target emails against Refinery Nexus before dispatch.
            // Non-blocking: on Refinery error, proceeds with all emails.
            // Gated by system_config: ecosystem.refinery_verify_enabled
            let verifiedEmails: string[] | null = null;
            const rawEmails: string[] = (
                result.lastNodeOutput?.content?.target_emails ||
                input.writer_input?.targetEmails ||
                []
            );

            if (rawEmails.length > 0 && orgId) {
                try {
                    const verifyResult = await verifyEmailsWithRefinery({
                        emails: rawEmails,
                        orgId,
                    });
                    if (verifyResult.ran) {
                        verifiedEmails = verifyResult.safe;
                        if (verifyResult.rejected.length > 0) {
                            console.log(`🔍 Refinery: ${verifyResult.rejected.length} emails rejected, ${verifyResult.safe.length} safe`);
                        }
                    }
                } catch (err: any) {
                    console.warn(`⚠ Refinery verify error (non-blocking): ${err.message}`);
                }
            }

            // ─── PHASE 8B: MTA CAMPAIGN PUSH ────────────────────────
            // Push generated content to MailWizz (or configured MTA).
            // Non-blocking: campaign push failure never kills the execution.
            // Gated by system_config: ecosystem.mta_push_enabled
            if (orgId && result.lastNodeOutput?.content) {
                const writerOutput = result.lastNodeOutput.content;
                // Only push if the execution produced a campaign-ready sequence
                const hasSequence = Array.isArray(writerOutput?.emails) && writerOutput.emails.length > 0;
                if (hasSequence) {
                    try {
                        const pushResult = await pushCampaignToMta({
                            orgId,
                            campaignName: writerOutput.campaign_name ||
                                input.writer_input?.campaignName ||
                                `Axiom Campaign - ${new Date().toISOString().slice(0, 10)}`,
                            fromName: input.writer_input?.fromName || 'Axiom',
                            fromEmail: input.writer_input?.fromEmail || '',
                            listUid: input.writer_input?.listUid || '',
                            emails: writerOutput.emails.map((e: any, i: number) => ({
                                subject: e.subject || '',
                                body: e.body || e.content || '',
                                delayDays: i === 0 ? 0 : (e.delayDays ?? i),
                            })),
                            metadata: { executionId, engineId, orgId },
                        });
                        if (pushResult.success) {
                            console.log(`📧 Campaign pushed to ${pushResult.provider}: ${pushResult.campaignUid}`);
                        }
                    } catch (err: any) {
                        console.warn(`⚠ MTA campaign push error (non-blocking): ${err.message}`);
                    }
                }
            }

            await updateExecutionStatus(executionId, 'completed', {
                result: result.lastNodeOutput?.content,
                tokensUsed: result.tokenUsage?.totalTokens,
                cost: result.tokenUsage?.totalCost,
                durationMs,
            });

            // Publish completion to Redis
            await publishExecutionComplete(executionId, {
                success: true,
                output: result.lastNodeOutput?.content,
                tokensUsed: result.tokenUsage?.totalTokens,
                cost: result.tokenUsage?.totalCost,
                durationMs,
            });

            console.log(`✅ Engine execution completed: ${executionId} (${durationMs}ms)`);

            return {
                success: true,
                executionId,
                output: result.lastNodeOutput?.content,
                tokensUsed: result.tokenUsage?.totalTokens,
                cost: result.tokenUsage?.totalCost,
                durationMs,
            };
        } else {
            throw new Error(result.error || 'Execution failed without error message');
        }

    } catch (error: any) {
        const durationMs = Date.now() - startTime;
        console.error(`❌ Engine execution failed: ${executionId} - ${error.message}`);

        await updateExecutionStatus(executionId, 'failed', {
            error: error.message,
            durationMs,
        });

        // Publish failure to Redis
        await publishExecutionComplete(executionId, {
            success: false,
            error: error.message,
            durationMs,
        });

        return {
            success: false,
            executionId,
            error: error.message,
            durationMs,
        };
    }
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function updateExecutionStatus(
    executionId: string,
    status: string,
    data?: {
        result?: any;
        tokensUsed?: number;
        cost?: number;
        durationMs?: number;
        error?: string;
    }
): Promise<void> {
    if (!supabase) {
        console.warn('⚠️ No Supabase client - skipping DB update');
        return;
    }

    const updates: Record<string, any> = { status };

    if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
    }

    if (data?.error) {
        updates.error_message = data.error;
    }

    if (data?.tokensUsed !== undefined) {
        updates.tokens_used = data.tokensUsed;
    }

    if (data?.cost !== undefined) {
        updates.cost_usd = data.cost;
    }

    if (data?.durationMs !== undefined) {
        updates.duration_ms = data.durationMs;
    }

    if (data?.result !== undefined) {
        updates.output_data = { finalOutput: data.result };
    }

    const { error } = await supabase
        .from('engine_run_logs')
        .update(updates)
        .eq('id', executionId);

    if (error) {
        console.error(`Failed to update execution status: ${error.message}`);
    }

    // Also sync the user-facing runs table
    // IMPORTANT: runs.status uses lowercase ('running', 'completed', 'failed')
    // to match what execute/route.ts inserts. The CHECK constraint accepts both cases.
    const runUpdates: Record<string, any> = { status };
    if (status === 'completed' || status === 'failed') {
        runUpdates.completed_at = new Date().toISOString();
    }
    if (data?.error) {
        runUpdates.error_message = data.error;
    }

    await supabase
        .from('runs')
        .update(runUpdates)
        .eq('execution_id', executionId);
}

// ============================================================================
// WORKER SETUP
// ============================================================================

import { QueueName, getRedisConnectionOptions } from '../config/queues';

const worker = new Worker<EngineExecutionJob, EngineExecutionResult>(
    QueueName.ENGINE_EXECUTION,
    processEngineExecution,
    {
        connection: getRedisConnectionOptions(),
        prefix: 'axiom:',
        concurrency: 2,
        limiter: {
            max: 10,
            duration: 60000, // 10 jobs per minute max
        },
    }
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed: ${result.success ? 'success' : 'failed'}`);
});

worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed: ${error.message}`);
});

worker.on('error', (error) => {
    console.error('Worker error:', error);
});

worker.on('ready', () => {
    console.log(`🚀 Engine Execution Worker ready (queue: ${QueueName.ENGINE_EXECUTION})`);
});

// ============================================================================
// EXPORTS
// ============================================================================

export { worker as engineExecutionWorker };
export default worker;
