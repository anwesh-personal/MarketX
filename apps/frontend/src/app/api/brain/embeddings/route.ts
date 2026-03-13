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

        const { data: embeddings, error } = await supabase
            .from('embeddings')
            .select('*')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .limit(200)

        if (error) throw error

        return NextResponse.json({ embeddings })
    } catch (error: any) {
        console.error('Embeddings API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch embeddings' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 })
        }

        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await supabase
            .from('embeddings')
            .delete()
            .eq('id', id)
            .eq('org_id', ctx.orgId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete embedding error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete embedding' },
            { status: 500 }
        )
    }
}
