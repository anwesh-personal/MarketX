import { NextRequest, NextResponse } from 'next/server';
import { getDeploymentProvider } from '@/lib/workers/deploymentProvider';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * POST /api/superadmin/workers/action
 * Perform action on worker (start, stop, restart, deploy)
 */
export async function POST(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const { action, workerName } = await request.json();

        if (!action) {
            return NextResponse.json(
                { error: 'action required' },
                { status: 400 }
            );
        }

        const provider = await getDeploymentProvider();
        let result;

        switch (action) {
            case 'start':
                result = await provider.start(workerName);
                break;
            case 'stop':
                result = await provider.stop(workerName);
                break;
            case 'restart':
                result = await provider.restart(workerName);
                break;
            case 'deploy':
            case 'redeploy':
                result = await provider.deploy();
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: result.success,
            provider: provider.provider,
            action,
            workerName,
            error: result.error,
        });

    } catch (error: any) {
        console.error('Worker action error:', error);
        return NextResponse.json(
            { error: error.message || 'Worker action failed' },
            { status: 500 }
        );
    }
}
