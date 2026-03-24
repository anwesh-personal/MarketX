/**
 * /api/superadmin/system-email/templates/[id]
 *
 * GET    → single template with full details
 * PATCH  → update template (subject, html_body, text_body, name, variables, is_active)
 * DELETE → soft delete (deactivate) template
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: template, error } = await supabase
            .from('system_email_templates')
            .select('*')
            .eq('id', params.id)
            .single()

        if (error || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        // Get send count for this template
        const { count } = await supabase
            .from('system_email_logs')
            .select('id', { count: 'exact', head: true })
            .eq('template_id', params.id)

        return NextResponse.json({
            template,
            send_count: count || 0,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const allowed = ['name', 'subject', 'html_body', 'text_body', 'description', 'variables', 'is_active', 'category']
        const updates: Record<string, any> = {}

        for (const key of allowed) {
            if (key in body) updates[key] = body[key]
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        updates.updated_by = admin.id
        updates.updated_at = new Date().toISOString()

        const { data: template, error } = await supabase
            .from('system_email_templates')
            .update(updates)
            .eq('id', params.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ template })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // Soft delete — deactivate, don't destroy
        const { error } = await supabase
            .from('system_email_templates')
            .update({
                is_active: false,
                updated_by: admin.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
