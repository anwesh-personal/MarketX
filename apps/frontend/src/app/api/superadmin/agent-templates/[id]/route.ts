import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { query, queryOne } from '@/lib/db'
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

        const agent = await queryOne<AgentTemplate>(`
            SELECT * FROM agent_templates WHERE id = $1
        `, [id])

        if (!agent) {
            return NextResponse.json(
                { error: 'Agent template not found' },
                { status: 404 }
            )
        }

        const skills = await query<any>(`
            SELECT * FROM agent_template_skills 
            WHERE agent_template_id = $1
            ORDER BY execution_order, name
        `, [id])

        const kbEntries = await query<any>(`
            SELECT * FROM agent_template_kb
            WHERE agent_template_id = $1 AND is_active = true
            ORDER BY priority DESC, created_at DESC
        `, [id])

        const brainAssignments = await query<any>(`
            SELECT 
                baa.*,
                bt.name as brain_name,
                bt.version as brain_version
            FROM brain_agent_assignments baa
            JOIN brain_templates bt ON bt.id = baa.brain_template_id
            WHERE baa.agent_template_id = $1
            ORDER BY bt.name
        `, [id])

        return NextResponse.json({
            agent,
            skills,
            kbEntries,
            brainAssignments,
            stats: {
                skillCount: skills.length,
                kbEntryCount: kbEntries.length,
                assignedBrains: brainAssignments.length
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

        const existing = await queryOne<AgentTemplate>(
            'SELECT * FROM agent_templates WHERE id = $1',
            [id]
        )

        if (!existing) {
            return NextResponse.json(
                { error: 'Agent template not found' },
                { status: 404 }
            )
        }

        const updates: string[] = []
        const values: any[] = []
        let paramIndex = 1

        const fieldMappings: Record<string, string> = {
            name: 'name',
            description: 'description',
            avatar_emoji: 'avatar_emoji',
            avatar_color: 'avatar_color',
            category: 'category',
            product_target: 'product_target',
            system_prompt: 'system_prompt',
            persona_prompt: 'persona_prompt',
            instruction_prompt: 'instruction_prompt',
            guardrails_prompt: 'guardrails_prompt',
            preferred_provider: 'preferred_provider',
            preferred_model: 'preferred_model',
            temperature: 'temperature',
            max_tokens: 'max_tokens',
            tools_enabled: 'tools_enabled',
            skills: 'skills',
            has_own_kb: 'has_own_kb',
            kb_object_types: 'kb_object_types',
            kb_min_confidence: 'kb_min_confidence',
            input_schema: 'input_schema',
            output_schema: 'output_schema',
            max_turns: 'max_turns',
            requires_approval: 'requires_approval',
            can_access_brain: 'can_access_brain',
            can_write_to_brain: 'can_write_to_brain',
            is_active: 'is_active',
            tier: 'tier',
        }

        for (const [key, dbField] of Object.entries(fieldMappings)) {
            if (validated[key as keyof typeof validated] !== undefined) {
                let value = validated[key as keyof typeof validated]
                
                if (key === 'skills' || key === 'input_schema' || key === 'output_schema') {
                    value = JSON.stringify(value)
                }
                
                updates.push(`${dbField} = $${paramIndex++}`)
                values.push(value)
            }
        }

        if (updates.length === 0) {
            return NextResponse.json({ agent: existing })
        }

        values.push(id)
        const sql = `
            UPDATE agent_templates 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `

        const updated = await queryOne<AgentTemplate>(sql, values)

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

        const existing = await queryOne<AgentTemplate>(
            'SELECT * FROM agent_templates WHERE id = $1',
            [id]
        )

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

        const assignments = await query<any>(
            'SELECT COUNT(*) as count FROM brain_agent_assignments WHERE agent_template_id = $1',
            [id]
        )

        if (assignments[0]?.count > 0) {
            return NextResponse.json(
                { 
                    error: 'Cannot delete agent template that is assigned to brains',
                    assignedCount: assignments[0].count
                },
                { status: 409 }
            )
        }

        await query('DELETE FROM agent_template_kb WHERE agent_template_id = $1', [id])
        await query('DELETE FROM agent_template_skills WHERE agent_template_id = $1', [id])
        await query('DELETE FROM agent_templates WHERE id = $1', [id])

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
