/**
 * WORKFLOW TEMPLATES API
 * CRUD operations for workflow templates
 * SuperAdmin only - follows ai-providers pattern
 * 
 * DATABASE COLUMNS (workflow_templates):
 * - id, name, description, status, nodes, edges, node_count (auto), created_by, created_at, updated_at
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';
import { z } from 'zod';

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const NodeSchema = z.object({
    id: z.string().min(1),
    type: z.string().optional(),
    position: z.object({
        x: z.number(),
        y: z.number(),
    }),
    data: z.record(z.any()).optional(),
}).passthrough();

const EdgeSchema = z.object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
}).passthrough();

const WorkflowCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
    description: z.string().max(2000).optional().nullable(),
    status: z.enum(['draft', 'active', 'disabled']).optional().default('draft'),
    nodes: z.array(NodeSchema).optional().default([]),
    edges: z.array(EdgeSchema).optional().default([]),
});

const WorkflowUpdateSchema = z.object({
    id: z.string().uuid('Invalid workflow ID'),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    status: z.enum(['draft', 'active', 'disabled']).optional(),
    nodes: z.array(NodeSchema).optional(),
    edges: z.array(EdgeSchema).optional(),
});

// ============================================================================
// GET - List all workflow templates
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        // Verify SuperAdmin authentication
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        // Build query
        let query = supabase
            .from('workflow_templates')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching workflow templates:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            count: data?.length || 0,
        });
    } catch (error) {
        console.error('Unexpected error in GET /api/superadmin/workflows:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST - Create new workflow template
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        // Verify SuperAdmin authentication
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validate input with Zod schema
        const validationResult = WorkflowCreateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: validationResult.error.errors[0]?.message || 'Invalid input',
                    details: validationResult.error.errors
                },
                { status: 400 }
            );
        }

        const validated = validationResult.data;

        // Prepare template data
        const templateData = {
            name: validated.name,
            description: validated.description || null,
            status: validated.status,
            nodes: validated.nodes,
            edges: validated.edges,
            created_by: admin.id,
        };

        const { data, error } = await supabase
            .from('workflow_templates')
            .insert(templateData)
            .select()
            .single();

        if (error) {
            console.error('Error creating workflow template:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Workflow template created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error in POST /api/superadmin/workflows:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// PATCH - Update workflow template
// ============================================================================

export async function PATCH(request: NextRequest) {
    try {
        // Verify SuperAdmin authentication
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validate input with Zod schema
        const validationResult = WorkflowUpdateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: validationResult.error.errors[0]?.message || 'Invalid input',
                    details: validationResult.error.errors
                },
                { status: 400 }
            );
        }

        const validated = validationResult.data;

        // Build update data from validated fields
        const updateData: Record<string, any> = {};
        if (validated.name !== undefined) updateData.name = validated.name;
        if (validated.description !== undefined) updateData.description = validated.description;
        if (validated.status !== undefined) updateData.status = validated.status;
        if (validated.nodes !== undefined) updateData.nodes = validated.nodes;
        if (validated.edges !== undefined) updateData.edges = validated.edges;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'Validation error', message: 'No valid fields to update' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('workflow_templates')
            .update(updateData)
            .eq('id', validated.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating workflow template:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Workflow template updated successfully',
        });
    } catch (error) {
        console.error('Unexpected error in PATCH /api/superadmin/workflows:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE - Delete workflow template
// ============================================================================

export async function DELETE(request: NextRequest) {
    try {
        // Verify SuperAdmin authentication
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Validation error', message: 'Template ID is required' },
                { status: 400 }
            );
        }

        // Check if template has active engine instances
        const { data: engines, error: checkError } = await supabase
            .from('engine_instances')
            .select('id')
            .eq('template_id', id)
            .limit(1);

        if (checkError) {
            console.error('Error checking engine instances:', checkError);
            return NextResponse.json(
                { error: 'Database error', message: checkError.message },
                { status: 500 }
            );
        }

        if (engines && engines.length > 0) {
            return NextResponse.json(
                {
                    error: 'Constraint error',
                    message: 'Cannot delete template with active engine instances. Delete or reassign engines first.'
                },
                { status: 409 }
            );
        }

        const { error } = await supabase
            .from('workflow_templates')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting workflow template:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Workflow template deleted successfully',
        });
    } catch (error) {
        console.error('Unexpected error in DELETE /api/superadmin/workflows:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
