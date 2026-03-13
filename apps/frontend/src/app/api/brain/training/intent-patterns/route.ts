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

        const { data: patterns, error } = await supabase
            .from('intent_patterns')
            .select('*')
            .eq('org_id', ctx.orgId)
            .order('priority', { ascending: false })

        if (error) throw error

        return NextResponse.json({ patterns: patterns || [] })
    } catch (error: any) {
        console.error('Intent patterns API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch patterns' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()

        const { data, error } = await supabase
            .from('intent_patterns')
            .insert([{
                org_id: ctx.orgId,
                agent_type: body.agent_type,
                keywords: body.keywords,
                priority: body.priority,
                is_active: true
            }])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ pattern: data })
    } catch (error: any) {
        console.error('Create pattern error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create pattern' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('intent_patterns')
            .update(updates)
            .eq('id', id)
            .eq('org_id', ctx.orgId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ pattern: data })
    } catch (error: any) {
        console.error('Update pattern error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update pattern' },
            { status: 500 }
        )
    }
}
