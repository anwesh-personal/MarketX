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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: agent, error } = await supabase
            .from('brain_agents')
            .select('*')
            .eq('id', agentId)
            .eq('org_id', ctx.orgId)
            .single()

        if (error || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        return NextResponse.json({ agent })
    } catch (error: any) {
        console.error('Get agent error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch agent' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params
        const body = await request.json()

        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const allowedFields = ['name', 'system_prompt', 'tools', 'config', 'is_active']
        const updates: Record<string, any> = {}
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                updates[key] = body[key]
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        updates.updated_at = new Date().toISOString()

        const { data: agent, error } = await supabase
            .from('brain_agents')
            .update(updates)
            .eq('id', agentId)
            .eq('org_id', ctx.orgId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ agent })
    } catch (error: any) {
        console.error('Update agent error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update agent' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await supabase
            .from('brain_agents')
            .delete()
            .eq('id', agentId)
            .eq('org_id', ctx.orgId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete agent error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete agent' },
            { status: 500 }
        )
    }
}
