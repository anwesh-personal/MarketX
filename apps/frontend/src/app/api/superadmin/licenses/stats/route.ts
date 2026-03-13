import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/superadmin-middleware'
import { fetchLicenseStats } from '@/lib/superadmin-insights'

export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request)

        const data = await fetchLicenseStats()

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Superadmin license stats error:', error)

        return NextResponse.json(
            { error: error?.message || 'Failed to fetch license stats' },
            { status: error?.status || 500 }
        )
    }
}
