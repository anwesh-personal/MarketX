/**
 * WORKFLOW EXECUTE API
 * POST /api/superadmin/workflows/[id]/execute
 * 
 * Queues workflow execution to worker instead of calling backend.
 * Returns execution ID for polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { getSuperadmin } from '@/lib/superadmin-middleware';

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

const workflowQueue = new Queue('workflow-execution', {
    connection: getRedisConfig()
});

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface RouteContext {
    params: Promise<{ id: string }>;
}

// ============================================================================
// POST - Execute Workflow via Worker (NO BACKEND!)
// ============================================================================

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    try {
        // Verify SuperAdmin authentication
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        const { id: workflowId } = await context.params;

        if (!workflowId) {
            return NextResponse.json(
                { error: 'Missing workflow ID' },
                { status: 400 }
            );
        }

        // Parse request body
        let body: { input?: Record<string, any>; dryRun?: boolean } = {};
        try {
            body = await request.json();
        } catch {
            // Empty body is acceptable
        }

        // Get workflow/engine from database
        const { data: engine, error: engineError } = await supabase
            .from('engine_instances')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (engineError || !engine) {
            return NextResponse.json(
                { error: 'Workflow not found' },
                { status: 404 }
            );
        }

        // Generate execution ID
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create execution record
        const { error: logError } = await supabase
            .from('engine_run_logs')
            .insert({
                id: executionId,
                engine_id: workflowId,
                user_id: admin.id,
                org_id: null,
                input_data: body.input || {},
                status: 'queued',
                execution_data: { triggeredBy: admin.email },
                created_at: new Date().toISOString(),
            });

        if (logError) {
            console.error('Failed to create execution log:', logError);
            return NextResponse.json(
                { error: 'Failed to create execution record' },
                { status: 500 }
            );
        }

        // Queue job to worker (NO BACKEND!)
        await workflowQueue.add('engine-execution', {
            executionId,
            engineId: workflowId,
            engine: {
                id: engine.id,
                name: engine.name,
                config: engine.config,
                status: engine.status,
            },
            userId: admin.id,
            orgId: null,
            input: body.input || {},
            options: {
                tier: 'hobby',
                timeout: 300000,
            },
        });

        console.log(`✅ Queued workflow execution: ${executionId}`);

        // Return execution ID for polling
        return NextResponse.json({
            success: true,
            executionId,
            status: 'queued',
            message: 'Execution queued successfully',
        });

    } catch (error: any) {
        console.error('Workflow execution error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
