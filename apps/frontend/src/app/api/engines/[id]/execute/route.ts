/**
 * ENGINE EXECUTION API ROUTE
 * ==========================
 * Supports 3 auth methods:
 *   1. API Key  — `x-api-key: axm_live_*` or `Authorization: Bearer axm_live_*`
 *   2. Supabase session (member area)
 *   3. Server-to-server headers (`x-user-id` + `x-org-id`)
 *
 * Validates ownership, engine status, then queues to worker.
 * Passes full engine data (config + snapshot) so worker can use agent LLM/prompt config.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { authenticateEngineApiKey } from '@/lib/engine-api-key-auth';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';

// ============================================================================
// REDIS/QUEUE CONFIGURATION
// ============================================================================

const getRedisConfig = () => {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        const url = new URL(redisUrl);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
        };
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    };
};

const engineQueue = new Queue('engine-execution', {
    connection: getRedisConfig()
});

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// POST /api/engines/[id]/execute
// ============================================================================

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const engineId = params.id;
        let body: { input?: Record<string, any>; options?: Record<string, any> } = {};
        try {
            body = await request.json();
        } catch {
            // Empty body is acceptable
        }
        const { input, options = {} } = body;

        // ── Auth: 3 methods — API key, Supabase session, server-to-server ──
        let userId: string;
        let orgId: string | null = null;
        let engineData: Record<string, any> | null = null;

        // Method 1: API Key auth (axm_live_*)
        const apiKeyAuth = await authenticateEngineApiKey(request);
        if (apiKeyAuth) {
            if (apiKeyAuth.engineId !== engineId) {
                return NextResponse.json({ error: 'API key does not match this engine' }, { status: 403 });
            }
            userId = apiKeyAuth.assignedUserId || 'api-key-user';
            orgId = apiKeyAuth.orgId;
            engineData = {
                id: apiKeyAuth.engineId,
                name: apiKeyAuth.engineName,
                config: apiKeyAuth.config,
                snapshot: apiKeyAuth.snapshot,
                overrides: apiKeyAuth.overrides,
                status: apiKeyAuth.status,
            };
        } else {
            // Method 2: Supabase session
            try {
                const serverSupabase = createServerClient();
                const { data: { user }, error: authError } = await serverSupabase.auth.getUser();
                if (user && !authError) {
                    userId = user.id;
                    const { data: profile } = await supabase
                        .from('users')
                        .select('org_id')
                        .eq('id', user.id)
                        .single();
                    orgId = profile?.org_id ?? request.headers.get('x-org-id') ?? null;
                } else {
                    // Method 3: Server-to-server headers
                    const headerUserId = request.headers.get('x-user-id');
                    if (!headerUserId || headerUserId === 'anonymous') {
                        return NextResponse.json({ error: 'Unauthorized — provide API key, session, or x-user-id header' }, { status: 401 });
                    }
                    userId = headerUserId;
                    orgId = request.headers.get('x-org-id') ?? null;
                }
            } catch {
                return NextResponse.json({ error: 'Auth check failed' }, { status: 401 });
            }
        }

        // ── Load engine (if not already loaded via API key auth) ──
        if (!engineData) {
            const { data: engine, error: engineError } = await supabase
                .from('engine_instances')
                .select('id, name, config, snapshot, overrides, status, org_id, assigned_user_id')
                .eq('id', engineId)
                .single();

            if (engineError || !engine) {
                return NextResponse.json({ error: 'Engine not found' }, { status: 404 });
            }

            // ── Ownership check: engine must belong to user's org ──
            if (engine.org_id && orgId && engine.org_id !== orgId) {
                return NextResponse.json({ error: 'Access denied — engine belongs to a different organization' }, { status: 403 });
            }

            // ── Status check: engine must be active ──
            if (engine.status !== 'active') {
                return NextResponse.json(
                    { error: `Engine is ${engine.status} — only active engines can be executed` },
                    { status: 403 }
                );
            }

            engineData = {
                id: engine.id,
                name: engine.name,
                config: engine.config,
                snapshot: engine.snapshot,
                overrides: engine.overrides,
                status: engine.status,
            };
        }

        // ── Queue execution ──
        const executionId = randomUUID();

        const { error: logError } = await supabase
            .from('engine_run_logs')
            .insert({
                id: executionId,
                engine_id: engineId,
                org_id: orgId,
                input_data: input || {},
                status: 'started',
                started_at: new Date().toISOString(),
            });

        if (logError) {
            console.error('Failed to create execution log:', logError);
            return NextResponse.json({ error: 'Failed to create execution record' }, { status: 500 });
        }

        await engineQueue.add('engine-execution', {
            executionId,
            engineId,
            engine: engineData,
            userId,
            orgId,
            input,
            options: {
                tier: options.tier || 'hobby',
                timeout: options.timeout || 300000,
            },
        });

        console.log(`✅ Queued engine execution: ${executionId} (auth: ${apiKeyAuth ? 'api-key' : 'session'})`);

        return NextResponse.json({
            success: true,
            executionId,
            status: 'queued',
            message: 'Execution queued successfully',
        });

    } catch (error: any) {
        console.error('Engine execution error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
