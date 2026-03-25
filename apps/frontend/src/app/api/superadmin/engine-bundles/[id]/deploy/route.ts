/**
 * POST /api/superadmin/engine-bundles/[id]/deploy
 *
 * Deploys an Engine Bundle to an organization (or specific user).
 *
 * What happens on deploy:
 *  1. Validate bundle + org + no duplicate
 *  2. Build FULL snapshot (bundle + agents_config + LLM + workflow nodes) — frozen at deploy time
 *  3. Generate unique API key  (axm_live_<random>)
 *  4. Clone brain_template → brain_agents (one per org, reused if exists)
 *     Each agent in agents_config gets its own brain_agents row with prefilled LLM/prompts/tools
 *  5. Create engine_instances with snapshot + api_key + overrides: {}
 *  6. Audit log → engine_bundle_deployments
 *
 * GET  → list all deployed instances for this bundle
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { randomBytes, createHash } from 'crypto'

const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Helpers ──────────────────────────────────────────────────

function generateApiKey(): { raw: string; hash: string } {
    const random = randomBytes(32).toString('hex')
    const raw = `axm_live_${random}`
    const hash = createHash('sha256').update(raw).digest('hex')
    return { raw, hash }
}

/** Deep merge: overrides take precedence over base */
function deepMerge(base: Record<string, any>, overrides: Record<string, any>): Record<string, any> {
    const result = { ...base }
    for (const key of Object.keys(overrides)) {
        if (
            overrides[key] !== null &&
            typeof overrides[key] === 'object' &&
            !Array.isArray(overrides[key]) &&
            typeof base[key] === 'object' &&
            !Array.isArray(base[key])
        ) {
            result[key] = deepMerge(base[key] || {}, overrides[key])
        } else {
            result[key] = overrides[key]
        }
    }
    return result
}

/** Resolve effective agent config = bundle agent merged with any deploy-time overrides */
function resolveAgentConfig(
    bundleAgent: Record<string, any>,
    deployOverride: Record<string, any> = {},
    defaultLlm: Record<string, any> = {}
): Record<string, any> {
    return deepMerge(
        { ...bundleAgent, llm: deepMerge(defaultLlm, bundleAgent.llm || {}) },
        deployOverride
    )
}

// ── POST — deploy ─────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const bundleId = params.id

    try {
        const body = await req.json()
        const {
            org_id,
            assigned_user_id = null,
            api_key_mode = 'platform',
            byok_keys = null,
            email_provider_id,
            deployment_notes,
            agent_overrides = {},   // { "writer": { "llm": { "model": "gpt-4o" } }, ... }
        } = body

        if (!org_id) {
            return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
        }
        if (api_key_mode === 'byok' && !byok_keys) {
            return NextResponse.json(
                { error: 'byok_keys required when api_key_mode is "byok"' },
                { status: 400 }
            )
        }

        // ── 1. Fetch bundle with all relations ───────────────────
        const { data: bundle, error: bundleErr } = await supabase
            .from('engine_bundles')
            .select('*, brain_templates(*), workflow_templates(*)')
            .eq('id', bundleId)
            .single()

        if (bundleErr || !bundle) {
            return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
        }
        if (bundle.status === 'archived') {
            return NextResponse.json({ error: 'Cannot deploy an archived bundle' }, { status: 409 })
        }
        if (!bundle.workflow_template_id) {
            return NextResponse.json(
                { error: 'Bundle must have a workflow template to deploy. Add a workflow in the bundle basics.' },
                { status: 400 }
            )
        }

        const workflowTemplate = (bundle as any).workflow_templates
        if (!workflowTemplate || !workflowTemplate.id) {
            return NextResponse.json(
                { error: 'Workflow template not found. It may have been deleted. Update the bundle to use a valid workflow.' },
                { status: 400 }
            )
        }
        const nodes = Array.isArray(workflowTemplate.nodes) ? workflowTemplate.nodes : []
        const edges = Array.isArray(workflowTemplate.edges) ? workflowTemplate.edges : []

        // ── 2. Validate org ──────────────────────────────────────
        const { data: org, error: orgErr } = await supabase
            .from('organizations')
            .select('id, name, status')
            .eq('id', org_id)
            .single()

        if (orgErr || !org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // ── 3. Duplicate check ───────────────────────────────────
        const duplicateQuery = supabase
            .from('engine_instances')
            .select('id, status')
            .eq('bundle_id', bundleId)
            .eq('org_id', org_id)
            .in('status', ['active', 'standby'])

        if (assigned_user_id) {
            duplicateQuery.eq('assigned_user_id', assigned_user_id)
        } else {
            duplicateQuery.is('assigned_user_id', null)
        }

        const { data: existing } = await duplicateQuery.maybeSingle()
        if (existing) {
            return NextResponse.json({
                error: `Bundle already deployed to "${org.name}"${assigned_user_id ? ' for this user' : ''}. Use overrides to customize.`,
                existing_instance_id: existing.id,
            }, { status: 409 })
        }

        // ── 4. Build full snapshot ───────────────────────────────
        const brainTemplate = (bundle as any).brain_templates || {}
        const agentsConfig: any[] = bundle.agents_config || []
        const defaultLlm: Record<string, any> = bundle.default_llm || {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.7,
            max_tokens: 4000,
        }

        // Resolve each agent: bundle defaults → agent-specific → deploy-time override
        const resolvedAgents = agentsConfig.map((agent: any) => {
            const override = agent_overrides[agent.role] || {}
            return resolveAgentConfig(agent, override, defaultLlm)
        })

        // If no agents in bundle, create a default writer agent from brain template
        if (resolvedAgents.length === 0 && brainTemplate.id) {
            const baseConfig = brainTemplate.config || {}
            resolvedAgents.push({
                role: 'writer',
                name: `${brainTemplate.name || 'Writer'} Agent`,
                is_primary: true,
                llm: deepMerge(defaultLlm, {
                    provider: baseConfig.providers?.chat || defaultLlm.provider,
                }),
                prompts: {
                    foundation: baseConfig.foundation_prompt || null,
                    persona: baseConfig.persona_prompt || null,
                    domain: baseConfig.domain_prompt || null,
                    guardrails: baseConfig.guardrails_prompt || null,
                },
                tools: baseConfig.tools_granted || [],
                rag: {
                    top_k: baseConfig.rag_top_k || 5,
                    min_confidence: baseConfig.rag_min_confidence || 0.6,
                    strict_grounding: baseConfig.strict_grounding || false,
                },
                memory_enabled: true,
                max_turns: 20,
            })
        }

        const snapshot = {
            bundle_id: bundle.id,
            bundle_name: bundle.name,
            bundle_slug: bundle.slug,
            bundle_tier: bundle.tier,
            deployed_at: new Date().toISOString(),
            deployed_by: admin.id,
            brain_template: {
                id: brainTemplate.id || null,
                name: brainTemplate.name || null,
                pricing_tier: brainTemplate.pricing_tier || null,
                version: brainTemplate.version || null,
            },
            workflow_template: {
                id: workflowTemplate.id,
                name: workflowTemplate.name || null,
                nodes,
                edges,
            },
            default_llm: defaultLlm,
            agents: resolvedAgents,
            email_provider_id: email_provider_id || bundle.email_provider_id || null,
            api_key_mode,
        }

        // ── 5. Clone brain agents ────────────────────────────────
        // One brain_agents row per agent role (not just one per org anymore)
        const createdBrainAgents: { role: string; id: string }[] = []

        for (const agentConfig of resolvedAgents) {
            // Check if this exact agent (org + template + role) already exists
            let agentId: string | null = null

            if (brainTemplate.id) {
                const { data: existing } = await supabase
                    .from('brain_agents')
                    .select('id')
                    .eq('org_id', org_id)
                    .eq('template_id', brainTemplate.id)
                    .eq('is_active', true)
                    // Use metadata to find by role
                    .filter('name', 'ilike', `%${agentConfig.role}%`)
                    .maybeSingle()

                if (existing) {
                    agentId = existing.id
                }
            }

            if (!agentId) {
                const { data: newAgent, error: agentErr } = await supabase
                    .from('brain_agents')
                    .insert({
                        org_id,
                        user_id: assigned_user_id || null,
                        template_id: brainTemplate.id || null,
                        name: `${agentConfig.name || agentConfig.role} — ${org.name}`,
                        foundation_prompt: agentConfig.prompts?.foundation || null,
                        persona_prompt: agentConfig.prompts?.persona || null,
                        domain_prompt: agentConfig.prompts?.domain || null,
                        guardrails_prompt: agentConfig.prompts?.guardrails || null,
                        tools_granted: agentConfig.tools || [],
                        rag_top_k: agentConfig.rag?.top_k || 5,
                        rag_min_confidence: agentConfig.rag?.min_confidence || 0.6,
                        strict_grounding: agentConfig.rag?.strict_grounding || false,
                        preferred_provider: agentConfig.llm?.provider || defaultLlm.provider,
                        preferred_model: agentConfig.llm?.model || defaultLlm.model,
                        is_active: true,
                    })
                    .select('id')
                    .single()

                if (agentErr || !newAgent) {
                    console.error(`Brain agent clone error (${agentConfig.role}):`, agentErr)
                    continue
                }
                agentId = newAgent.id
            }

            createdBrainAgents.push({ role: agentConfig.role, id: agentId! })
        }

        // Primary brain agent = first agent marked is_primary, or first agent
        const primaryAgent = resolvedAgents.find((a: any) => a.is_primary) || resolvedAgents[0]
        const primaryBrainAgentId = createdBrainAgents.find(a => a.role === primaryAgent?.role)?.id || null

        // Enrich snapshot with brain agent IDs
        const enrichedSnapshot = {
            ...snapshot,
            brain_agent_ids: createdBrainAgents,
            primary_brain_agent_id: primaryBrainAgentId,
        }

        // ── 6. Generate API key ──────────────────────────────────
        const { raw: apiKey, hash: apiKeyHash } = generateApiKey()

        // ── 7. Create engine_instances ───────────────────────────
        const engineName = assigned_user_id
            ? `${bundle.name} — ${org.name} (user)`
            : `${bundle.name} — ${org.name}`

        const { data: engineInstance, error: instanceErr } = await supabase
            .from('engine_instances')
            .insert({
                name: engineName,
                template_id: bundle.workflow_template_id,
                bundle_id: bundleId,
                org_id,
                assigned_user_id: assigned_user_id || null,
                brain_agent_id: primaryBrainAgentId,
                email_provider_id: email_provider_id || bundle.email_provider_id || null,
                api_key_mode,
                byok_keys: byok_keys || null,
                api_key: apiKey,
                api_key_hash: apiKeyHash,
                status: 'active',
                is_master: false,
                deployed_at: new Date().toISOString(),
                deployed_by: admin.id,
                snapshot: enrichedSnapshot,
                overrides: {},
                config: {
                    bundle_snapshot: enrichedSnapshot,
                    flowConfig: { nodes, edges },
                    brain_agent_id: primaryBrainAgentId,
                },
            })
            .select('id')
            .single()

        if (instanceErr || !engineInstance) {
            console.error('Engine instance create error:', instanceErr)
            return NextResponse.json({ error: 'Failed to create engine deployment' }, { status: 500 })
        }

        // ── 8. Clone agent templates → org_agents ──────────────
        // Look up agent template assignments for this brain + merge with
        // resolved bundle agents to create fully-linked org_agents rows.
        const createdOrgAgents: { slug: string; id: string; brain_agent_id: string | null }[] = []

        // Fetch agent templates assigned to this brain (if brain exists)
        let templatesByRole: Record<string, any> = {}
        if (brainTemplate.id) {
            const { data: assignments } = await supabase
                .from('brain_agent_assignments')
                .select('*, agent_templates(*)')
                .eq('brain_template_id', brainTemplate.id)
                .eq('is_enabled', true)
                .order('priority')

            for (const assign of (assignments || []) as any[]) {
                const tmpl = assign.agent_templates
                if (tmpl) {
                    templatesByRole[tmpl.slug] = tmpl
                }
            }
        }

        for (const agentConfig of resolvedAgents) {
            const roleSlug = (agentConfig.role || agentConfig.name || 'agent')
                .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

            // Find the matching brain_agents row we just created
            const matchingBrainAgent = createdBrainAgents.find(
                ba => ba.role === agentConfig.role
            )

            // Find the source agent template (if one was assigned to the brain)
            const sourceTemplate = templatesByRole[roleSlug] || null

            const orgAgentData = {
                org_id,
                user_id: assigned_user_id || null,
                agent_template_id: sourceTemplate?.id || null,
                engine_instance_id: engineInstance.id,
                brain_agent_id: matchingBrainAgent?.id || null,

                // Identity
                slug: roleSlug,
                name: agentConfig.name || sourceTemplate?.name || agentConfig.role,
                description: agentConfig.description || sourceTemplate?.description || null,
                avatar_emoji: sourceTemplate?.avatar_emoji || '🤖',
                avatar_color: sourceTemplate?.avatar_color || 'primary',
                category: sourceTemplate?.category || 'general',
                product_target: sourceTemplate?.product_target || 'market_writer',

                // Prompts — bundle config takes precedence over template
                system_prompt: agentConfig.prompts?.foundation
                    || sourceTemplate?.system_prompt || '',
                persona_prompt: agentConfig.prompts?.persona
                    || sourceTemplate?.persona_prompt || null,
                instruction_prompt: sourceTemplate?.instruction_prompt || null,
                guardrails_prompt: agentConfig.prompts?.guardrails
                    || sourceTemplate?.guardrails_prompt || null,

                // LLM config — bundle config takes precedence
                preferred_provider: agentConfig.llm?.provider
                    || sourceTemplate?.preferred_provider || defaultLlm.provider,
                preferred_model: agentConfig.llm?.model
                    || sourceTemplate?.preferred_model || defaultLlm.model,
                temperature: agentConfig.llm?.temperature
                    ?? sourceTemplate?.temperature ?? 0.7,
                max_tokens: agentConfig.llm?.maxTokens
                    ?? sourceTemplate?.max_tokens ?? 4096,

                // Capabilities
                tools_enabled: agentConfig.tools
                    || sourceTemplate?.tools_enabled || [],
                skills: sourceTemplate?.skills || [],

                // Brain integration
                can_access_brain: sourceTemplate?.can_access_brain ?? true,
                can_write_to_brain: sourceTemplate?.can_write_to_brain ?? false,
                has_own_kb: sourceTemplate?.has_own_kb ?? false,
                kb_min_confidence: sourceTemplate?.kb_min_confidence ?? 0.6,

                // Behavior
                max_turns: agentConfig.max_turns
                    || sourceTemplate?.max_turns || 10,
                requires_approval: sourceTemplate?.requires_approval ?? false,

                // Status
                status: 'active',
                is_active: true,
                deployed_at: new Date().toISOString(),
            }

            const { data: orgAgent, error: orgAgentErr } = await supabase
                .from('org_agents')
                .insert(orgAgentData)
                .select('id, slug')
                .single()

            if (orgAgentErr) {
                console.error(`org_agents clone error (${roleSlug}):`, orgAgentErr)
                continue
            }

            createdOrgAgents.push({
                slug: orgAgent.slug,
                id: orgAgent.id,
                brain_agent_id: matchingBrainAgent?.id || null,
            })

            // Clone agent template KB entries → org_agent_kb
            if (sourceTemplate?.id && sourceTemplate.has_own_kb) {
                const { data: kbEntries } = await supabase
                    .from('agent_template_kb')
                    .select('title, content, content_type, tags, priority')
                    .eq('agent_template_id', sourceTemplate.id)
                    .eq('is_active', true)

                if (kbEntries && kbEntries.length > 0) {
                    const kbRows = kbEntries.map((entry: any) => ({
                        org_agent_id: orgAgent.id,
                        org_id,
                        title: entry.title,
                        content: entry.content,
                        content_type: entry.content_type,
                        tags: entry.tags,
                        priority: entry.priority,
                        is_active: true,
                        source: 'template_clone',
                    }))

                    const { error: kbErr } = await supabase
                        .from('org_agent_kb')
                        .insert(kbRows)

                    if (kbErr) {
                        console.error(`org_agent_kb clone error (${roleSlug}):`, kbErr)
                    }
                }
            }
        }

        // Enrich snapshot with org_agents info
        ;(enrichedSnapshot as any).org_agents = createdOrgAgents

        // Update engine_instances snapshot with org_agents
        await supabase
            .from('engine_instances')
            .update({
                snapshot: enrichedSnapshot,
                config: {
                    bundle_snapshot: enrichedSnapshot,
                    flowConfig: { nodes, edges },
                    brain_agent_id: primaryBrainAgentId,
                    org_agents: createdOrgAgents,
                },
            })
            .eq('id', engineInstance.id)

        // ── 9. Audit log ─────────────────────────────────────────
        await supabase
            .from('engine_bundle_deployments')
            .insert({
                bundle_id: bundleId,
                engine_instance_id: engineInstance.id,
                org_id,
                assigned_user_id: assigned_user_id || null,
                brain_agent_id: primaryBrainAgentId,
                deployed_by: admin.id,
                api_key_mode,
                deployment_notes: deployment_notes || null,
                status: 'success',
            })

        return NextResponse.json({
            success: true,
            engine_instance_id: engineInstance.id,
            api_key: apiKey,   // shown once — admin must copy this
            brain_agents: createdBrainAgents,
            org_agents: createdOrgAgents,
            primary_brain_agent_id: primaryBrainAgentId,
            org_id,
            org_name: org.name,
            agents_deployed: resolvedAgents.length,
            org_agents_deployed: createdOrgAgents.length,
            workflow_template_id: workflowTemplate.id,
            workflow_name: workflowTemplate.name ?? null,
            message: `Engine "${bundle.name}" deployed to "${org.name}" with ${resolvedAgents.length} agent(s) and ${createdOrgAgents.length} org agent(s). Workflow "${workflowTemplate.name ?? workflowTemplate.id}" snapshotted.`,
        }, { status: 201 })

    } catch (error: any) {
        console.error('Bundle deploy error:', error)
        return NextResponse.json({ error: error.message || 'Deployment failed' }, { status: 500 })
    }
}

// ── GET — list deployments ────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: deployments, error } = await supabase
            .from('engine_instances')
            .select(`
                id, name, org_id, assigned_user_id, brain_agent_id,
                template_id,
                api_key_mode, status, runs_today, runs_total,
                last_run_at, deployed_at, created_at,
                api_key,
                overrides,
                organizations ( name ),
                users!engine_instances_assigned_user_id_fkey ( email ),
                workflow_templates ( id, name )
            `)
            .eq('bundle_id', params.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({
            deployments: (deployments || []).map((d: any) => ({
                id: d.id,
                name: d.name,
                org_id: d.org_id,
                org_name: d.organizations?.name ?? null,
                assigned_user_id: d.assigned_user_id,
                assigned_user_email: d.users?.email ?? null,
                brain_agent_id: d.brain_agent_id,
                workflow_template_id: d.template_id ?? null,
                workflow_name: d.workflow_templates?.name ?? null,
                api_key_mode: d.api_key_mode,
                api_key_preview: d.api_key ? `${d.api_key.substring(0, 12)}...` : null,
                status: d.status,
                runs_today: d.runs_today,
                runs_total: d.runs_total,
                last_run_at: d.last_run_at,
                deployed_at: d.deployed_at,
                has_overrides: d.overrides && Object.keys(d.overrides).length > 0,
            }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
