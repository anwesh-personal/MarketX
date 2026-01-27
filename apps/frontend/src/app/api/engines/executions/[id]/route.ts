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

        // Parse execution data
        const executionData = execution.execution_data || {};

        // Return status
        return NextResponse.json({
            executionId: execution.id,
            status: execution.status,
            engine_id: execution.engine_id,
            input: execution.input_data,
            output: executionData.result || executionData.lastNodeOutput?.content,
            tokensUsed: executionData.tokensUsed || executionData.tokenUsage?.totalTokens,
            cost: executionData.cost || executionData.tokenUsage?.totalCost,
            durationMs: executionData.durationMs,
            error: execution.error_message,
            createdAt: execution.created_at,
            updatedAt: execution.updated_at,
        });

    } catch (error: any) {
        console.error('Get execution status error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
