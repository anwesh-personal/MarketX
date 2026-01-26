import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateCost } from '@/lib/ai/costCalculator';

/**
 * AI Usage Logging API
 * Logs AI requests and calculates costs
 */

/**
 * POST /api/superadmin/ai-usage/log
 * Log AI usage and cost
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const {
            provider_id,
            model_id,
            organization_id,
            user_id,
            brain_id,
            input_tokens,
            output_tokens,
            response_time_ms,
            was_fallback,
            metadata,
        } = await request.json();

        // Validate required fields
        if (!provider_id || !model_id || !organization_id || input_tokens === undefined || output_tokens === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get model pricing
        const { data: model, error: modelError } = await supabase
            .from('ai_models')
            .select('input_cost_per_million, output_cost_per_million')
            .eq('model_id', model_id)
            .eq('provider_id', provider_id)
            .single();

        if (modelError || !model) {
            return NextResponse.json(
                { error: 'Model not found or pricing unavailable' },
                { status: 404 }
            );
        }

        // Calculate cost
        const cost = calculateCost(
            { input_tokens, output_tokens },
            {
                input_cost_per_million: model.input_cost_per_million || 0,
                output_cost_per_million: model.output_cost_per_million || 0,
            }
        );

        // Get provider info
        const { data: provider } = await supabase
            .from('ai_providers')
            .select('provider')
            .eq('id', provider_id)
            .single();

        // Insert usage log
        const { data: log, error: logError } = await supabase
            .from('ai_usage_log')
            .insert({
                provider_id,
                provider: provider?.provider || 'unknown',
                model_used: model_id,
                organization_id,
                user_id: user_id || null,
                brain_id: brain_id || null,
                tokens_used: cost.tokens_used,
                cost_usd: cost.total_cost,
                response_time_ms: response_time_ms || null,
                was_fallback: was_fallback || false,
                metadata: metadata || {},
            })
            .select()
            .single();

        if (logError) {
            console.error('Usage log error:', logError);
            return NextResponse.json(
                { error: 'Failed to log usage' },
                { status: 500 }
            );
        }

        // Increment provider usage count
        await supabase.rpc('increment_provider_usage', { p_id: provider_id });

        return NextResponse.json({
            success: true,
            log_id: log.id,
            cost: cost.total_cost,
            tokens_used: cost.tokens_used,
            breakdown: {
                input_cost: cost.input_cost,
                output_cost: cost.output_cost,
            },
        });

    } catch (error: any) {
        console.error('Usage logging error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to log usage' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/superadmin/ai-usage/log
 * Get usage logs with filtering
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const searchParams = request.nextUrl.searchParams;

        const organization_id = searchParams.get('organization_id');
        const user_id = searchParams.get('user_id');
        const provider = searchParams.get('provider');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        let query = supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact' })
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);

        if (organization_id) {
            query = query.eq('organization_id', organization_id);
        }

        if (user_id) {
            query = query.eq('user_id', user_id);
        }

        if (provider) {
            query = query.eq('provider', provider);
        }

        const { data: logs, error, count } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            logs: logs || [],
            total: count || 0,
            limit,
            offset,
        });

    } catch (error: any) {
        console.error('Get usage logs error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch logs' },
            { status: 500 }
        );
    }
}
