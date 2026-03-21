import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

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
        const gate = await requireFeature(request, 'can_train_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: expansions, error } = await supabase
            .from('query_expansions')
            .select('*')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        return NextResponse.json({ expansions: expansions || [] })
    } catch (error: any) {
        console.error('Query expansions API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch expansions' },
            { status: 500 }
        )
    }
}
