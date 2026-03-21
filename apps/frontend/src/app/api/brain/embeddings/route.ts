import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'
import { requireFeature } from '@/lib/requireFeature'

export async function GET(request: NextRequest) {
    try {
        const gate = await requireFeature(request, 'can_feed_brain')
        if (gate.denied) return gate.response

        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: embeddings, error } = await supabaseAdmin
            .from('embeddings')
            .select('*')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .limit(200)

        if (error) throw error

        return NextResponse.json({ embeddings })
    } catch (error: any) {
        console.error('Embeddings API error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch embeddings' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        const gate = await requireFeature(request, 'can_feed_brain')
        if (gate.denied) return gate.response

        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { error } = await supabaseAdmin
            .from('embeddings')
            .delete()
            .eq('id', id)
            .eq('org_id', ctx.orgId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete embedding error:', error)
        return NextResponse.json({ error: error.message || 'Failed to delete embedding' }, { status: 500 })
    }
}
