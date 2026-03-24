import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aggregateCostsByPeriod } from '@/lib/ai/costCalculator';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * AI Cost Analytics API
 * Get cost breakdowns and analytics
 */

/**
 * GET /api/superadmin/ai-usage/analytics
 * Get cost analytics
 */
export async function GET(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const supabase = createClient();
        const searchParams = request.nextUrl.searchParams;

        const organization_id = searchParams.get('organization_id');
        const period = searchParams.get('period') || '30'; // days
        const group_by = searchParams.get('group_by') as 'day' | 'week' | 'month' || 'day';

        // Calculate date range
        const end_date = new Date();
        const start_date = new Date();
        start_date.setDate(start_date.getDate() - parseInt(period));

        // Build query
        let query = supabase
            .from('ai_usage_log')
            .select('*')
            .gte('timestamp', start_date.toISOString())
            .lte('timestamp', end_date.toISOString());

        if (organization_id) {
            query = query.eq('organization_id', organization_id);
        }

        const { data: logs, error } = await query;

        if (error) {
            throw error;
        }

        // Calculate totals
        const total_cost = logs?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0;
        const total_tokens = logs?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0;
        const total_requests = logs?.length || 0;

        // Group by provider
        const by_provider = logs?.reduce((acc: any, log) => {
            const provider = log.provider || 'unknown';
            if (!acc[provider]) {
                acc[provider] = {
                    cost: 0,
                    tokens: 0,
                    requests: 0,
                };
            }
            acc[provider].cost += log.cost_usd || 0;
            acc[provider].tokens += log.tokens_used || 0;
            acc[provider].requests += 1;
            return acc;
        }, {});

        // Group by model
        const by_model = logs?.reduce((acc: any, log) => {
            const model = log.model_used || 'unknown';
            if (!acc[model]) {
                acc[model] = {
                    cost: 0,
                    tokens: 0,
                    requests: 0,
                };
            }
            acc[model].cost += log.cost_usd || 0;
            acc[model].tokens += log.tokens_used || 0;
            acc[model].requests += 1;
            return acc;
        }, {});

        // Time series data
        const time_series = aggregateCostsByPeriod(
            (logs || []).map(log => ({
                cost_usd: log.cost_usd || 0,
                tokens_used: log.tokens_used || 0,
                timestamp: log.timestamp,
            })),
            group_by
        );

        // Calculate cost trend
        const halfway = Math.floor(logs!.length / 2);
        const first_half_cost = logs!.slice(0, halfway).reduce((sum, log) => sum + (log.cost_usd || 0), 0);
        const second_half_cost = logs!.slice(halfway).reduce((sum, log) => sum + (log.cost_usd || 0), 0);
        const cost_trend = first_half_cost === 0 ? 0 : ((second_half_cost - first_half_cost) / first_half_cost) * 100;

        // Average response time
        const response_times = logs?.filter(log => log.response_time_ms).map(log => log.response_time_ms) || [];
        const avg_response_time = response_times.length > 0
            ? response_times.reduce((sum, time) => sum + time, 0) / response_times.length
            : 0;

        // Fallback rate
        const fallback_count = logs?.filter(log => log.was_fallback).length || 0;
        const fallback_rate = total_requests > 0 ? (fallback_count / total_requests) * 100 : 0;

        return NextResponse.json({
            success: true,
            period: {
                start: start_date.toISOString(),
                end: end_date.toISOString(),
                days: parseInt(period),
            },
            totals: {
                cost: parseFloat(total_cost.toFixed(2)),
                tokens: total_tokens,
                requests: total_requests,
            },
            breakdown: {
                by_provider,
                by_model,
            },
            time_series,
            metrics: {
                avg_cost_per_request: total_requests > 0 ? total_cost / total_requests : 0,
                avg_tokens_per_request: total_requests > 0 ? total_tokens / total_requests : 0,
                avg_response_time_ms: Math.round(avg_response_time),
                fallback_rate: parseFloat(fallback_rate.toFixed(2)),
                cost_trend_percent: parseFloat(cost_trend.toFixed(2)),
            },
        });

    } catch (error: any) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
