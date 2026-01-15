import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()

        const { data: expansions, error } = await supabase
            .from('query_expansions')
            .select('*')
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
