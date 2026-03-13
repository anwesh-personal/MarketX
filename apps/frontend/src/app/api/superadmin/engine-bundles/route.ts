/**
 * /api/superadmin/engine-bundles
 *
 * CRUD for Engine Bundle master templates.
 * GET  → list all bundles with component details + deployment counts
 * POST → create a new bundle
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET — list bundles ───────────────────────────────────────
export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: bundles, error } = await supabase
            .from('engine_bundles')
            .select(`
                *,
                brain_templates ( id, name, pricing_tier ),
                workflow_templates ( id, name )
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Get deployment counts per bundle
        const bundleIds = (bundles || []).map((b: any) => b.id)
        let deploymentCounts: Record<string, { total: number; active: number }> = {}

        if (bundleIds.length > 0) {
            const { data: instances } = await supabase
                .from('engine_instances')
                .select('bundle_id, status')
                .in('bundle_id', bundleIds)

            for (const inst of (instances || []) as any[]) {
                if (!inst.bundle_id) continue
                if (!deploymentCounts[inst.bundle_id]) {
                    deploymentCounts[inst.bundle_id] = { total: 0, active: 0 }
                }
                deploymentCounts[inst.bundle_id].total++
                if (inst.status === 'active') {
                    deploymentCounts[inst.bundle_id].active++
                }
            }
        }

        const formatted = (bundles || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            slug: b.slug,
            tier: b.tier,
            status: b.status,
            brain_template_id: b.brain_template_id,
            brain_template_name: b.brain_templates?.name ?? null,
            brain_template_tier: b.brain_templates?.pricing_tier ?? null,
            workflow_template_id: b.workflow_template_id,
            workflow_template_name: b.workflow_templates?.name ?? null,
            email_provider_id: b.email_provider_id,
            default_api_key_mode: b.default_api_key_mode,
            config: b.config,
            created_by: b.created_by,
            created_at: b.created_at,
            updated_at: b.updated_at,
            _deployments_count: deploymentCounts[b.id]?.total ?? 0,
            _active_deployments: deploymentCounts[b.id]?.active ?? 0,
        }))

        return NextResponse.json({ bundles: formatted })
    } catch (error: any) {
        console.error('Engine bundles GET error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch bundles' }, { status: 500 })
    }
}

// ── POST — create bundle ─────────────────────────────────────
export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const {
            name,
            description,
            brain_template_id,
            workflow_template_id,
            email_provider_id,
            default_api_key_mode = 'platform',
            tier = 'echii',
            config = {},
        } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Bundle name is required' }, { status: 400 })
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        // Ensure slug uniqueness
        const { data: existing } = await supabase
            .from('engine_bundles')
            .select('id')
            .eq('slug', slug)
            .maybeSingle()

        const finalSlug = existing ? `${slug}-${Date.now()}` : slug

        const { data: bundle, error } = await supabase
            .from('engine_bundles')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                slug: finalSlug,
                brain_template_id: brain_template_id || null,
                workflow_template_id: workflow_template_id || null,
                email_provider_id: email_provider_id || null,
                default_api_key_mode,
                tier,
                config,
                status: 'active',
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ bundle }, { status: 201 })
    } catch (error: any) {
        console.error('Engine bundles POST error:', error)
        return NextResponse.json({ error: error.message || 'Failed to create bundle' }, { status: 500 })
    }
}
