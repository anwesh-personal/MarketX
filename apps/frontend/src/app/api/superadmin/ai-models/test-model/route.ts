import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { decryptSecret } from '@/lib/secrets'
import { testModel } from '@/lib/ai-providers'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/superadmin/ai-models/test-model
 * Test a single model and upsert its active/inactive status in ai_model_metadata.
 * On pass  → is_active = true,  test_passed = true
 * On fail  → is_active = false, test_passed = false
 */
export async function POST(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { provider_id, model_id } = await req.json()

        if (!provider_id || !model_id) {
            return NextResponse.json({ error: 'provider_id and model_id required' }, { status: 400 })
        }

        const { data: provider, error: provErr } = await supabase
            .from('ai_providers')
            .select('id, provider, api_key')
            .eq('id', provider_id)
            .single()

        if (provErr || !provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
        }

        const apiKey = decryptSecret(provider.api_key)
        const result = await testModel(provider.provider, model_id, apiKey)

        const now = new Date().toISOString()

        const upsertPayload = {
            provider: provider.provider,
            model_id,
            model_name: model_id,
            is_active: result.success,
            test_passed: result.success,
            test_error: result.error || null,
            last_tested: now,
            last_verified_at: now,
        }

        const { error: upsertErr } = await supabase
            .from('ai_model_metadata')
            .upsert(upsertPayload, { onConflict: 'provider,model_id' })

        if (upsertErr) {
            console.error('Model status upsert failed:', upsertErr)
        }

        return NextResponse.json({
            success: true,
            model_id,
            test_passed: result.success,
            is_active: result.success,
            response: result.response,
            error: result.error,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
