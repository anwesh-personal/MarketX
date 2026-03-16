/**
 * KB Export API Route
 * Auth: cookie-based Supabase auth + ownership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'
import { kbToMarkdown, KnowledgeBaseSchema } from '@/lib/kb'

interface RouteParams { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'markdown'

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .select('*')
            .eq('id', params.id)
            .eq('org_id', ctx.orgId)
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
