/**
 * KB Duplicate API Route
 * Auth: cookie-based Supabase auth + ownership verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
    params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { data: userData } = await supabaseAdmin.from('users').select('org_id').eq('id', user.id).single()
        if (!userData?.org_id) return NextResponse.json({ success: false, error: 'No org' }, { status: 403 })

        const body = await request.json()
        const { newName } = body

        const { data: original, error: fetchError } = await supabaseAdmin
            .from('knowledge_bases')
            .select('*')
            .eq('id', params.id)
            .eq('org_id', userData.org_id)
            .single()

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return NextResponse.json({ success: false, error: 'KB not found' }, { status: 404 })
            throw fetchError
        }

        const duplicatedData = { ...original.data }
        duplicatedData.kb_version = '1.0.0'

        const { data, error } = await supabaseAdmin
            .from('knowledge_bases')
            .insert({
                name: newName || `${original.name} (Copy)`,
                org_id: userData.org_id,
                data: duplicatedData,
                version: 1,
                is_active: true,
                created_by: user.id,
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
