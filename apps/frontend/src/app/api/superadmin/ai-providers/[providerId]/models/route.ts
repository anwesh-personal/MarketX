import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/superadmin/ai-providers/[providerId]/models
 * Fetch all models from ai_model_metadata for the provider linked to this provider key.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { providerId: string } }
) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: provider, error: provErr } = await supabase
            .from('ai_providers')
            .select('provider')
            .eq('id', params.providerId)
            .single()

        if (provErr || !provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
        }

        const { data: models, error: modelsErr } = await supabase
            .from('ai_model_metadata')
            .select('id, provider, model_id, model_name, is_active, test_passed, test_error, last_tested, context_window_tokens, input_cost_per_million, output_cost_per_million, supports_vision, supports_function_calling, supports_streaming, is_deprecated')
            .eq('provider', provider.provider)
            .order('is_active', { ascending: false })
            .order('model_id', { ascending: true })

        if (modelsErr) {
            return NextResponse.json({ error: modelsErr.message }, { status: 500 })
        }

        return NextResponse.json({
            provider: provider.provider,
            models: models || [],
            total: models?.length ?? 0,
            active: models?.filter(m => m.is_active).length ?? 0,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
