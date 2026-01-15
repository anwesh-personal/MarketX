import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()

        const { data: templates, error } = await supabase
            .from('brain_templates')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ templates })
    } catch (error: any) {
        console.error('Brain templates API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch templates' },
            { status: 500 }
        )
    }
}
