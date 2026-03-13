import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { testModel, getModelCostInfo, formatModelName } from '@/lib/ai-providers';
import { decryptSecret } from '@/lib/secrets';

/**
 * Add and test a single model
 * Tests the model with a real API call, then upserts to database
 * is_active = true ONLY if test passes
 */

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { provider_id, model_id } = await request.json();

        if (!provider_id || !model_id) {
            return NextResponse.json({ error: 'provider_id and model_id required' }, { status: 400 });
        }

        // Get provider with API key
        const { data: provider, error: providerError } = await supabase
            .from('ai_providers')
            .select('*')
            .eq('id', provider_id)
            .single();

        if (providerError || !provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        const apiKey = decryptSecret(provider.api_key);
        const providerType = provider.provider;

        console.log(`[Add Model] Testing ${providerType}/${model_id}...`);

        // Test the model using shared utility
        const testResult = await testModel(providerType, model_id, apiKey);

        // Get cost info using shared utility
        const costInfo = getModelCostInfo(model_id);

        // Create friendly name using shared utility
        const modelName = formatModelName(model_id);

        // Upsert to database
        const { error: upsertError } = await supabase
            .from('ai_model_metadata')
            .upsert({
                provider: providerType,
                model_id: model_id,
                model_name: modelName,
                key_name: provider.name,
                key_model: `${provider.name}_${model_id}`,
                input_cost_per_million: costInfo.input,
                output_cost_per_million: costInfo.output,
                context_window_tokens: costInfo.context,
                supports_vision: costInfo.vision,
                supports_function_calling: costInfo.functions,
                supports_streaming: true, // Most models support streaming
                is_active: testResult.success, // ACTIVE ONLY IF TEST PASSES
                test_passed: testResult.success,
                test_error: testResult.error || null,
                last_tested: new Date().toISOString(),
            }, {
                onConflict: 'provider,model_id',
            });

        if (upsertError) {
            console.error('[Add Model] Upsert error:', upsertError);
            return NextResponse.json({ error: 'Failed to save model' }, { status: 500 });
        }

        console.log(`[Add Model] ${model_id}: ${testResult.success ? 'ACTIVE' : 'INACTIVE'}`);

        return NextResponse.json({
            success: true,
            model_id,
            model_name: modelName,
            test_passed: testResult.success,
            is_active: testResult.success,
            error: testResult.error,
            response: testResult.response,
        });

    } catch (error: any) {
        console.error('[Add Model] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to add model' },
            { status: 500 }
        );
    }
}
