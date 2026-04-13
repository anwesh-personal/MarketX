/**
 * GET /api/superadmin/kb/form-config — list all config rows
 * PUT /api/superadmin/kb/form-config — update a config row
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
        .from('kb_form_config')
        .select('*')
        .order('config_key')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, configs: data || [] })
}

export async function PUT(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { config_key, config_value } = await req.json()
    if (!config_key || config_value === undefined) {
        return NextResponse.json({ error: 'config_key and config_value required' }, { status: 400 })
    }

    // Validate JSON
    if (typeof config_value !== 'object' && !Array.isArray(config_value)) {
        return NextResponse.json({ error: 'config_value must be a JSON array or object' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('kb_form_config')
        .update({
            config_value,
            updated_by: admin.id,
        })
        .eq('config_key', config_key)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, config: data })
}
