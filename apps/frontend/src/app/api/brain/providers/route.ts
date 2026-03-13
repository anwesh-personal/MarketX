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

        const { data: providers, error } = await supabase
            .from('ai_providers')
            .select('id, name, provider_type, is_active, models, capabilities')
            .eq('is_active', true)
            .order('name')

        if (error) throw error

        const safeProviders = (providers || []).map(p => ({
            id: p.id,
            name: p.name,
            provider_type: p.provider_type,
            is_active: p.is_active,
            models: p.models,
            capabilities: p.capabilities
        }))

        return NextResponse.json({ providers: safeProviders })
    } catch (error: any) {
        console.error('Providers API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch providers' },
            { status: 500 }
        )
    }
}
