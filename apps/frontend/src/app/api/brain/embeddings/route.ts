import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()

        const { data: embeddings, error } = await supabase
            .from('embeddings')
            .select('*')
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

        const { error } = await supabase
            .from('embeddings')
            .delete()
            .eq('id', id)

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
