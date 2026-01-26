import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapClient } from '@/lib/vps/bootstrapClient';

/**
 * GET /api/superadmin/vps/system
 * Get VPS system information
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const server_id = searchParams.get('server_id');

        const bootstrap = await getBootstrapClient(server_id || undefined);
        const systemInfo = await bootstrap.getSystemInfo();

        return NextResponse.json({
            success: true,
            system: systemInfo,
        });

    } catch (error: any) {
        console.error('System info error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch system info' },
            { status: 500 }
        );
    }
}
