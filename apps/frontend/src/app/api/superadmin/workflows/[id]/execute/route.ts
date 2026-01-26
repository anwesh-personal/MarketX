/**
 * WORKFLOW EXECUTE API
 * POST /api/superadmin/workflows/[id]/execute
 * 
 * Proxies execution request to the backend engine execution service.
 * The backend handles:
 * - Topological node sorting
 * - Node-by-node execution with AI calls
 * - Token tracking and cost calculation
 * - Progress callbacks and checkpointing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuperadmin } from '@/lib/superadmin-middleware';

// Backend API URL - configurable via environment
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// ============================================================================
// POST - Execute Workflow via Backend
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

        // Call backend execution service
        const backendResponse = await fetch(`${BACKEND_URL}/api/engines/workflows/${workflowId}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: body.input || {},
                triggeredBy: admin.email,
                userId: admin.id,
            }),
        });

        // Handle backend errors
        if (!backendResponse.ok) {
            const errorData = await backendResponse.json().catch(() => ({}));

            // Map backend status codes
            if (backendResponse.status === 404) {
                return NextResponse.json(
                    { error: 'Workflow not found', message: errorData.error },
                    { status: 404 }
                );
            }

            if (backendResponse.status === 400) {
                return NextResponse.json(
                    { error: 'Invalid workflow', message: errorData.error },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: 'Execution failed', message: errorData.error || 'Backend error' },
                { status: backendResponse.status }
            );
        }

        // Return backend response directly
        const result = await backendResponse.json();

        return NextResponse.json({
            success: result.success,
            executionId: result.executionId,
            workflow: result.workflow,
            status: result.success ? 'completed' : 'failed',
            durationMs: result.durationMs,
            nodeOutputs: result.nodeOutputs,
            lastNodeOutput: result.lastNodeOutput,
            tokenUsage: result.tokenUsage,
            error: result.error,
        });

    } catch (error: any) {
        // Check if backend is unreachable
        if (error.cause?.code === 'ECONNREFUSED') {
            return NextResponse.json(
                {
                    error: 'Backend unavailable',
                    message: 'The execution backend is not running. Start the backend server on port 8080.',
                    hint: 'Run: npm run dev:backend'
                },
                { status: 503 }
            );
        }

        console.error('Unexpected error in POST /api/superadmin/workflows/[id]/execute:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
