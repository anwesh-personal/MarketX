/**
 * /api/superadmin/engine-bundles/[id]/instances/[instanceId]
 *
 * GET   → full deployed instance details (snapshot + overrides + resolved config)
 * PATCH → apply granular overrides to a deployed instance
 *         Supports partial path-based updates:
 *         { "agents.writer.llm.model": "gpt-4o" }
 *         or nested object:
 *         { "agents": { "writer": { "llm": { "model": "gpt-4o" } } } }
 * DELETE → disable/decommission this deployed instance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function deepMerge(base: Record<string, any>, patch: Record<string, any>): Record<string, any> {
    const result = { ...base }
    for (const key of Object.keys(patch)) {
        if (
            patch[key] !== null &&
            typeof patch[key] === 'object' &&
            !Array.isArray(patch[key]) &&
            typeof base[key] === 'object' &&
            !Array.isArray(base[key])
        ) {
            result[key] = deepMerge(base[key] || {}, patch[key])
        } else {
            result[key] = patch[key]
        }
    }
    return result
}

/** Set nested key via dot-path: "agents.writer.llm.model" = "gpt-4o" */
function setByPath(obj: Record<string, any>, path: string, value: any): Record<string, any> {
    const parts = path.split('.')
    const result = { ...obj }
    let cursor: any = result
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]
        cursor[key] = typeof cursor[key] === 'object' ? { ...cursor[key] } : {}
        cursor = cursor[key]
    }
    cursor[parts[parts.length - 1]] = value
    return result
}

// ── GET ───────────────────────────────────────────────────────

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string; instanceId: string } }
) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: instance, error } = await supabase
            .from('engine_instances')
            .select(`
                *,
                organizations ( id, name, plan ),
                users!engine_instances_assigned_user_id_fkey ( id, email )
            `)
            .eq('id', params.instanceId)
            .eq('bundle_id', params.id)
            .single()

        if (error || !instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
        }

        // Compute resolved config = snapshot merged with overrides
        const snapshot = (instance as any).snapshot || {}
        const overrides = (instance as any).overrides || {}
        const resolvedConfig = deepMerge(snapshot, overrides)

        // Fetch override audit log
        const { data: overrideLogs } = await supabase
            .from('engine_instance_override_logs')
            .select('*')
            .eq('instance_id', params.instanceId)
            .order('created_at', { ascending: false })
            .limit(50)

        return NextResponse.json({
            instance: {
                ...(instance as any),
                org_name: (instance as any).organizations?.name ?? null,
                assigned_user_email: (instance as any).users?.email ?? null,
                api_key_preview: (instance as any).api_key
                    ? `${(instance as any).api_key.substring(0, 16)}...`
                    : null,
            },
            snapshot,
            overrides,
            resolved_config: resolvedConfig,
            override_logs: overrideLogs || [],
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── PATCH — apply overrides ───────────────────────────────────

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string; instanceId: string } }
) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { overrides: patchOverrides, reason, dot_paths } = body
        // dot_paths: [{ path: "agents.writer.llm.model", value: "gpt-4o" }, ...]

        // Fetch current overrides
        const { data: current, error: fetchErr } = await supabase
            .from('engine_instances')
            .select('overrides, snapshot')
            .eq('id', params.instanceId)
            .eq('bundle_id', params.id)
            .single()

        if (fetchErr || !current) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
        }

        let newOverrides = (current as any).overrides || {}

        // Apply dot-path overrides first
        if (dot_paths && Array.isArray(dot_paths)) {
            for (const { path, value } of dot_paths) {
                const oldValue = getByPath(newOverrides, path)
                newOverrides = setByPath(newOverrides, path, value)

                // Log this specific override
                await supabase.from('engine_instance_override_logs').insert({
                    instance_id: params.instanceId,
                    changed_by: admin.id,
                    field_path: path,
                    old_value: oldValue !== undefined ? oldValue : null,
                    new_value: value,
                    reason: reason || null,
                })
            }
        }

        // Apply object-style overrides
        if (patchOverrides && typeof patchOverrides === 'object') {
            const flatPaths = flattenObject(patchOverrides)
            for (const [path, value] of Object.entries(flatPaths)) {
                const oldValue = getByPath(newOverrides, path)
                newOverrides = setByPath(newOverrides, path, value as any)
                await supabase.from('engine_instance_override_logs').insert({
                    instance_id: params.instanceId,
                    changed_by: admin.id,
                    field_path: path,
                    old_value: oldValue !== undefined ? oldValue : null,
                    new_value: value,
                    reason: reason || null,
                })
            }
        }

        const { error: updateErr } = await supabase
            .from('engine_instances')
            .update({ overrides: newOverrides })
            .eq('id', params.instanceId)

        if (updateErr) throw updateErr

        // Sync brain_agents if agent prompts/LLM were overridden
        const snapshot = (current as any).snapshot || {}
        await syncBrainAgentsFromOverrides(params.instanceId, snapshot, newOverrides)

        const resolvedConfig = deepMerge(snapshot, newOverrides)

        return NextResponse.json({
            success: true,
            overrides: newOverrides,
            resolved_config: resolvedConfig,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── DELETE — disable instance ─────────────────────────────────

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string; instanceId: string } }
) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { error } = await supabase
            .from('engine_instances')
            .update({ status: 'disabled' })
            .eq('id', params.instanceId)
            .eq('bundle_id', params.id)

        if (error) throw error

        // Also deactivate associated brain agents
        await supabase
            .from('brain_agents')
            .update({ is_active: false })
            .eq('id', (
                await supabase
                    .from('engine_instances')
                    .select('brain_agent_id')
                    .eq('id', params.instanceId)
                    .single()
            ).data?.brain_agent_id || '')

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── Helpers ───────────────────────────────────────────────────

function getByPath(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function flattenObject(
    obj: Record<string, any>,
    prefix = ''
): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value, fullKey))
        } else {
            result[fullKey] = value
        }
    }
    return result
}

/** When agent prompts/LLM overridden → sync back to brain_agents row */
async function syncBrainAgentsFromOverrides(
    instanceId: string,
    snapshot: Record<string, any>,
    overrides: Record<string, any>
) {
    try {
        const agentOverrides = overrides.agents || {}
        if (Object.keys(agentOverrides).length === 0) return

        const brainAgentIds: { role: string; id: string }[] = snapshot.brain_agent_ids || []

        for (const [role, agentPatch] of Object.entries(agentOverrides) as [string, any][]) {
            const brainAgentEntry = brainAgentIds.find(a => a.role === role)
            if (!brainAgentEntry) continue

            const updates: Record<string, any> = {}

            if (agentPatch.llm?.provider) updates.preferred_provider = agentPatch.llm.provider
            if (agentPatch.llm?.model) updates.preferred_model = agentPatch.llm.model
            if (agentPatch.prompts?.foundation) updates.foundation_prompt = agentPatch.prompts.foundation
            if (agentPatch.prompts?.persona) updates.persona_prompt = agentPatch.prompts.persona
            if (agentPatch.prompts?.domain) updates.domain_prompt = agentPatch.prompts.domain
            if (agentPatch.prompts?.guardrails) updates.guardrails_prompt = agentPatch.prompts.guardrails
            if (agentPatch.tools) updates.tools_granted = agentPatch.tools
            if (agentPatch.rag?.top_k) updates.rag_top_k = agentPatch.rag.top_k
            if (agentPatch.rag?.min_confidence) updates.rag_min_confidence = agentPatch.rag.min_confidence
            if (agentPatch.rag?.strict_grounding !== undefined) updates.strict_grounding = agentPatch.rag.strict_grounding

            if (Object.keys(updates).length > 0) {
                await supabase
                    .from('brain_agents')
                    .update(updates)
                    .eq('id', brainAgentEntry.id)
            }
        }
    } catch (e) {
        console.error('syncBrainAgentsFromOverrides error:', e)
    }
}
