/**
 * KB API Routes - CRUD operations for Knowledge Bases
 * Auth: cookie-based Supabase auth + org scoping
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { KnowledgeBaseSchema } from '@/lib/kb'

const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthContext() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!userData?.org_id) return null
    return { userId: user.id, orgId: userData.org_id }
}

export async function GET(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .select('id, name, version, data, created_at, updated_at')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ success: true, kbs: data })
    } catch (error: any) {
        console.error('KB list error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { name, data: kbData } = body

        if (!name) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
        }

        if (kbData) {
            const result = KnowledgeBaseSchema.safeParse(kbData)
            if (!result.success) {
                return NextResponse.json(
                    { success: false, error: 'Invalid KB data', details: result.error.issues },
                    { status: 400 }
                )
            }
        }

        const defaultKB = {
            schema_version: '1.0.0',
            kb_version: '1.0.0',
            stage: 'pre-embeddings',
            brand: { brand_name_exact: '', voice_rules: [], compliance: { forbidden_claims: [], required_disclosures: [] } },
            icp_library: { segments: [] },
            offer_library: { offers: [] },
            angles_library: { angles: [] },
            ctas_library: { ctas: [] },
            website_library: { page_blueprints: [], layouts: [] },
            email_library: { flow_blueprints: [], subject_firstline_variants: [], reply_playbooks: [], reply_strategies: [] },
            social_library: { pillars: [], post_blueprints: [] },
            routing: { defaults: [], rules: [] },
            testing: {
                pages: { enabled: false, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
                email_flows: { enabled: true, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
                email_replies: { enabled: false, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
                subject_firstline: { enabled: true, max_variants: 5, evaluation_window_days: 7, min_sample_size: 100 },
            },
            guardrails: { paused_patterns: [] },
            learning: { history: [], preferences: [] },
        }

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .insert({
                name,
                org_id: ctx.orgId,
                data: kbData || defaultKB,
                version: 1,
                created_by: ctx.userId,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, kb: data })
    } catch (error: any) {
        console.error('KB create error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
