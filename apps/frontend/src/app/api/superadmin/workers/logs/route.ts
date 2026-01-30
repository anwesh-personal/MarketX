import { NextRequest, NextResponse } from 'next/server';
import { getDeploymentProvider } from '@/lib/workers/deploymentProvider';

/**
 * GET /api/superadmin/workers/logs
 * Get logs for a specific worker from the active provider
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const workerName = searchParams.get('workerName') || '';

        const provider = await getDeploymentProvider();
        const logs = await provider.getLogs(workerName);

        return NextResponse.json({
            success: true,
            provider: provider.provider,
            workerName,
            logs,
        });

    } catch (error: any) {
        console.error('Worker logs error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get worker logs' },
            { status: 500 }
        );
    }
}
