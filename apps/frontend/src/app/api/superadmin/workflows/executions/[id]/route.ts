/**
 * GET /api/superadmin/workflows/executions/[id]
 * Returns execution status and result for polling from Workflow Manager.
 * Superadmin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    const admin = await getSuperadmin(request);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized', message: 'Valid superadmin token required' }, { status: 401 });
    }

    const { id: executionId } = await context.params;
    if (!executionId) {
        return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    try {
        const { data: execution, error } = await supabase
            .from('engine_run_logs')
            .select('*')
            .eq('id', executionId)
            .single();

        if (error || !execution) {
            return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
        }

        const outputData = (execution as any).output_data || {};
        const executionData = (execution as any).execution_data || {};

        return NextResponse.json({
            executionId: execution.id,
            status: execution.status,
            engine_id: execution.engine_id,
            input: execution.input_data,
            output: outputData.finalOutput ?? executionData.result ?? executionData.lastNodeOutput?.content ?? outputData,
            tokensUsed: (execution as any).tokens_used ?? executionData.tokensUsed ?? executionData.tokenUsage?.totalTokens,
            cost: (execution as any).cost_usd ?? executionData.cost ?? executionData.tokenUsage?.totalCost,
            durationMs: (execution as any).duration_ms ?? executionData.durationMs,
            error: (execution as any).error_message,
            createdAt: execution.started_at ?? (execution as any).created_at,
            updatedAt: execution.completed_at ?? (execution as any).updated_at,
        });
    } catch (err: any) {
        console.error('Get execution status error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
