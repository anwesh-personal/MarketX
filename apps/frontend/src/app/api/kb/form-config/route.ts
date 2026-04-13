/**
 * GET /api/kb/form-config
 * Returns all form config (dropdowns, steps) for the client wizard.
 * Public read — no auth required (RLS handles it).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    const { data, error } = await supabase
        .from('kb_form_config')
        .select('config_key, config_value')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert rows to keyed object for easy frontend consumption
    const config: Record<string, any> = {}
    for (const row of (data || [])) {
        config[row.config_key] = row.config_value
    }

    return NextResponse.json({ success: true, config })
}
