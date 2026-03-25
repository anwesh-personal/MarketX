/**
 * ORG-SCOPED AGENT LISTING
 * =========================
 * Returns agents available to the current user's org.
 * 
 * Flow:
 *   1. If org has deployed org_agents → return those (with brain context)
 *   2. If not → fall back to active agent_templates (global catalog)
 * 
 * This is used by the workflow builder's AgentConfig component.
 * Does NOT require superadmin — any authenticated org member can read.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    const supabase = createClient()

    // 1. Authenticate
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Resolve org
    const { data: me, error: meError } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()

    if (meError || !me?.org_id) {
        return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
    }

    const orgId = me.org_id
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    try {
        // 3. Try org_agents first (deployed agents)
        let orgQuery = supabase
            .from('org_agents')
            .select(`
                id, slug, name, description, category, avatar_emoji, avatar_color,
                preferred_provider, preferred_model, temperature, max_tokens,
                tools_enabled, can_access_brain, can_write_to_brain, has_own_kb,
                is_active, status, agent_template_id, brain_agent_id
            `)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .order('category')
            .order('name')

        if (category) {
            orgQuery = orgQuery.eq('category', category)
        }

        const { data: orgAgents, error: orgErr } = await orgQuery

        if (!orgErr && orgAgents && orgAgents.length > 0) {
            // Org has deployed agents — return them
            return NextResponse.json({
                agents: orgAgents.map(a => ({
                    ...a,
                    source: 'org_agent' as const,
                })),
                source: 'org_agents',
                count: orgAgents.length,
            })
        }

        // 4. Fallback: return global agent_templates
        let templateQuery = supabase
            .from('agent_templates')
            .select(`
                id, slug, name, description, category, avatar_emoji, avatar_color,
                preferred_provider, preferred_model, temperature, max_tokens,
                tools_enabled, can_access_brain, can_write_to_brain, has_own_kb,
                is_active, system_prompt
            `)
            .eq('is_active', true)
            .order('category')
            .order('name')

        if (category) {
            templateQuery = templateQuery.eq('category', category)
        }

        const { data: templates, error: tplErr } = await templateQuery

        if (tplErr) throw new Error(tplErr.message)

        return NextResponse.json({
            agents: (templates ?? []).map(t => ({
                ...t,
                source: 'agent_template' as const,
            })),
            source: 'agent_templates',
            count: (templates ?? []).length,
        })
    } catch (error: any) {
        console.error('GET /api/agents failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
