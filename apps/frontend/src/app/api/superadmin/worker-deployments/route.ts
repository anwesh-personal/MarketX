import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Worker Deployments API
 * NOTE: Deployment orchestration temporarily disabled (ssh2 issue)
 * For now: Manual deployment via SSH or future HTTP-based solution
 */

/**
 * GET /api/superadmin/worker-deployments
 * List all worker deployments
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const searchParams = request.nextUrl.searchParams;
        const vps_server_id = searchParams.get('vps_server_id');

        let query = supabase
            .from('worker_deployments')
            .select(`
                *,
                worker_templates(name, worker_type),
                vps_servers:vps_server_id(name, host)
            `)
            .order('created_at', { ascending: false });

        if (vps_server_id) {
            query = query.eq('vps_server_id', vps_server_id);
        }

        const { data: deployments, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            deployments: deployments || [],
            total: deployments?.length || 0,
        });

    } catch (error: any) {
        console.error('List deployments error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list deployments' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/superadmin/worker-deployments
 * Create deployment record (actual deployment is manual for now)
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const {
            template_id,
            vps_server_id,
            name,
            environment_vars,
            pm2_config,
        } = await request.json();

        // Validation
        if (!template_id || !vps_server_id || !name) {
            return NextResponse.json(
                { error: 'template_id, vps_server_id, and name required' },
                { status: 400 }
            );
        }

        // Get template
        const { data: template, error: templateError } = await supabase
            .from('worker_templates')
            .select('*')
            .eq('id', template_id)
            .single();

        if (templateError || !template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Get VPS server
        const { data: vpsServer, error: vpsError } = await supabase
            .from('vps_servers')
            .select('*')
            .eq('id', vps_server_id)
            .single();

        if (vpsError || !vpsServer) {
            return NextResponse.json(
                { error: 'VPS server not found' },
                { status: 404 }
            );
        }

        // Merge environment variables
        const mergedEnvVars = {
            ...template.environment_vars,
            ...environment_vars,
            WORKER_NAME: name,
        };

        // Merge PM2 config
        const mergedPM2Config = {
            ...template.config?.pm2 || {},
            ...pm2_config || {},
            name,
        };

        // Deployment path on VPS
        const deploymentPath = `/home/${vpsServer.username}/${name}`;

        // Create deployment record (status: pending_manual)
        const { data: deployment, error: createError } = await supabase
            .from('worker_deployments')
            .insert({
                template_id,
                vps_server_id,
                name,
                deployment_path: deploymentPath,
                environment_vars: mergedEnvVars,
                pm2_config: mergedPM2Config,
                status: 'pending_manual',
            })
            .select()
            .single();

        if (createError) throw createError;

        return NextResponse.json({
            success: true,
            deployment,
            message: 'Deployment record created. Manual deployment required via SSH.',
            instructions: {
                step1: `SSH into ${vpsServer.host}`,
                step2: `Create directory: mkdir -p ${deploymentPath}`,
                step3: 'Upload files manually',
                step4: 'Run: pm2 start ecosystem.config.js',
            },
        });

    } catch (error: any) {
        console.error('Create deployment error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create deployment' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/superadmin/worker-deployments
 * Delete deployment record (manual PM2 deletion required)
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient();
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'id required' },
                { status: 400 }
            );
        }

        // Get deployment
        const { data: deployment, error: fetchError } = await supabase
            .from('worker_deployments')
            .select('*, vps_servers:vps_server_id(*)')
            .eq('id', id)
            .single();

        if (fetchError || !deployment) {
            return NextResponse.json(
                { error: 'Deployment not found' },
                { status: 404 }
            );
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from('worker_deployments')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({
            success: true,
            message: 'Deployment record deleted. Manually stop PM2 process if needed.',
            instructions: {
                manual: `SSH and run: pm2 delete ${deployment.name}`,
            },
        });

    } catch (error: any) {
        console.error('Delete deployment error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete deployment' },
            { status: 500 }
        );
    }
}
