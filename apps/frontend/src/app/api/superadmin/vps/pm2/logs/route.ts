import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapClient } from '@/lib/vps/bootstrapClient';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * GET /api/superadmin/vps/pm2/logs
 * Get PM2 process logs
 * NOTE: Bootstrap server doesn't have logs endpoint yet
 * This is a placeholder that returns empty
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
        const process_name = searchParams.get('process_name');
        const lines = parseInt(searchParams.get('lines') || '50');
        const server_id = searchParams.get('server_id');

        if (!process_name) {
            return NextResponse.json(
                { error: 'process_name parameter required' },
                { status: 400 }
            );
        }

        // TODO: Bootstrap server needs logs endpoint
        // For now, return placeholder
        return NextResponse.json({
            success: true,
            process: process_name,
            logs: `[Logs not yet available - Bootstrap server needs logs endpoint]\n\nProcess: ${process_name}\nRequested lines: ${lines}\n\nTo view logs, SSH into server and run:\npm2 logs ${process_name} --lines ${lines}`,
            lines_requested: lines,
            note: 'Logs endpoint not yet implemented in Bootstrap server',
        });

    } catch (error: any) {
        console.error('PM2 logs error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch logs' },
            { status: 500 }
        );
    }
}
