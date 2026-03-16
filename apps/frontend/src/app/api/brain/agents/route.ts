import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: agents, error } = await supabaseAdmin
            .from('brain_agents')
            .select('*')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ agents })
    } catch (error: any) {
        console.error('Agents API error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch agents' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { id, ...updates } = body

        if (id) {
            const { data, error } = await supabaseAdmin
                .from('brain_agents')
                .update(updates)
                .eq('id', id)
                .eq('org_id', ctx.orgId)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ agent: data })
        }

        const { data: activeAgent, error: findError } = await supabaseAdmin
            .from('brain_agents')
            .select('id')
            .eq('org_id', ctx.orgId)
            .in('status', ['active', 'configuring'])
            .limit(1)
            .single()

        if (findError || !activeAgent) {
            return NextResponse.json({ error: 'No active agent found for this organization' }, { status: 404 })
        }

        const { data, error } = await supabaseAdmin
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
        return NextResponse.json({ error: error.message || 'Failed to update agent' }, { status: 500 })
    }
}
