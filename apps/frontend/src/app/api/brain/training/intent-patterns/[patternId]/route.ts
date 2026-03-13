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
    { params }: { params: Promise<{ patternId: string }> }
) {
    try {
        const { patternId } = await params
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: pattern, error } = await supabase
            .from('intent_patterns')
            .select('*')
            .eq('id', patternId)
            .eq('org_id', ctx.orgId)
            .single()

        if (error || !pattern) {
            return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
        }

        return NextResponse.json({ pattern })
    } catch (error: any) {
        console.error('Get pattern error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch pattern' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ patternId: string }> }
) {
    try {
        const { patternId } = await params
        const body = await request.json()

        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const allowedFields = ['agent_type', 'keywords', 'priority', 'is_active']
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

        const { data: pattern, error } = await supabase
            .from('intent_patterns')
            .update(updates)
            .eq('id', patternId)
            .eq('org_id', ctx.orgId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ pattern })
    } catch (error: any) {
        console.error('Update pattern error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update pattern' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ patternId: string }> }
) {
    try {
        const { patternId } = await params
        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await supabase
            .from('intent_patterns')
            .delete()
            .eq('id', patternId)
            .eq('org_id', ctx.orgId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete pattern error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete pattern' },
            { status: 500 }
        )
    }
}
