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

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

        // Validate required field - only name is required
        if (!body.name) {
            return NextResponse.json(
                { error: 'Validation error', message: 'Name is required' },
                { status: 400 }
            );
        }

        // Prepare template data - only use columns that exist in DB
        const templateData = {
            name: body.name,
            description: body.description || null,
            status: body.status || 'draft',
            nodes: body.nodes || [],
            edges: body.edges || [],
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

        // Validate template ID
        if (!body.id) {
            return NextResponse.json(
                { error: 'Validation error', message: 'Template ID is required' },
                { status: 400 }
            );
        }

        // Prepare update data - only include valid columns
        const updateData: Record<string, any> = {};
        const allowedFields = ['name', 'description', 'status', 'nodes', 'edges'];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'Validation error', message: 'No valid fields to update' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('workflow_templates')
            .update(updateData)
            .eq('id', body.id)
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
