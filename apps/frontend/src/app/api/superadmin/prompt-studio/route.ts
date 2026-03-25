/**
 * PROMPT STUDIO API
 * =================
 * Full CRUD for prompt_blocks + assignment management.
 * Superadmin-gated for writes, org-scoped reads.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

// GET: List all prompt blocks (platform + org-specific)
export async function GET(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const category = searchParams.get('category')
        const tag = searchParams.get('tag')
        const systemOnly = searchParams.get('system') === 'true'

        const supabase = createClient()
        let qb = supabase
            .from('prompt_blocks')
            .select('*')
            .eq('is_active', true)
            .order('category')
            .order('name')

        if (category) qb = qb.eq('category', category)
        if (systemOnly) qb = qb.eq('is_system', true)
        if (tag) qb = qb.contains('tags', [tag])

        const { data, error } = await qb
        if (error) throw new Error(error.message)

        const prompts = data ?? []

        const stats = {
            total: prompts.length,
            byCategory: {} as Record<string, number>,
        }
        for (const p of prompts) {
            stats.byCategory[p.category] = (stats.byCategory[p.category] || 0) + 1
        }

        return NextResponse.json({ prompts, stats, count: prompts.length })
    } catch (error: any) {
        console.error('GET /api/superadmin/prompt-studio failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Create a new prompt block
export async function POST(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { slug, name, description, category, content, variables, tags, org_id } = body

        if (!slug || !name || !category || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: slug, name, category, content' },
                { status: 400 }
            )
        }

        const validCategories = ['foundation', 'persona', 'instruction', 'guardrails', 'domain', 'task', 'custom']
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            )
        }

        const supabase = createClient()

        const { data, error } = await supabase
            .from('prompt_blocks')
            .insert({
                slug,
                name,
                description: description || null,
                category,
                content,
                variables: variables || [],
                tags: tags || [],
                org_id: org_id || null,
                is_system: false,
                is_active: true,
                created_by: admin.id,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'A prompt with this slug already exists' }, { status: 409 })
            }
            throw new Error(error.message)
        }

        return NextResponse.json({ prompt: data }, { status: 201 })
    } catch (error: any) {
        console.error('POST /api/superadmin/prompt-studio failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH: Update a prompt block
export async function PATCH(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Missing prompt block id' }, { status: 400 })
        }

        // Don't allow updating is_system
        delete updates.is_system
        delete updates.created_by
        delete updates.created_at

        const supabase = createClient()

        const { data, error } = await supabase
            .from('prompt_blocks')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw new Error(error.message)

        return NextResponse.json({ prompt: data })
    } catch (error: any) {
        console.error('PATCH /api/superadmin/prompt-studio failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: Soft-delete a prompt block
export async function DELETE(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        }

        const supabase = createClient()

        // Check if system prompt
        const { data: existing } = await supabase
            .from('prompt_blocks')
            .select('is_system')
            .eq('id', id)
            .single()

        if (existing?.is_system) {
            return NextResponse.json(
                { error: 'Cannot delete system prompts. Deactivate instead.' },
                { status: 403 }
            )
        }

        const { error } = await supabase
            .from('prompt_blocks')
            .update({ is_active: false })
            .eq('id', id)

        if (error) throw new Error(error.message)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('DELETE /api/superadmin/prompt-studio failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
