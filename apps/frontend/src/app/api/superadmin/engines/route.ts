/**
 * ENGINE INSTANCES API
 * CRUD operations for engine instances (cloned workflows)
 * SuperAdmin only - follows ai-providers pattern
 * 
 * DATABASE COLUMNS (engine_instances):
 * - id, name, template_id, org_id, kb_id, constitution_id, status, config
 * - runs_today, runs_total, last_run_at, error_message, created_at, updated_at
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
// GET - List all engine instances
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
        const orgId = searchParams.get('org_id');
        const templateId = searchParams.get('template_id');
        const status = searchParams.get('status');

        // Build query with joined template and organization names
        let query = supabase
            .from('engine_instances')
            .select(`
                *,
                template:workflow_templates(id, name),
                organization:organizations(id, name),
                constitution:constitutions(id, name)
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (orgId) {
            query = query.eq('org_id', orgId);
        }

        if (templateId) {
            query = query.eq('template_id', templateId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching engine instances:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        // Flatten the response for easier UI consumption
        const flattenedData = (data || []).map((engine: any) => ({
            ...engine,
            template_name: engine.template?.name || null,
            org_name: engine.organization?.name || null,
            constitution_name: engine.constitution?.name || null,
        }));

        return NextResponse.json({
            success: true,
            data: flattenedData,
            count: flattenedData.length,
        });
    } catch (error) {
        console.error('Unexpected error in GET /api/superadmin/engines:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST - Clone workflow template to create engine instance
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

        // Validate required fields - template_id and name required, org_id is optional
        if (!body.template_id || !body.name) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'template_id and name are required'
                },
                { status: 400 }
            );
        }

        // Fetch the template to clone
        const { data: template, error: templateError } = await supabase
            .from('workflow_templates')
            .select('*')
            .eq('id', body.template_id)
            .single();

        if (templateError || !template) {
            return NextResponse.json(
                { error: 'Not found', message: 'Template not found' },
                { status: 404 }
            );
        }

        // If org_id provided, verify organization exists
        if (body.org_id) {
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('id')
                .eq('id', body.org_id)
                .single();

            if (orgError || !org) {
                return NextResponse.json(
                    { error: 'Not found', message: 'Organization not found' },
                    { status: 404 }
                );
            }
        }

        // Create engine instance - use correct column names matching DB
        const engineData = {
            name: body.name,
            template_id: body.template_id,
            org_id: body.org_id || null,  // Optional - uses 'org_id' not 'organization_id'
            kb_id: body.kb_id || null,    // Uses 'kb_id' not 'knowledge_base_ids'
            constitution_id: body.constitution_id || null,
            config: body.config || {},
            status: 'disabled',  // Default status per DB schema
            runs_today: 0,
            runs_total: 0,
        };

        const { data: engine, error: createError } = await supabase
            .from('engine_instances')
            .insert(engineData)
            .select(`
                *,
                template:workflow_templates(id, name),
                organization:organizations(id, name)
            `)
            .single();

        if (createError) {
            console.error('Error creating engine instance:', createError);
            return NextResponse.json(
                { error: 'Database error', message: createError.message },
                { status: 500 }
            );
        }

        // Flatten response
        const flattenedEngine = {
            ...engine,
            template_name: engine.template?.name || null,
            org_name: engine.organization?.name || null,
        };

        return NextResponse.json({
            success: true,
            data: flattenedEngine,
            message: 'Engine instance created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error in POST /api/superadmin/engines:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// PATCH - Update engine instance
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

        // Validate engine ID
        if (!body.id) {
            return NextResponse.json(
                { error: 'Validation error', message: 'Engine ID is required' },
                { status: 400 }
            );
        }

        // Prepare update data - only use valid DB columns
        const updateData: Record<string, any> = {};
        const allowedFields = [
            'name', 'org_id', 'kb_id', 'constitution_id',
            'config', 'status', 'error_message'
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

        const { data, error } = await supabase
            .from('engine_instances')
            .update(updateData)
            .eq('id', body.id)
            .select(`
                *,
                template:workflow_templates(id, name),
                organization:organizations(id, name),
                constitution:constitutions(id, name)
            `)
            .single();

        if (error) {
            console.error('Error updating engine instance:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        // Flatten response
        const flattenedData = {
            ...data,
            template_name: data.template?.name || null,
            org_name: data.organization?.name || null,
            constitution_name: data.constitution?.name || null,
        };

        return NextResponse.json({
            success: true,
            data: flattenedData,
            message: 'Engine instance updated successfully',
        });
    } catch (error) {
        console.error('Unexpected error in PATCH /api/superadmin/engines:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE - Delete engine instance
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
                { error: 'Validation error', message: 'Engine ID is required' },
                { status: 400 }
            );
        }

        // Delete associated API key mappings first
        const { error: mappingError } = await supabase
            .from('engine_api_key_mappings')
            .delete()
            .eq('engine_id', id);

        if (mappingError) {
            console.error('Error deleting API key mappings:', mappingError);
            // Continue with engine deletion anyway
        }

        // Delete the engine instance
        const { error } = await supabase
            .from('engine_instances')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting engine instance:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Engine instance deleted successfully',
        });
    } catch (error) {
        console.error('Unexpected error in DELETE /api/superadmin/engines:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
