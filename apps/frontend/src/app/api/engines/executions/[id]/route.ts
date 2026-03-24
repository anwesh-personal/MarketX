/**
 * EXECUTION STATUS API ROUTE
 * ===========================
 * Get execution status and result from database
 * Used for polling after queueing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// GET /api/engines/executions/[id]
// ============================================================================

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const executionId = params.id;

        // Get execution record from database
        const { data: execution, error } = await supabase
            .from('engine_run_logs')
            .select('*')
            .eq('id', executionId)
            .single();

        if (error || !execution) {
            return NextResponse.json(
                { error: 'Execution not found' },
                { status: 404 }
            );
        }

        const outputData = (execution as any).output_data || {};
        const executionData = (execution as any).execution_data || {};

        return NextResponse.json({
            executionId: execution.id,
            status: execution.status,
            engine_id: execution.engine_id,
            input: execution.input_data,
            output: outputData.finalOutput ?? executionData.result ?? executionData.lastNodeOutput?.content,
            tokensUsed: (execution as any).tokens_used ?? executionData.tokensUsed ?? executionData.tokenUsage?.totalTokens,
            cost: (execution as any).cost_usd ?? executionData.cost ?? executionData.tokenUsage?.totalCost,
            durationMs: (execution as any).duration_ms ?? executionData.durationMs,
            error: execution.error_message,
            createdAt: execution.started_at ?? execution.created_at,
            updatedAt: execution.completed_at ?? execution.updated_at,
            // Real-time progress from worker (written on every node completion)
            progress: executionData.percentage ?? null,
            currentNode: executionData.currentNode ?? null,
            nodeIndex: executionData.nodeIndex ?? null,
            totalNodes: executionData.totalNodes ?? null,
        });

    } catch (error: any) {
        console.error('Get execution status error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
