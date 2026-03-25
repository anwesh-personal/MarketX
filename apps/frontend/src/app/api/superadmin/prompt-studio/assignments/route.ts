/**
 * PROMPT ASSIGNMENTS API
 * ======================
 * Assign/unassign prompt blocks to brains, agents, templates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

// GET: List assignments for a target (brain/agent/template)
export async function GET(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const targetType = searchParams.get('target_type')
        const targetId = searchParams.get('target_id')
        const promptId = searchParams.get('prompt_id')

        const supabase = createClient()
        let qb = supabase
            .from('prompt_assignments')
            .select('*, prompt_blocks(*)')
            .eq('is_active', true)
            .order('priority', { ascending: true })

        if (targetType && targetId) {
            qb = qb.eq('target_type', targetType).eq('target_id', targetId)
        }

        if (promptId) {
            qb = qb.eq('prompt_block_id', promptId)
        }

        const { data, error } = await qb
        if (error) throw new Error(error.message)

        return NextResponse.json({ assignments: data ?? [], count: (data ?? []).length })
    } catch (error: any) {
        console.error('GET /api/superadmin/prompt-studio/assignments failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Assign a prompt block to a target
export async function POST(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { prompt_block_id, target_type, target_id, priority, override_variables } = body

        if (!prompt_block_id || !target_type || !target_id) {
            return NextResponse.json(
                { error: 'Missing: prompt_block_id, target_type, target_id' },
                { status: 400 }
            )
        }

        const validTargets = ['brain_agent', 'org_agent', 'agent_template']
        if (!validTargets.includes(target_type)) {
            return NextResponse.json(
                { error: `Invalid target_type. Must be: ${validTargets.join(', ')}` },
                { status: 400 }
            )
        }

        const supabase = createClient()

        const { data, error } = await supabase
            .from('prompt_assignments')
            .insert({
                prompt_block_id,
                target_type,
                target_id,
                priority: priority ?? 0,
                override_variables: override_variables ?? {},
                is_active: true,
                assigned_by: admin.id,
            })
            .select('*, prompt_blocks(*)')
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'This prompt is already assigned to this target' },
                    { status: 409 }
                )
            }
            throw new Error(error.message)
        }

        return NextResponse.json({ assignment: data }, { status: 201 })
    } catch (error: any) {
        console.error('POST /api/superadmin/prompt-studio/assignments failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: Unassign a prompt block
export async function DELETE(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing assignment id' }, { status: 400 })
        }

        const supabase = createClient()

        const { error } = await supabase
            .from('prompt_assignments')
            .update({ is_active: false })
            .eq('id', id)

        if (error) throw new Error(error.message)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('DELETE /api/superadmin/prompt-studio/assignments failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
