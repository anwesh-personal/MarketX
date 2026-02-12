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
import { randomUUID } from 'crypto';
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

        // WorkflowManager passes workflow_templates.id - fetch template first, then get/create engine
        const { data: template, error: templateError } = await supabase
            .from('workflow_templates')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (templateError || !template) {
            // Fallback: try as engine ID (for /api/engines flow)
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

            // Engine found - queue to engine-execution
            const executionId = randomUUID();
            const engineQueue = new Queue('engine-execution', { connection: getRedisConfig() });

            const { error: logError } = await supabase
                .from('engine_run_logs')
                .insert({
                    id: executionId,
                    engine_id: engine.id,
                    org_id: null,
                    input_data: body.input || {},
                    status: 'started',
                    started_at: new Date().toISOString(),
                });

            if (logError) {
                console.error('Failed to create execution log:', logError);
                return NextResponse.json(
                    { error: 'Failed to create execution record' },
                    { status: 500 }
                );
            }

            await engineQueue.add('engine-execution', {
                executionId,
                engineId: engine.id,
                engine: {
                    id: engine.id,
                    name: engine.name,
                    config: engine.config,
                    status: engine.status,
                },
                userId: admin.id,
                orgId: null,
                input: body.input || {},
                options: { tier: 'hobby', timeout: 300000 },
            });

            return NextResponse.json({
                success: true,
                executionId,
                status: 'started',
                message: 'Execution queued successfully',
            });
        }

        // Template found - ensure engine exists, then queue to engine-execution
        const { data: existingEngine } = await supabase
            .from('engine_instances')
            .select('*')
            .eq('template_id', workflowId)
            .limit(1)
            .maybeSingle();
        let engine = existingEngine;

        if (!engine) {
            // Create default engine for this template (required for engine_run_logs FK)
            const { data: newEngine, error: createError } = await supabase
                .from('engine_instances')
                .insert({
                    name: template.name,
                    template_id: template.id,
                    org_id: null,
                    status: 'active',
                    config: { flowConfig: { nodes: template.nodes, edges: template.edges } },
                })
                .select()
                .single();

            if (createError || !newEngine) {
                console.error('Failed to create engine:', createError);
                return NextResponse.json(
                    { error: 'Failed to create engine for execution' },
                    { status: 500 }
                );
            }
            engine = newEngine;
        }

        const executionId = randomUUID();
        const engineQueue = new Queue('engine-execution', { connection: getRedisConfig() });

        const { error: logError } = await supabase
            .from('engine_run_logs')
            .insert({
                id: executionId,
                engine_id: engine.id,
                org_id: null,
                input_data: body.input || {},
                status: 'started',
                started_at: new Date().toISOString(),
            });

        if (logError) {
            console.error('Failed to create execution log:', logError);
            return NextResponse.json(
                { error: 'Failed to create execution record' },
                { status: 500 }
            );
        }

        // Ensure engine config has flowConfig (nodes/edges from template)
        const engineWithFlow = {
            ...engine,
            config: {
                ...engine.config,
                flowConfig: engine.config?.flowConfig || { nodes: template.nodes, edges: template.edges },
            },
        };

        await engineQueue.add('engine-execution', {
            executionId,
            engineId: engine.id,
            engine: {
                id: engineWithFlow.id,
                name: engineWithFlow.name,
                config: engineWithFlow.config,
                status: engineWithFlow.status,
            },
            userId: admin.id,
            orgId: null,
            input: body.input || {},
            options: { tier: 'hobby', timeout: 300000 },
        });

        console.log(`✅ Queued workflow execution: ${executionId}`);

        // Return execution ID for polling
        return NextResponse.json({
            success: true,
            executionId,
            status: 'started',
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
