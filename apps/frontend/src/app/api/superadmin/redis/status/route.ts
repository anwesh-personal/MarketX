import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

// Use service role to read config
function createClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 });
        }

        const supabase = createClient();

        // Get deployment config to determine worker URL
        const { data: config } = await supabase
            .from('worker_deployment_config')
            .select('active_target, railway_domain')
            .single();

        let workerApiUrl: string;

        if (config?.active_target === 'railway' && config.railway_domain) {
            // Railway deployment - use the auto-discovered domain
            const domain = config.railway_domain.startsWith('http')
                ? config.railway_domain
                : `https://${config.railway_domain}`;
            workerApiUrl = domain;
        } else {
            // VPS or fallback to localhost
            workerApiUrl = process.env.WORKER_API_URL || 'http://localhost:3100';
        }

        // Fetch Redis info and queue stats in parallel
        const [redisResponse, statsResponse] = await Promise.all([
            fetch(`${workerApiUrl}/api/redis`, {
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            }),
            fetch(`${workerApiUrl}/api/stats`, {
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            }),
        ])

        if (!redisResponse.ok || !statsResponse.ok) {
            throw new Error('Worker API not responding')
        }

        const redisData = await redisResponse.json()
        const statsData = await statsResponse.json()

        return NextResponse.json({
            connected: redisData.connected,
            redis: redisData.stats,
            queues: statsData.queues,
        })
    } catch (error: any) {
        console.error('[Redis Status] Failed to fetch from worker:', error.message)

        // Check if it's a timeout or connection error
        if (error.name === 'TimeoutError' || error.message.includes('fetch')) {
            return NextResponse.json({
                connected: false,
                error: 'Worker API not reachable',
                queues: [],
            })
        }

        return NextResponse.json({
            connected: false,
            error: error.message,
            queues: [],
        })
    }
}
