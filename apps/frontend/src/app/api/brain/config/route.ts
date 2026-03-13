import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: template, error } = await supabase
            .from('brain_templates')
            .select('config')
            .eq('is_default', true)
            .single()

        if (error) throw error

        return NextResponse.json({
            ragConfig: template?.config?.rag || {}
        })
    } catch (error: any) {
        console.error('Brain config API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch config' },
            { status: 500 }
        )
    }
}
