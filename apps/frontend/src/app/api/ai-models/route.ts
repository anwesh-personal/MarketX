import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const provider = searchParams.get('provider');
        const activeOnly = searchParams.get('active_only') !== 'false'; // Default to true

        let query = serviceSupabase
            .from('ai_model_metadata')
            .select('id, provider, model_id, model_name, input_cost_per_million, output_cost_per_million, context_window_tokens, max_output_tokens, supports_vision, supports_function_calling, is_active, test_passed')
            .order('provider', { ascending: true })
            .order('model_name', { ascending: true });

        // Filter by active status (default: only active models)
        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        // Filter by provider if specified
        if (provider) {
            query = query.eq('provider', provider);
        }

        const { data: models, error } = await query;

        if (error) {
            console.error('Error fetching AI models:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Group models by provider for easier consumption
        const groupedByProvider: Record<string, typeof models> = {};
        for (const model of models || []) {
            if (!groupedByProvider[model.provider]) {
                groupedByProvider[model.provider] = [];
            }
            groupedByProvider[model.provider].push(model);
        }

        return NextResponse.json({
            models: models || [],
            grouped: groupedByProvider,
            count: models?.length || 0,
        });
    } catch (error: any) {
        console.error('AI Models API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
