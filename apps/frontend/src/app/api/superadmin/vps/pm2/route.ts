import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapClient } from '@/lib/vps/bootstrapClient';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * PM2 Control API
 * Clean wrapper over Bootstrap PM2 functions
 * NO ssh2 - pure HTTP
 */

/**
 * GET /api/superadmin/vps/pm2
 * List all PM2 processes
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

        const searchParams = request.nextUrl.searchParams;
        const server_id = searchParams.get('server_id');

        const bootstrap = await getBootstrapClient(server_id || undefined);
        const workers = await bootstrap.listWorkers();

        return NextResponse.json({
            success: true,
            processes: workers,
            total: workers.length,
        });

    } catch (error: any) {
        console.error('PM2 list error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list PM2 processes' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/superadmin/vps/pm2
 * Control PM2 process (start/stop/restart/delete)
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

        const { action, process_name, server_id } = await request.json();

        if (!action || !process_name) {
            return NextResponse.json(
                { error: 'action and process_name required' },
                { status: 400 }
            );
        }

        const bootstrap = await getBootstrapClient(server_id || undefined);
        let result;

        switch (action) {
            case 'start':
                result = await bootstrap.startWorker(process_name);
                break;
            case 'stop':
                result = await bootstrap.stopWorker(process_name);
                break;
            case 'restart':
                result = await bootstrap.restartWorker(process_name);
                break;
            case 'delete':
                result = await bootstrap.deleteWorker(process_name);
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
            process: process_name,
            output: result.output,
        });

    } catch (error: any) {
        console.error('PM2 control error:', error);
        return NextResponse.json(
            { error: error.message || 'PM2 control failed' },
            { status: 500 }
        );
    }
}
