/**
 * GET /api/superadmin/organizations/[id]/active-brain
 * Returns the active deployed brain agent for this organization (single source of truth).
 * Used by superadmin UI to show which brain governs an org.
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

    const { id: orgId } = await context.params

    const { data: agent, error } = await supabase
        .from('brain_agents')
        .select(`
            id,
            template_id,
            template_version,
            name,
            status,
            tier,
            deployed_at,
            last_active_at,
            brain_templates:template_id(id, name, version)
        `)
        .eq('org_id', orgId)
        .is('user_id', null)
        .in('status', ['active', 'configuring'])
        .order('deployed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error('Active brain fetch error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!agent) {
        return NextResponse.json({ activeBrain: null, message: 'No brain deployed for this organization' })
    }

    const template = (agent as any).brain_templates
    return NextResponse.json({
        activeBrain: {
            agentId: agent.id,
            templateId: agent.template_id,
            templateVersion: agent.template_version,
            name: agent.name,
            status: agent.status,
            tier: agent.tier,
            deployedAt: agent.deployed_at,
            lastActiveAt: agent.last_active_at,
            templateName: template?.name ?? null,
            templateVersionLabel: template?.version ?? agent.template_version,
        },
    })
}
