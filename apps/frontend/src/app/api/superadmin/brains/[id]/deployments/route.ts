/**
 * GET /api/superadmin/brains/[id]/deployments
 * Returns list of organizations that have this brain template deployed as their active brain.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteContext {
    params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: templateId } = await context.params

    const { data: agents, error } = await supabase
        .from('brain_agents')
        .select(`
            id,
            org_id,
            name,
            status,
            deployed_at,
            organizations:org_id(id, name)
        `)
        .eq('template_id', templateId)
        .is('user_id', null)
        .in('status', ['active', 'configuring'])
        .order('deployed_at', { ascending: false })

    if (error) {
        console.error('Deployments fetch error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const deployments = (agents ?? []).map((a: any) => ({
        agentId: a.id,
        orgId: a.org_id,
        orgName: a.organizations?.name ?? 'Unknown',
        agentName: a.name,
        status: a.status,
        deployedAt: a.deployed_at,
    }))

    return NextResponse.json({ deployments })
}
