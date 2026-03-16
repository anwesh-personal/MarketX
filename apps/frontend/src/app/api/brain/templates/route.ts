import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: templates, error } = await supabaseAdmin
            .from('brain_templates')
            .select('*')
            .or(`org_id.eq.${ctx.orgId},org_id.is.null`)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ templates })
    } catch (error: any) {
        console.error('Brain templates API error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 })
    }
}
