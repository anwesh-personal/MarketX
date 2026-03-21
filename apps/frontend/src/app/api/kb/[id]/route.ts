/**
 * KB Detail API Routes
 * Auth: cookie-based Supabase auth + ownership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'
import { KnowledgeBaseSchema } from '@/lib/kb'
import { requireFeature } from '@/lib/requireFeature'

interface RouteParams { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const gate = await requireFeature(request, 'can_view_kb')
        if (gate.denied) return gate.response

        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

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

        return NextResponse.json({ success: true, kb: data })
    } catch (error: any) {
        console.error('KB get error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const gate = await requireFeature(request, 'can_view_kb')
        if (gate.denied) return gate.response

        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { name, data: kbData, incrementVersion } = body

        if (kbData) {
            const result = KnowledgeBaseSchema.safeParse(kbData)
            if (!result.success) {
                return NextResponse.json({ success: false, error: 'Invalid KB data', details: result.error.issues }, { status: 400 })
            }
        }

        const { data: current, error: fetchError } = await supabaseAdmin
            .from('knowledge_bases')
            .select('version, data')
            .eq('id', params.id)
            .eq('org_id', ctx.orgId)
            .single()

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return NextResponse.json({ success: false, error: 'KB not found or access denied' }, { status: 404 })
            throw fetchError
        }

        const updates: Record<string, any> = { updated_at: new Date().toISOString() }
        if (name !== undefined) updates.name = name
        if (kbData !== undefined) {
            updates.data = kbData
            if (incrementVersion) updates.version = (current.version || 0) + 1
        }

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .update(updates)
            .eq('id', params.id)
            .eq('org_id', ctx.orgId)
            .select()
            .single()

        if (error) throw error

        if (kbData) {
            await supabaseAdmin.from('kb_versions').insert({
                kb_id: params.id, version: data.version, data: current.data, created_at: new Date().toISOString(),
            }).then(() => {}).catch((err: any) => console.warn('Version history not saved:', err.message))
        }

        return NextResponse.json({ success: true, kb: data })
    } catch (error: any) {
        console.error('KB update error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const gate = await requireFeature(request, 'can_view_kb')
        if (gate.denied) return gate.response

        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { error } = await supabaseAdmin
            .from('knowledge_bases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', params.id)
            .eq('org_id', ctx.orgId)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'KB deleted' })
    } catch (error: any) {
        console.error('KB delete error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
