import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapClient } from '@/lib/vps/bootstrapClient';
import { createClient } from '@/lib/supabase/server';

/**
 * Real-time Worker Status API
 * Aggregates status from PM2 + Database
 * Uses Bootstrap HTTP client (NO ssh2)
 */

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const server_id = searchParams.get('server_id');

        const supabase = createClient();

        // Get PM2 processes via Bootstrap
        const bootstrap = await getBootstrapClient(server_id || undefined);
        const pm2Processes = await bootstrap.listWorkers();

        // Get system info
        const systemInfo = await bootstrap.getSystemInfo();

        // Get deployments from database
        let deploymentsQuery = supabase
            .from('worker_deployments')
            .select('*, worker_templates(name, worker_type)');

        if (server_id) {
            deploymentsQuery = deploymentsQuery.eq('vps_server_id', server_id);
        }

        const { data: deployments } = await deploymentsQuery;

        // Merge PM2 status with database records
        const enrichedWorkers = pm2Processes.map(pm2Process => {
            const deployment = deployments?.find(d => d.name === pm2Process.name);

            // Format worker data
            return {
                id: pm2Process.pm_id,
                name: pm2Process.name,
                status: pm2Process.status,
                uptime: formatUptime(pm2Process.uptime),
                cpu: `${(pm2Process.cpu || 0).toFixed(1)}%`,
                memory: formatMemory(pm2Process.memory || 0),
                restarts: pm2Process.restarts || 0,
                deployment_id: deployment?.id,
                template: deployment?.worker_templates?.name,
                type: deployment?.worker_templates?.worker_type || pm2Process.type,
                environment: deployment?.environment_vars || {},
                port: pm2Process.port,
            };
        });

        // Calculate aggregates
        const onlineCount = pm2Processes.filter(p => p.status === 'online').length;
        const stoppedCount = pm2Processes.filter(p => p.status === 'stopped').length;
        const erroredCount = pm2Processes.filter(p => p.status === 'errored').length;

        return NextResponse.json({
            success: true,
            system: systemInfo,
            workers: enrichedWorkers,
            stats: {
                total: pm2Processes.length,
                online: onlineCount,
                stopped: stoppedCount,
                errored: erroredCount,
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Status API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch status' },
            { status: 500 }
        );
    }
}

/**
 * Format uptime from milliseconds to human readable
 */
function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

/**
 * Format memory from bytes to human readable
 */
function formatMemory(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
        return `${(mb / 1024).toFixed(1)}G`;
    }
    return `${mb.toFixed(0)}M`;
}
