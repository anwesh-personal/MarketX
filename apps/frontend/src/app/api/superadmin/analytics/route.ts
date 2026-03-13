import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/superadmin-middleware'
import { fetchAnalyticsSeries, parseAnalyticsRange } from '@/lib/superadmin-insights'

export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request)

        const range = parseAnalyticsRange(request.nextUrl.searchParams.get('range'))
        const data = await fetchAnalyticsSeries(range)

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Superadmin analytics series error:', error)

        return NextResponse.json(
            { error: error?.message || 'Failed to fetch analytics series' },
            { status: error?.status || 500 }
        )
    }
}
