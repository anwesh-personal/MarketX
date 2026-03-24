import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * Worker Templates API
 * Full CRUD for worker templates
 */

/**
 * GET /api/superadmin/worker-templates
 * List all worker templates
 */
export async function GET(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const supabase = createClient();

        const { data: templates, error } = await supabase
            .from('worker_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            templates: templates || [],
            total: templates?.length || 0,
        });

    } catch (error: any) {
        console.error('List templates error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list templates' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/superadmin/worker-templates
 * Create new worker template
 */
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const supabase = createClient();
        const {
            name,
            description,
            worker_type,
            code_template,
            environment_vars,
            config,
        } = await request.json();

        // Validation
        if (!name || !worker_type || !code_template) {
            return NextResponse.json(
                { error: 'name, worker_type, and code_template required' },
                { status: 400 }
            );
        }

        // Validate worker_type
        const validTypes = ['writer', 'learning', 'analytics', 'brain', 'queue', 'custom'];
        if (!validTypes.includes(worker_type)) {
            return NextResponse.json(
                { error: `worker_type must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Insert template
        const { data: template, error } = await supabase
            .from('worker_templates')
            .insert({
                name,
                description,
                worker_type,
                code_template,
                environment_vars: environment_vars || {},
                config: config || {},
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            template,
        });

    } catch (error: any) {
        console.error('Create template error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create template' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/superadmin/worker-templates
 * Update worker template
 */
export async function PATCH(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const supabase = createClient();
        const { id, name, description, code_template, environment_vars, config } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'id required' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (code_template) updateData.code_template = code_template;
        if (environment_vars) updateData.environment_vars = environment_vars;
        if (config) updateData.config = config;

        const { data: template, error } = await supabase
            .from('worker_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            template,
        });

    } catch (error: any) {
        console.error('Update template error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update template' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/superadmin/worker-templates
 * Delete worker template
 */
export async function DELETE(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const supabase = createClient();
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'id required' },
                { status: 400 }
            );
        }

        // Check if template is in use
        const { data: deployments } = await supabase
            .from('worker_deployments')
            .select('id')
            .eq('template_id', id)
            .limit(1);

        if (deployments && deployments.length > 0) {
            return NextResponse.json(
                { error: 'Cannot delete template - it is in use by active deployments' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('worker_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Template deleted',
        });

    } catch (error: any) {
        console.error('Delete template error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete template' },
            { status: 500 }
        );
    }
}
