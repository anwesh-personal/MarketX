import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAuthContext(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    const { data: userRecord } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
    if (!userRecord?.org_id) return null
    return { userId: user.id, orgId: userRecord.org_id }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: agents, error } = await supabase
            .from('brain_agents')
            .select('*')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ agents })
    } catch (error: any) {
        console.error('Agents API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch agents' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (id) {
            const { data, error } = await supabase
                .from('brain_agents')
                .update(updates)
                .eq('id', id)
                .eq('org_id', ctx.orgId)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ agent: data })
        }

        const { data: activeAgent, error: findError } = await supabase
            .from('brain_agents')
            .select('id')
            .eq('org_id', ctx.orgId)
            .eq('is_active', true)
            .single()

        if (findError || !activeAgent) {
            return NextResponse.json({ error: 'No active agent found for this organization' }, { status: 404 })
        }

        const { data, error } = await supabase
            .from('brain_agents')
            .update(updates)
            .eq('id', activeAgent.id)
            .eq('org_id', ctx.orgId)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ agent: data })
    } catch (error: any) {
        console.error('Update agent error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update agent' },
            { status: 500 }
        )
    }
}
