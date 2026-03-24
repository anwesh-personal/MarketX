import { NextRequest, NextResponse } from 'next/server';
import { getDeploymentProvider } from '@/lib/workers/deploymentProvider';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * GET /api/superadmin/workers/status
 * Get worker status from active provider (Railway or VPS)
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

        const provider = await getDeploymentProvider();
        const { workers, stats } = await provider.getStatus();

        return NextResponse.json({
            success: true,
            provider: provider.provider,
            workers,
            stats,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Worker status error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get worker status' },
            { status: 500 }
        );
    }
}
