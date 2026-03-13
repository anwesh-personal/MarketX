import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperadmin } from '@/lib/superadmin-middleware'
import { encryptSecret, maskSecret, shouldPersistSecret } from '@/lib/secrets'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
    request: NextRequest,
    { params }: { params: { providerId: string } }
) {
    try {
        await requireSuperadmin(request)

        const updates = await request.json()
        if (typeof updates.api_key === 'string') {
            if (shouldPersistSecret(updates.api_key)) {
                updates.api_key = encryptSecret(updates.api_key)
            } else {
                delete updates.api_key
            }
        }
        const { data, error } = await supabase
            .from('ai_providers')
            .update(updates)
            .eq('id', params.providerId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            provider: data ? { ...data, api_key: maskSecret(data.api_key), has_api_key: Boolean(data.api_key) } : null,
        })
    } catch (error: any) {
        console.error('AI provider PATCH error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to update provider' },
            { status: error?.status || 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { providerId: string } }
) {
    try {
        await requireSuperadmin(request)

        const { error } = await supabase
            .from('ai_providers')
            .delete()
            .eq('id', params.providerId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('AI provider DELETE error:', error)
        return NextResponse.json(
            { error: error?.message || 'Failed to delete provider' },
            { status: error?.status || 500 }
        )
    }
}
