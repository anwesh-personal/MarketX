import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userRecord } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single()
        if (!userRecord?.org_id) {
            return NextResponse.json({ error: 'Org context not found' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '7d'
        const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 7
        const since = new Date(Date.now() - days * 86400 * 1000).toISOString()
        const previousSince = new Date(Date.now() - days * 2 * 86400 * 1000).toISOString()

        const [currentResult, previousResult] = await Promise.all([
            supabase
                .from('brain_request_logs')
                .select('id, request_type, response_time_ms, tokens_used, feedback_rating, metadata, created_at')
                .eq('org_id', userRecord.org_id)
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .limit(5000),
            supabase
                .from('brain_request_logs')
                .select('id, response_time_ms, tokens_used, feedback_rating')
                .eq('org_id', userRecord.org_id)
                .gte('created_at', previousSince)
                .lt('created_at', since)
                .limit(5000)
        ])

        if (currentResult.error) {
            console.error('Brain analytics fetch error:', currentResult.error)
            return NextResponse.json(
                { error: 'Failed to load analytics', totalRequests: 0, successRate: 0, avgResponseTime: 0, tokensUsed: 0, ragMetrics: {}, agentUsage: [], tokenTrends: [], topQueries: [], trends: {} }
            )
        }

        const list = currentResult.data || []
        const previousList = previousResult.data || []

        const totalRequests = list.length
        const withResponseTime = list.filter((l: any) => l.response_time_ms != null)
        const avgResponseTime = withResponseTime.length
            ? Math.round(withResponseTime.reduce((s: number, l: any) => s + (l.response_time_ms || 0), 0) / withResponseTime.length)
            : 0
        const tokensUsed = list.reduce((s: number, l: any) => s + (l.tokens_used || 0), 0)
        const withRating = list.filter((l: any) => l.feedback_rating != null)
        const successRate = withRating.length
            ? withRating.filter((l: any) => l.feedback_rating === 1).length / withRating.length
            : 1

        const prevTotalRequests = previousList.length
        const prevWithResponseTime = previousList.filter((l: any) => l.response_time_ms != null)
        const prevAvgResponseTime = prevWithResponseTime.length
            ? Math.round(prevWithResponseTime.reduce((s: number, l: any) => s + (l.response_time_ms || 0), 0) / prevWithResponseTime.length)
            : 0
        const prevWithRating = previousList.filter((l: any) => l.feedback_rating != null)
        const prevSuccessRate = prevWithRating.length
            ? prevWithRating.filter((l: any) => l.feedback_rating === 1).length / prevWithRating.length
            : 1

        const requestsTrend = prevTotalRequests > 0
            ? ((totalRequests - prevTotalRequests) / prevTotalRequests) * 100
            : 0
        const successRateTrend = (successRate - prevSuccessRate) * 100
        const responseTimeTrend = prevAvgResponseTime > 0
            ? avgResponseTime - prevAvgResponseTime
            : 0

        const byType: Record<string, number> = {}
        for (const l of list) {
            const t = (l.request_type || 'chat') as string
            byType[t] = (byType[t] || 0) + 1
        }
        const agentUsage = Object.entries(byType).map(([type, count]) => ({
            type,
            count,
            percentage: totalRequests ? Math.round((count / totalRequests) * 100) : 0,
        })).sort((a, b) => b.count - a.count)

        const byDay: Record<string, number> = {}
        for (const l of list) {
            const d = new Date(l.created_at).toLocaleDateString('en-US', { weekday: 'short' })
            byDay[d] = (byDay[d] || 0) + (l.tokens_used || 0)
        }
        const tokenTrends = Object.entries(byDay).map(([date, tokens]) => ({ date, tokens })).slice(0, 7)

        const analyticsData = {
            totalRequests,
            successRate,
            avgResponseTime,
            tokensUsed,
            trends: {
                requests: requestsTrend,
                successRate: successRateTrend,
                responseTime: responseTimeTrend,
            },
            ragMetrics: {
                cacheHitRate: 0,
                rerankingUsage: 0,
                avgRetrievalTime: 0,
            },
            agentUsage,
            tokenTrends,
            topQueries: [],
        }

        return NextResponse.json(analyticsData)
    } catch (error: any) {
        console.error('Analytics API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics' },
            { status: 500 }
        )
    }
}
