import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapClient } from '@/lib/vps/bootstrapClient';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * GET /api/superadmin/vps/workers/logs
 * Get worker logs
 * NOTE: Placeholder - Bootstrap doesn't have logs endpoint
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
        const worker_name = searchParams.get('worker_name');
        const lines = parseInt(searchParams.get('lines') || '100');
        const server_id = searchParams.get('server_id');

        if (!worker_name) {
            return NextResponse.json(
                { error: 'worker_name parameter required' },
                { status: 400 }
            );
        }

        // Placeholder until Bootstrap server has logs endpoint
        return NextResponse.json({
            success: true,
            worker: worker_name,
            logs: `[Logs not available via API yet]\n\nSSH and run:\npm2 logs ${worker_name} --lines ${lines}`,
            note: 'Bootstrap server needs logs endpoint',
        });

    } catch (error: any) {
        console.error('Worker logs error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch worker logs' },
            { status: 500 }
        );
    }
}
