import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapClient } from '@/lib/vps/bootstrapClient';

/**
 * POST /api/superadmin/vps/deploy
 * Deploy code to VPS
 * NOTE: Simplified - just restarts all workers
 */
export async function POST(request: NextRequest) {
    try {
        const { server_id } = await request.json();

        const bootstrap = await getBootstrapClient(server_id || undefined);

        // Use Bootstrap's start-all endpoint
        const result = await bootstrap.startAllWorkers();

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Deploy failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'All workers started',
            output: result.output,
            note: 'For code deployment, SSH and run: cd vps-worker && git pull && npm install && pm2 restart all',
        });

    } catch (error: any) {
        console.error('Deploy error:', error);
        return NextResponse.json(
            { error: error.message || 'Deploy failed' },
            { status: 500 }
        );
    }
}
