/**
 * /api/superadmin/engine-bundles/[id]
 *
 * GET    → single bundle details + deployments
 * PATCH  → update bundle (name, description, tier, status, etc.)
 * DELETE → archive bundle (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: bundle, error } = await supabase
            .from('engine_bundles')
            .select(`
                *,
                brain_templates ( id, name, pricing_tier ),
                workflow_templates ( id, name )
            `)
            .eq('id', params.id)
            .single()

        if (error || !bundle) {
            return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
        }

        // Get deployments for this bundle
        const { data: deployments } = await supabase
            .from('engine_bundle_deployments')
            .select(`
                id, org_id, assigned_user_id, api_key_mode,
                deployment_notes, status, created_at,
                organizations ( name ),
                users!engine_bundle_deployments_assigned_user_id_fkey ( email )
            `)
            .eq('bundle_id', params.id)
            .order('created_at', { ascending: false })
            .limit(50)

        return NextResponse.json({
            bundle: {
                ...bundle,
                brain_template_name: (bundle as any).brain_templates?.name ?? null,
                brain_template_tier: (bundle as any).brain_templates?.pricing_tier ?? null,
                workflow_template_name: (bundle as any).workflow_templates?.name ?? null,
            },
            deployments: (deployments || []).map((d: any) => ({
                ...d,
                org_name: d.organizations?.name ?? null,
                assigned_user_email: d.users?.email ?? null,
            })),
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const allowed = [
            'name', 'description', 'brain_template_id', 'workflow_template_id',
            'email_provider_id', 'default_api_key_mode', 'tier', 'config', 'status'
        ]
        const updates: Record<string, unknown> = {}
        for (const key of allowed) {
            if (key in body) updates[key] = body[key]
        }

        const { data: bundle, error } = await supabase
            .from('engine_bundles')
            .update(updates)
            .eq('id', params.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ bundle })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // Check if there are active deployments
        const { data: activeInstances } = await supabase
            .from('engine_instances')
            .select('id')
            .eq('bundle_id', params.id)
            .eq('status', 'active')
            .limit(1)

        if (activeInstances && activeInstances.length > 0) {
            return NextResponse.json(
                { error: 'Cannot delete bundle with active deployments. Disable all deployments first.' },
                { status: 409 }
            )
        }

        // Soft delete — archive
        const { error } = await supabase
            .from('engine_bundles')
            .update({ status: 'archived' })
            .eq('id', params.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
