/**
 * CONSTITUTIONS API
 * CRUD operations for organization constitutions (guardrails/rules)
 * SuperAdmin only - follows ai-providers pattern
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
// GET - List constitutions
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
        const organizationId = searchParams.get('organization_id');
        const isActive = searchParams.get('is_active');

        // Build query
        let query = supabase
            .from('constitutions')
            .select(`
                *,
                organization:organizations(id, name)
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        if (isActive !== null) {
            query = query.eq('is_active', isActive === 'true');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching constitutions:', error);
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
        console.error('Unexpected error in GET /api/superadmin/constitutions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST - Create new constitution
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
        if (!body.name || !body.organization_id) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    message: 'Name and organization_id are required'
                },
                { status: 400 }
            );
        }

        // Verify organization exists
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', body.organization_id)
            .single();

        if (orgError || !org) {
            return NextResponse.json(
                { error: 'Not found', message: 'Organization not found' },
                { status: 404 }
            );
        }

        // Prepare constitution data
        const constitutionData = {
            name: body.name,
            description: body.description || null,
            organization_id: body.organization_id,
            rules: body.rules || [],
            guardrails: body.guardrails || {},
            tone_guidelines: body.tone_guidelines || [],
            prohibited_topics: body.prohibited_topics || [],
            required_disclaimers: body.required_disclaimers || [],
            is_active: body.is_active !== false,
        };

        const { data, error } = await supabase
            .from('constitutions')
            .insert(constitutionData)
            .select(`
                *,
                organization:organizations(id, name)
            `)
            .single();

        if (error) {
            console.error('Error creating constitution:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Constitution created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error in POST /api/superadmin/constitutions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// PATCH - Update constitution
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

        // Validate constitution ID
        if (!body.id) {
            return NextResponse.json(
                { error: 'Validation error', message: 'Constitution ID is required' },
                { status: 400 }
            );
        }

        // Prepare update data
        const updateData: Record<string, any> = {};
        const allowedFields = [
            'name', 'description', 'rules', 'guardrails',
            'tone_guidelines', 'prohibited_topics', 'required_disclaimers', 'is_active'
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
            .from('constitutions')
            .update(updateData)
            .eq('id', body.id)
            .select(`
                *,
                organization:organizations(id, name)
            `)
            .single();

        if (error) {
            console.error('Error updating constitution:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
            message: 'Constitution updated successfully',
        });
    } catch (error) {
        console.error('Unexpected error in PATCH /api/superadmin/constitutions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE - Delete constitution
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
                { error: 'Validation error', message: 'Constitution ID is required' },
                { status: 400 }
            );
        }

        // Check if constitution is used by any engine instances
        const { data: engines, error: checkError } = await supabase
            .from('engine_instances')
            .select('id')
            .eq('constitution_id', id)
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
                    message: 'Cannot delete constitution that is assigned to engine instances. Remove assignment first.'
                },
                { status: 409 }
            );
        }

        const { error } = await supabase
            .from('constitutions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting constitution:', error);
            return NextResponse.json(
                { error: 'Database error', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Constitution deleted successfully',
        });
    } catch (error) {
        console.error('Unexpected error in DELETE /api/superadmin/constitutions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
