/**
 * POST /api/writer/execute
 *
 * Creates and queues a workflow-backed email job (Writer Studio).
 * Uses active brain runtime for the org with proper KB, ICP, and Belief context.
 *
 * Architecture:
 *   - Resolves active brain_agents for org via BrainRuntimeResolver
 *   - Loads KB content from kb_sections/kb_documents (Brain KB)
 *   - Loads ICP and Belief context from RS:OS tables (partner_id = org_id)
 *   - Queues job to engine-execution worker
 *
 * Input:
 *   - prompt: User instruction for email generation
 *   - settings: Writer-specific settings (angle_class, email_count, flow_goal, etc.)
 *   - icp_id: Optional ICP to use (defaults to active ICP)
 *   - belief_id: Optional Belief to use
 *   - offer_id: Optional Offer to use
 *
 * Note: Legacy kb_id parameter is deprecated. Brain KB is now used automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Queue } from 'bullmq'
import { randomUUID } from 'crypto'
import { requireActiveBrainRuntime } from '@/services/brain/BrainRuntimeResolver'
import { brainKBService } from '@/services/brain/BrainKBService'
import { requireFeature } from '@/lib/requireFeature'

// Redis config comes from DB (infra-config), falls back to env then localhost
import { getRedisConnectionConfig } from '@/lib/infra-config'

const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_WRITER_TEMPLATE_NAME = 'Email Nurture Flow'

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
    kb_id?: string
}

export async function POST(req: NextRequest) {
    try {
        // Feature gate — enforce plan access
        const gate = await requireFeature(req, 'can_write_emails')
        if (gate.denied) return gate.response

        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userRecord } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!userRecord?.org_id) {
            return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
        }

        const orgId = userRecord.org_id

        const brainRuntime = await requireActiveBrainRuntime(orgId)

        const body = await req.json().catch(() => ({})) as WriterExecuteRequest
        const { 
            prompt = '', 
            settings = {},
            icp_id,
            belief_id,
            offer_id,
        } = body

        const writerContext = await brainKBService.buildWriterContext(
            brainRuntime.agentId,
            orgId,
            {
                icpId: icp_id,
                beliefId: belief_id,
                offerId: offer_id,
            }
        )

        let template: { id: string; name: string; nodes: unknown; edges: unknown } | null = null
        const { data: templateData, error: templateError } = await supabaseService
            .from('workflow_templates')
            .select('id, name, nodes, edges')
            .eq('status', 'active')
            .ilike('name', `%${DEFAULT_WRITER_TEMPLATE_NAME}%`)
            .limit(1)
            .maybeSingle()

        if (!templateError && templateData) {
            template = templateData as { id: string; name: string; nodes: unknown; edges: unknown }
        }
        if (!template) {
            const { data: fallback } = await supabaseService
                .from('workflow_templates')
                .select('id, name, nodes, edges')
                .eq('status', 'active')
                .limit(1)
                .maybeSingle()
            if (!fallback) {
                return NextResponse.json(
                    { error: 'No active workflow template found. Contact admin to set up Email Nurture Flow.' },
                    { status: 503 }
                )
            }
            template = fallback as { id: string; name: string; nodes: unknown; edges: unknown }
        }

        const templateId = template.id

        let { data: engine } = await supabaseService
            .from('engine_instances')
            .select('*')
            .eq('template_id', templateId)
            .eq('org_id', orgId)
            .limit(1)
            .maybeSingle()

        if (!engine) {
            const { data: newEngine, error: createErr } = await supabaseService
                .from('engine_instances')
                .insert({
                    name: template.name,
                    template_id: templateId,
                    org_id: orgId,
                    status: 'active',
                    config: { 
                        flowConfig: { 
                            nodes: template.nodes, 
                            edges: template.edges 
                        },
                        brain_agent_id: brainRuntime.agentId,
                    },
                })
                .select()
                .single()
            if (createErr || !newEngine) {
                console.error('Writer engine create error:', createErr)
                return NextResponse.json(
                    { error: 'Failed to create writer engine for org' },
                    { status: 500 }
                )
            }
            engine = newEngine
        }

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
                agent_id: brainRuntime.agentId,
                agent_name: brainRuntime.name,
                kb_content: writerContext.kb_content,
                icp: writerContext.icp,
                beliefs: writerContext.beliefs,
                offer: writerContext.offer,
                prompt_stack: {
                    foundation: brainRuntime.prompt.foundation,
                    persona: brainRuntime.prompt.persona,
                    domain: brainRuntime.prompt.domain,
                    guardrails: brainRuntime.prompt.guardrails,
                },
                rag_config: brainRuntime.rag,
            },
            icp_id: icp_id ?? writerContext.icp?.id ?? null,
            belief_id: belief_id ?? writerContext.beliefs[0]?.id ?? null,
            offer_id: offer_id ?? writerContext.offer?.id ?? null,
        }

        const { error: logErr } = await supabaseService
            .from('engine_run_logs')
            .insert({
                id: executionId,
                engine_id: engine.id,
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

        const engineWithFlow = {
            ...engine,
            config: {
                ...engine.config,
                flowConfig: engine.config?.flowConfig ?? { nodes: template.nodes, edges: template.edges },
            },
        }

        const redisConnection = await getRedisConnectionConfig()
        const engineQueue = new Queue('engine-execution', { connection: redisConnection })
        await engineQueue.add('engine-execution', {
            executionId,
            engineId: engine.id,
            engine: {
                id: engineWithFlow.id,
                name: engineWithFlow.name,
                config: engineWithFlow.config,
                status: engineWithFlow.status,
            },
            userId: user.id,
            orgId: orgId,
            input,
            options: { 
                tier: 'pro', 
                timeout: 300000 
            },
        })

        let runId: string | null = null
        const runPayload = {
            org_id: orgId,
            triggered_by: user.id,
            writer_input: settings,
            status: 'running',
            execution_id: executionId,
        }
        const { data: run, error: runErr } = await supabaseService
            .from('runs')
            .insert(runPayload as any)
            .select('id')
            .single()
        if (runErr) {
            const withoutExecution = { 
                org_id: runPayload.org_id, 
                triggered_by: runPayload.triggered_by, 
                writer_input: runPayload.writer_input, 
                status: runPayload.status 
            }
            const { data: run2 } = await supabaseService
                .from('runs')
                .insert(withoutExecution as any)
                .select('id')
                .single()
            if (run2) runId = run2.id
        } else if (run) {
            runId = run.id
        }

        return NextResponse.json({
            success: true,
            executionId,
            runId,
            status: 'started',
            message: 'Writer job queued with Brain context. Use executionId to poll status.',
            context: {
                brain_agent_id: brainRuntime.agentId,
                brain_agent_name: brainRuntime.name,
                icp_id: input.icp_id,
                belief_id: input.belief_id,
                offer_id: input.offer_id,
                kb_sections_loaded: writerContext.kb_content.length > 0,
            },
        })
    } catch (error: any) {
        console.error('Writer execute error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
