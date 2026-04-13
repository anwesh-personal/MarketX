/**
 * POST /api/superadmin/kb/deploy
 * Deploys locked KB into the brain system.
 * Delegates to modular hydration functions.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { createClient } from '@supabase/supabase-js'
import { hydrateICP } from './hydrate-icp'
import { hydrateOffer } from './hydrate-offer'
import { hydrateBeliefs } from './hydrate-beliefs'
import { hydrateKBDocuments } from './hydrate-kb'
import { hydrateDomainPrompt } from './hydrate-domain'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { org_id, questionnaire_id } = await req.json()
    if (!org_id || !questionnaire_id) {
        return NextResponse.json({ error: 'org_id and questionnaire_id required' }, { status: 400 })
    }

    try {
        // 1. Load agent template + config
        const { data: template } = await supabase
            .from('agent_templates')
            .select('*')
            .eq('slug', 'brain-hydrator')
            .eq('is_active', true)
            .single()

        if (!template) {
            return NextResponse.json({ error: 'brain-hydrator agent template not found' }, { status: 404 })
        }

        const config = template.metadata?.hydration_config
        if (!config) {
            return NextResponse.json({ error: 'hydration_config missing from template metadata' }, { status: 500 })
        }

        // 2. Load source data
        const { data: qr } = await supabase
            .from('kb_questionnaire_responses')
            .select('*')
            .eq('id', questionnaire_id)
            .eq('org_id', org_id)
            .single()

        if (!qr) return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 })
        if (qr.status !== 'locked' && qr.status !== 'review') {
            return NextResponse.json({ error: `KB must be locked or in review. Current: ${qr.status}` }, { status: 400 })
        }

        const { data: segments } = await supabase
            .from('kb_icp_segments')
            .select('*')
            .eq('questionnaire_id', questionnaire_id)
            .order('sort_order')

        const { data: sections } = await supabase
            .from('kb_master_sections')
            .select('*')
            .eq('questionnaire_id', questionnaire_id)
            .eq('org_id', org_id)
            .in('status', ['draft', 'approved', 'locked'])
            .order('section_number')

        // 3. Execute hydration steps (modular, sequential)
        const results: Record<string, any> = {}

        results.icp = await hydrateICP(supabase, org_id, segments || [], config)
        results.offer = await hydrateOffer(supabase, org_id, qr, config)
        results.beliefs = await hydrateBeliefs(supabase, org_id, qr, segments || [], sections || [], template)
        results.kb = await hydrateKBDocuments(supabase, org_id, questionnaire_id, segments || [], sections || [], config)
        results.domain = await hydrateDomainPrompt(supabase, org_id, qr, segments || [], sections || [], template)

        return NextResponse.json({
            success: true,
            deployed_at: new Date().toISOString(),
            deployed_by: admin.id,
            results,
        })

    } catch (error: any) {
        console.error('[KB Deploy] Error:', error.message)
        return NextResponse.json({ error: error.message || 'Deployment failed' }, { status: 500 })
    }
}
