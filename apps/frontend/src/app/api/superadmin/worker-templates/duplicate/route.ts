import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/superadmin/worker-templates/duplicate
 * Duplicate an existing template
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const { template_id, new_name } = await request.json();

        if (!template_id) {
            return NextResponse.json(
                { error: 'template_id required' },
                { status: 400 }
            );
        }

        // Get original template
        const { data: original, error: fetchError } = await supabase
            .from('worker_templates')
            .select('*')
            .eq('id', template_id)
            .single();

        if (fetchError || !original) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Create duplicate
        const duplicateName = new_name || `${original.name} (Copy)`;

        const { data: duplicate, error: createError } = await supabase
            .from('worker_templates')
            .insert({
                name: duplicateName,
                description: original.description,
                worker_type: original.worker_type,
                code_template: original.code_template,
                environment_vars: original.environment_vars,
                config: original.config,
            })
            .select()
            .single();

        if (createError) throw createError;

        return NextResponse.json({
            success: true,
            template: duplicate,
            message: `Template duplicated as "${duplicateName}"`,
        });

    } catch (error: any) {
        console.error('Duplicate template error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to duplicate template' },
            { status: 500 }
        );
    }
}
