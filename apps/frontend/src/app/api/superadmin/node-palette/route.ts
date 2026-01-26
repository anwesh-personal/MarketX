/**
 * NODE PALETTE API
 * Read operations for workflow node palette
 * Used by workflow builder to display available nodes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

// Initialize Supabase client with service role
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// GET - List all active node types (or all for SuperAdmin)
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
        const category = searchParams.get('category');
        const includeInactive = searchParams.get('include_inactive') === 'true';

        // Build query
        let query = supabase
            .from('node_palette')
            .select('*')
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true });

        // Filter by active status (SuperAdmin can see all)
        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        // Filter by category if specified
        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching node palette:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        // Group by category for easier consumption
        const grouped = {
            trigger: data?.filter(n => n.category === 'trigger') || [],
            input: data?.filter(n => n.category === 'input') || [],
            process: data?.filter(n => n.category === 'process') || [],
            condition: data?.filter(n => n.category === 'condition') || [],
            preview: data?.filter(n => n.category === 'preview') || [],
            output: data?.filter(n => n.category === 'output') || [],
        };

        return NextResponse.json({
            success: true,
            data: data || [],
            grouped,
            count: data?.length || 0,
        });
    } catch (error) {
        console.error('Unexpected error in GET /api/superadmin/node-palette:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST - Create new node type (SuperAdmin only)
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

        // Validate required fields
        if (!body.node_id || !body.name || !body.category) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'node_id, name, and category are required'
                },
                { status: 400 }
            );
        }

        // Check for duplicate node_id
        const { data: existing } = await supabase
            .from('node_palette')
            .select('id')
            .eq('node_id', body.node_id)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Conflict', message: 'Node ID already exists' },
                { status: 409 }
            );
        }

        // Prepare node data
        const nodeData = {
            node_id: body.node_id,
            name: body.name,
            description: body.description || null,
            category: body.category,
            icon: body.icon || 'Box',
            color: body.color || 'var(--text-tertiary)',
            features: body.features || [],
            capabilities: body.capabilities || [],
            default_config: body.default_config || {},
            is_active: body.is_active !== false,
            sort_order: body.sort_order || 0,
        };

        const { data, error } = await supabase
            .from('node_palette')
            .insert(nodeData)
            .select()
            .single();

        if (error) {
            console.error('Error creating node type:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Node type created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error in POST /api/superadmin/node-palette:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// PATCH - Update node type (SuperAdmin only)
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

        // Validate node ID
        if (!body.id && !body.node_id) {
            return NextResponse.json(
                { error: 'Validation error', message: 'id or node_id is required' },
                { status: 400 }
            );
        }

        // Prepare update data
        const updateData: Record<string, any> = {};
        const allowedFields = [
            'name', 'description', 'icon', 'color',
            'features', 'capabilities', 'default_config', 'is_active', 'sort_order'
        ];

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

        // Update by id or node_id
        let query = supabase.from('node_palette').update(updateData);

        if (body.id) {
            query = query.eq('id', body.id);
        } else {
            query = query.eq('node_id', body.node_id);
        }

        const { data, error } = await query.select().single();

        if (error) {
            console.error('Error updating node type:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Node type updated successfully',
        });
    } catch (error) {
        console.error('Unexpected error in PATCH /api/superadmin/node-palette:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE - Delete node type (SuperAdmin only)
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
        const nodeId = searchParams.get('node_id');

        if (!id && !nodeId) {
            return NextResponse.json(
                { error: 'Validation error', message: 'id or node_id is required' },
                { status: 400 }
            );
        }

        // Delete by id or node_id
        let query = supabase.from('node_palette').delete();

        if (id) {
            query = query.eq('id', id);
        } else {
            query = query.eq('node_id', nodeId);
        }

        const { error } = await query;

        if (error) {
            console.error('Error deleting node type:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Node type deleted successfully',
        });
    } catch (error) {
        console.error('Unexpected error in DELETE /api/superadmin/node-palette:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
