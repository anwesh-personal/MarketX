import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '7d'

        // Mock analytics data - in production, aggregate from brain_sessions/response_cache
        const analyticsData = {
            totalRequests: 1247,
            successRate: 0.968,
            avgResponseTime: 342,
            tokensUsed: 487234,
            ragMetrics: {
                cacheHitRate: 0.73,
                rerankingUsage: 0.45,
                avgRetrievalTime: 98
            },
            agentUsage: [
                { type: 'writer', count: 623, percentage: 50 },
                { type: 'generalist', count: 374, percentage: 30 },
                { type: 'analyst', count: 187, percentage: 15 },
                { type: 'coach', count: 63, percentage: 5 }
            ],
            tokenTrends: [
                { date: 'Mon', tokens: 45000 },
                { date: 'Tue', tokens: 52000 },
                { date: 'Wed', tokens: 48000 },
                { date: 'Thu', tokens: 61000 },
                { date: 'Fri', tokens: 58000 },
                { date: 'Sat', tokens: 42000 },
                { date: 'Sun', tokens: 39000 }
            ],
            topQueries: [
                { text: 'Write a blog post about AI trends', count: 23, agent: 'writer' },
                { text: 'Analyze Q4 sales data', count: 18, agent: 'analyst' },
                { text: 'Help me set productivity goals', count: 15, agent: 'coach' }
            ]
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
