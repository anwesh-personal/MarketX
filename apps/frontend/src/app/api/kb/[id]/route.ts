/**
 * KB Detail API Routes - Individual KB operations
 * Auth: cookie-based Supabase auth + ownership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { KnowledgeBaseSchema } from '@/lib/kb'

const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthContext() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!userData?.org_id) return null
    return { userId: user.id, orgId: userData.org_id }
}

interface RouteParams {
    params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .select('*')
            .eq('id', params.id)
            .eq('org_id', ctx.orgId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ success: false, error: 'KB not found' }, { status: 404 })
            }
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
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { name, data: kbData, incrementVersion } = body

        if (kbData) {
            const result = KnowledgeBaseSchema.safeParse(kbData)
            if (!result.success) {
                return NextResponse.json(
                    { success: false, error: 'Invalid KB data', details: result.error.issues },
                    { status: 400 }
                )
            }
        }

        const { data: current, error: fetchError } = await supabaseAdmin
            .from('knowledge_bases')
            .select('version, data')
            .eq('id', params.id)
            .eq('org_id', ctx.orgId)
            .single()

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ success: false, error: 'KB not found or access denied' }, { status: 404 })
            }
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
            try {
                await supabaseAdmin.from('kb_versions').insert({
                    kb_id: params.id,
                    version: data.version,
                    data: current.data,
                    created_at: new Date().toISOString(),
                })
            } catch (err: any) {
                console.warn('Version history not saved:', err.message)
            }
        }

        return NextResponse.json({ success: true, kb: data })
    } catch (error: any) {
        console.error('KB update error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
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
