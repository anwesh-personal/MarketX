import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/superadmin-middleware'
import { fetchLicenseTransactions } from '@/lib/superadmin-insights'

export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request)

        const data = await fetchLicenseTransactions()

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Superadmin license transactions error:', error)

        return NextResponse.json(
            { error: error?.message || 'Failed to fetch license transactions' },
            { status: error?.status || 500 }
        )
    }
}
