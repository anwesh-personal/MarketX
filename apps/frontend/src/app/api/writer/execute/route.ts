/**
 * POST /api/writer/execute
 *
 * Creates and queues a workflow-backed email job (Writer Studio).
 *
 * Architecture (Engine Unification — Phase 2):
 *   1. Feature gate → get orgId, userId
 *   2. requireActiveEngineRuntime(orgId, userId) → deployed engine with workflow, brain, LLM config
 *   3. assemblePromptStack(brainAgentId, basePrompts) → base + prompt blocks
 *   4. brainKBService.buildWriterContext → KB, ICP, beliefs, offer
 *   5. Queue to engine-execution worker with FULL engine context
 *
 * BYOK: orgId is threaded through so the worker resolves org BYOK → platform keys.
 * Workflow: from the deployed engine's frozen snapshot — NOT a name-based DB lookup.
 * Engine: MUST be deployed via Engine Bundle. No auto-creation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Queue } from 'bullmq'
import { randomUUID } from 'crypto'
import { requireActiveEngineRuntime, EngineNotDeployedError, EngineConfigError, BrainAgentError } from '@/services/engine/EngineInstanceResolver'
import { assemblePromptStack } from '@/services/brain/PromptStackAssembler'
import { brainKBService } from '@/services/brain/BrainKBService'
import { requireFeature } from '@/lib/requireFeature'
import { getRedisConnectionConfig } from '@/lib/infra-config'

const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Lazy singleton — one Redis connection for the lifetime of the process
let _engineQueue: Queue | null = null
async function getEngineQueue(): Promise<Queue> {
    if (!_engineQueue) {
        const redisConnection = await getRedisConnectionConfig()
        _engineQueue = new Queue('engine-execution', { connection: redisConnection, prefix: 'axiom:' })
    }
    return _engineQueue
}

interface WriterExecuteRequest {
    prompt?: string
    settings?: {
        angle_class?: string
        email_count?: number
        flow_goal?: string
        [key: string]: unknown
    }
    icp_id?: string
    belief_id?: string
    offer_id?: string
}

export async function POST(req: NextRequest) {
    try {
        // ─── 1. Feature gate ────────────────────────────────────
        const gate = await requireFeature(req, 'can_write_emails')
        if (gate.denied) return gate.response

        const orgId = gate.orgId
        const userId = gate.userId

        // ─── 2. Resolve deployed engine ─────────────────────────
        const engineRuntime = await requireActiveEngineRuntime(orgId, userId)

        // ─── 3. Parse request body ──────────────────────────────
        const body = await req.json().catch(() => ({})) as WriterExecuteRequest
        const {
            prompt = '',
            settings = {},
            icp_id,
            belief_id,
            offer_id,
        } = body

        // ─── 4. Assemble prompt stack (base + prompt blocks) ────
        const assembledPrompts = await assemblePromptStack(
            engineRuntime.brainAgentId,
            engineRuntime.promptStack
        )

        // ─── 5. Build writer context (KB + ICP + beliefs + offer)
        const writerContext = await brainKBService.buildWriterContext(
            engineRuntime.brainAgentId,
            orgId,
            {
                icpId: icp_id,
                beliefId: belief_id,
                offerId: offer_id,
            }
        )

        // ─── 6. Build execution input ───────────────────────────
        const executionId = randomUUID()

        const input = {
            trigger: 'writer_studio',
            prompt,
            writer_input: {
                ...settings,
                icp_id: icp_id ?? writerContext.icp?.id ?? null,
                belief_id: belief_id ?? writerContext.beliefs[0]?.id ?? null,
                offer_id: offer_id ?? writerContext.offer?.id ?? null,
            },
            brain_context: {
                agent_id: engineRuntime.brainAgentId,
                agent_name: engineRuntime.brainAgentName,
                kb_content: writerContext.kb_content,
                icp: writerContext.icp,
                beliefs: writerContext.beliefs,
                offer: writerContext.offer,
                prompt_stack: {
                    foundation: assembledPrompts.foundation,
                    persona: assembledPrompts.persona,
                    domain: assembledPrompts.domain,
                    guardrails: assembledPrompts.guardrails,
                    instructions: assembledPrompts.instructions,
                },
                prompt_blocks_used: assembledPrompts.blockNames,
                rag_config: engineRuntime.rag,
                api_key_mode: engineRuntime.apiKeyMode,
                default_llm: engineRuntime.defaultLlm,
                strict_grounding: engineRuntime.strictGrounding,
                self_healing: engineRuntime.selfHealing,
            },
            icp_id: icp_id ?? writerContext.icp?.id ?? null,
            belief_id: belief_id ?? writerContext.beliefs[0]?.id ?? null,
            offer_id: offer_id ?? writerContext.offer?.id ?? null,
        }

        // ─── 7. Create engine run log ───────────────────────────
        const { error: logErr } = await supabaseService
            .from('engine_run_logs')
            .insert({
                id: executionId,
                engine_id: engineRuntime.engineInstanceId,
                org_id: orgId,
                input_data: input,
                status: 'started',
                started_at: new Date().toISOString(),
            })

        if (logErr) {
            console.error('Writer execution log error:', logErr)
            return NextResponse.json(
                { error: 'Failed to create execution record' },
                { status: 500 }
            )
        }

        // ─── 8. Queue to engine-execution worker ────────────────
        const engineQueue = await getEngineQueue()

        await engineQueue.add('engine-execution', {
            executionId,
            engineId: engineRuntime.engineInstanceId,
            engine: {
                id: engineRuntime.engineInstanceId,
                name: engineRuntime.engineName,
                config: {
                    flowConfig: {
                        nodes: engineRuntime.workflowNodes,
                        edges: engineRuntime.workflowEdges,
                    },
                    brain_agent_id: engineRuntime.brainAgentId,
                    bundle_snapshot: engineRuntime.snapshot,
                    org_agents: engineRuntime.orgAgents,
                },
                snapshot: engineRuntime.snapshot,
                status: 'active',
            },
            userId,
            orgId,
            input,
            options: {
                tier: 'pro',
                timeout: 300000,
            },
        })

        // ─── 9. Create user-facing run record ───────────────────
        const angleLabel = settings.angle_class?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Custom'
        const goalLabel = settings.flow_goal?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || ''
        const emailCount = settings.email_count ?? 5
        const runLabel = `${angleLabel} · ${emailCount} emails${goalLabel ? ` · ${goalLabel}` : ''}`

        const { data: run, error: runErr } = await supabaseService
            .from('runs')
            .insert({
                org_id: orgId,
                triggered_by: userId,
                writer_input: settings,
                status: 'running',
                execution_id: executionId,
                engine_instance_id: engineRuntime.engineInstanceId,
                label: runLabel,
                settings: settings,
            } as any)
            .select('id')
            .single()

        const runId = run?.id ?? null
        if (runErr) {
            console.warn('Writer run record creation failed:', runErr.message)
        }

        // ─── 10. Return response ────────────────────────────────
        return NextResponse.json({
            success: true,
            executionId,
            runId,
            status: 'started',
            message: 'Writer job queued via deployed engine. Use executionId to poll status.',
            context: {
                engine_instance_id: engineRuntime.engineInstanceId,
                engine_name: engineRuntime.engineName,
                bundle_id: engineRuntime.bundleId,
                brain_agent_id: engineRuntime.brainAgentId,
                brain_agent_name: engineRuntime.brainAgentName,
                api_key_mode: engineRuntime.apiKeyMode,
                prompt_blocks_count: assembledPrompts.blockCount,
                icp_id: input.icp_id,
                belief_id: input.belief_id,
                offer_id: input.offer_id,
                kb_sections_loaded: writerContext.kb_content.length > 0,
            },
        })
    } catch (error: any) {
        console.error('Writer execute error:', error)

        // Return specific error codes for engine-related failures
        if (error instanceof EngineNotDeployedError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 503 }
            )
        }
        if (error instanceof EngineConfigError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 503 }
            )
        }
        if (error instanceof BrainAgentError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
