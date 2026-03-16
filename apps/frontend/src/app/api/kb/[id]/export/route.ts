/**
 * KB Export API Route
 * Auth: cookie-based Supabase auth + ownership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { kbToMarkdown, KnowledgeBaseSchema } from '@/lib/kb'

const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
    params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('id', user.id).single()
        if (!userData?.org_id) return NextResponse.json({ success: false, error: 'No org' }, { status: 403 })

        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'markdown'

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .select('*')
            .eq('id', params.id)
            .eq('org_id', userData.org_id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return NextResponse.json({ success: false, error: 'KB not found' }, { status: 404 })
            throw error
        }

        const parsed = KnowledgeBaseSchema.safeParse(data.data)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'KB data is invalid', details: parsed.error.issues }, { status: 400 })
        }

        if (format === 'json') {
            return NextResponse.json({ success: true, name: data.name, data: parsed.data })
        }

        const markdown = kbToMarkdown(parsed.data)

        if (format === 'download') {
            const filename = `${data.name.toLowerCase().replace(/\s+/g, '_')}_kb.md`
            return new NextResponse(markdown, {
                headers: { 'Content-Type': 'text/markdown', 'Content-Disposition': `attachment; filename="${filename}"` },
            })
        }

        return NextResponse.json({ success: true, name: data.name, markdown })
    } catch (error: any) {
        console.error('KB export error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
