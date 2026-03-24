import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import type { AgentTemplate } from '../route'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const updateAgentTemplateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    avatar_emoji: z.string().max(10).optional(),
    avatar_color: z.enum(['primary', 'success', 'warning', 'accent', 'info']).optional(),
    category: z.enum(['writer', 'research', 'learning', 'builder', 'general']).optional(),
    product_target: z.enum(['market_writer', 'market_builder', 'market_coach', 'all']).optional(),
    system_prompt: z.string().optional(),
    persona_prompt: z.string().nullable().optional(),
    instruction_prompt: z.string().nullable().optional(),
    guardrails_prompt: z.string().nullable().optional(),
    preferred_provider: z.string().nullable().optional(),
    preferred_model: z.string().nullable().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().min(100).max(128000).optional(),
    tools_enabled: z.array(z.string()).optional(),
    skills: z.array(z.any()).optional(),
    has_own_kb: z.boolean().optional(),
    kb_object_types: z.array(z.string()).optional(),
    kb_min_confidence: z.number().min(0).max(1).optional(),
    input_schema: z.record(z.any()).optional(),
    output_schema: z.record(z.any()).optional(),
    max_turns: z.number().min(1).max(50).optional(),
    requires_approval: z.boolean().optional(),
    can_access_brain: z.boolean().optional(),
    can_write_to_brain: z.boolean().optional(),
    is_active: z.boolean().optional(),
    tier: z.enum(['basic', 'pro', 'enterprise']).optional(),
})

// ============================================================
// GET /api/superadmin/agent-templates/[id]
// Get single agent template with skills and KB entries
// ============================================================

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        const { id } = await params
        const supabase = createClient()

        const { data: agent, error: agentError } = await supabase
            .from('agent_templates')
            .select('*')
            .eq('id', id)
            .maybeSingle()

        if (agentError) throw new Error(agentError.message)

        if (!agent) {
            return NextResponse.json(
                { error: 'Agent template not found' },
                { status: 404 }
            )
        }

        const { data: skills } = await supabase
            .from('agent_template_skills')
            .select('*')
            .eq('agent_template_id', id)
            .order('execution_order')
            .order('name')

        const { data: kbEntries } = await supabase
            .from('agent_template_kb')
            .select('*')
            .eq('agent_template_id', id)
            .eq('is_active', true)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false })

        const { data: brainAssignments } = await supabase
            .from('brain_agent_assignments')
            .select(`
                *,
                brain_templates!inner ( name, version )
            `)
            .eq('agent_template_id', id)

        const skillList = skills ?? []
        const kbList = kbEntries ?? []
        const assignList = (brainAssignments ?? []).map((ba: any) => ({
            ...ba,
            brain_name: ba.brain_templates?.name,
            brain_version: ba.brain_templates?.version,
        }))

        return NextResponse.json({
            agent,
            skills: skillList,
            kbEntries: kbList,
            brainAssignments: assignList,
            stats: {
                skillCount: skillList.length,
                kbEntryCount: kbList.length,
                assignedBrains: assignList.length
            }
        })
    } catch (error: any) {
        console.error('GET /api/superadmin/agent-templates/[id] failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================
// PATCH /api/superadmin/agent-templates/[id]
// Update agent template
// ============================================================

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        const { id } = await params
        const body = await req.json()
        const validated = updateAgentTemplateSchema.parse(body)

        const supabase = createClient()

        // Check exists
        const { data: existing, error: existErr } = await supabase
            .from('agent_templates')
            .select('id')
            .eq('id', id)
            .maybeSingle()

        if (existErr) throw new Error(existErr.message)
        if (!existing) {
            return NextResponse.json(
                { error: 'Agent template not found' },
                { status: 404 }
            )
        }

        // Build update payload — only include fields that were provided
        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        }

        for (const [key, value] of Object.entries(validated)) {
            if (value !== undefined) {
                updatePayload[key] = value
            }
        }

        const { data: updated, error: updateErr } = await supabase
            .from('agent_templates')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single()

        if (updateErr) throw new Error(updateErr.message)

        return NextResponse.json({ agent: updated })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        console.error('PATCH /api/superadmin/agent-templates/[id] failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================
// DELETE /api/superadmin/agent-templates/[id]
// Delete agent template (if not system)
// ============================================================

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        const { id } = await params
        const supabase = createClient()

        const { data: existing, error: existErr } = await supabase
            .from('agent_templates')
            .select('id, slug, is_system')
            .eq('id', id)
            .maybeSingle()

        if (existErr) throw new Error(existErr.message)
        if (!existing) {
            return NextResponse.json(
                { error: 'Agent template not found' },
                { status: 404 }
            )
        }

        if (existing.is_system) {
            return NextResponse.json(
                { error: 'Cannot delete system agent templates' },
                { status: 403 }
            )
        }

        // Check brain assignments
        const { count } = await supabase
            .from('brain_agent_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('agent_template_id', id)

        if (count && count > 0) {
            return NextResponse.json(
                { 
                    error: 'Cannot delete agent template that is assigned to brains',
                    assignedCount: count
                },
                { status: 409 }
            )
        }

        // Delete related data
        await supabase.from('agent_template_kb').delete().eq('agent_template_id', id)
        await supabase.from('agent_template_skills').delete().eq('agent_template_id', id)
        await supabase.from('agent_templates').delete().eq('id', id)

        return NextResponse.json({ 
            success: true,
            deleted: existing.slug
        })
    } catch (error: any) {
        console.error('DELETE /api/superadmin/agent-templates/[id] failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
