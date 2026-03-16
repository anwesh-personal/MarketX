/**
 * KB Duplicate API Route
 * Auth: cookie-based Supabase auth + ownership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

interface RouteParams { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { newName } = body

        const { data: original, error: fetchError } = await supabaseAdmin
            .from('knowledge_bases')
            .select('*')
            .eq('id', params.id)
            .eq('org_id', ctx.orgId)
            .single()

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return NextResponse.json({ success: false, error: 'KB not found' }, { status: 404 })
            throw fetchError
        }

        const duplicatedData = { ...original.data, kb_version: '1.0.0' }

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .insert({
                name: newName || `${original.name} (Copy)`,
                org_id: ctx.orgId,
                data: duplicatedData,
                version: 1,
                is_active: true,
                created_by: ctx.userId,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, kb: data, originalId: params.id })
    } catch (error: any) {
        console.error('KB duplicate error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
