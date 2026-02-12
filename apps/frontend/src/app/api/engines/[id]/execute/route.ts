/**
 * ENGINE EXECUTION API ROUTE
 * ==========================
 * Replaces direct backend call with worker queue
 * 
 * Flow:
 * 1. Validate request
 * 2. Load engine from DB
 * 3. Queue job to worker
 * 4. Return execution ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

        // Get auth from headers or session
        // For now, using a default - TODO: Implement proper auth
        const userId = request.headers.get('x-user-id') || 'anonymous';
        const orgId = request.headers.get('x-org-id') || null;

        // Get engine from database
        const { data: engine, error: engineError } = await supabase
            .from('engine_instances')
            .select('*')
            .eq('id', engineId)
            .single();

        if (engineError || !engine) {
            return NextResponse.json(
                { error: 'Engine not found' },
                { status: 404 }
            );
        }

        // Generate execution ID
        const executionId = randomUUID();

        // Create execution record
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
            return NextResponse.json(
                { error: 'Failed to create execution record' },
                { status: 500 }
            );
        }

        // Queue job to engine-execution worker
        await engineQueue.add('engine-execution', {
            executionId,
            engineId,
            engine: {
                id: engine.id,
                name: engine.name,
                config: engine.config,
                status: engine.status,
            },
            userId,
            orgId,
            input,
            options: {
                tier: options.tier || 'hobby',
                timeout: options.timeout || 300000, // 5 min default
            },
        });

        console.log(`✅ Queued engine execution: ${executionId}`);

        // Return execution ID for polling
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
