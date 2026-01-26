import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapClient } from '@/lib/vps/bootstrapClient';

/**
 * VPS Workers Control API
 * Manages PM2 workers via Bootstrap server
 */

/**
 * GET /api/superadmin/vps/workers
 * List all workers
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const server_id = searchParams.get('server_id');

        const bootstrap = await getBootstrapClient(server_id || undefined);
        const workers = await bootstrap.listWorkers();

        return NextResponse.json({
            success: true,
            workers,
            total: workers.length,
        });

    } catch (error: any) {
        console.error('List workers error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list workers' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/superadmin/vps/workers
 * Control worker (start/stop/restart/delete)
 */
export async function POST(request: NextRequest) {
    try {
        const { action, worker_name, server_id } = await request.json();

        if (!action || !worker_name) {
            return NextResponse.json(
                { error: 'action and worker_name required' },
                { status: 400 }
            );
        }

        const bootstrap = await getBootstrapClient(server_id || undefined);
        let result;

        switch (action) {
            case 'start':
                result = await bootstrap.startWorker(worker_name);
                break;
            case 'stop':
                result = await bootstrap.stopWorker(worker_name);
                break;
            case 'restart':
                result = await bootstrap.restartWorker(worker_name);
                break;
            case 'delete':
                result = await bootstrap.deleteWorker(worker_name);
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: start, stop, restart, delete' },
                    { status: 400 }
                );
        }

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Action failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            action,
            worker: worker_name,
            output: result.output,
        });

    } catch (error: any) {
        console.error('Worker control error:', error);
        return NextResponse.json(
            { error: error.message || 'Worker control failed' },
            { status: 500 }
        );
    }
}
