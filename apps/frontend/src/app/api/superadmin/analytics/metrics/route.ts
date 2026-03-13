import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/superadmin-middleware'
import { fetchAnalyticsMetrics } from '@/lib/superadmin-insights'

export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request)

        const data = await fetchAnalyticsMetrics()

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Superadmin analytics metrics error:', error)

        return NextResponse.json(
            { error: error?.message || 'Failed to fetch analytics metrics' },
            { status: error?.status || 500 }
        )
    }
}
