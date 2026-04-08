import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

// Use service role to bypass RLS for worker config management
function createClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

/**
 * GET /api/superadmin/workers/config
 * Get current worker deployment configuration
 */
export async function GET(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const supabase = createClient();

        const { data: config, error } = await supabase
            .from('worker_deployment_config')
            .select(`
                id,
                active_target,
                railway_workspace_id,
                railway_project_id,
                railway_service_id,
                railway_environment,
                railway_domain,
                vps_server_id,
                auto_scale_enabled,
                min_workers,
                max_workers,
                created_at,
                updated_at
            `)
            .single();

        if (error) throw error;

        // Get VPS server name if selected
        let vpsServerName = null;
        if (config?.vps_server_id) {
            const { data: server } = await supabase
                .from('vps_servers')
                .select('name')
                .eq('id', config.vps_server_id)
                .single();
            vpsServerName = server?.name;
        }

        return NextResponse.json({
            success: true,
            config: {
                ...config,
                vps_server_name: vpsServerName,
                railway_configured: !!(config?.railway_project_id && config?.railway_service_id),
            },
        });

    } catch (error: any) {
        console.error('Get worker config error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get config' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/superadmin/workers/config
 * Update worker deployment configuration (creates if doesn't exist)
 */
export async function PUT(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const supabase = createClient();
        const updates = await request.json();

        // Get existing config (singleton pattern)
        const { data: existing } = await supabase
            .from('worker_deployment_config')
            .select('id')
            .single();

        if (existing) {
            // Update existing config
            const { data: config, error } = await supabase
                .from('worker_deployment_config')
                .update({
                    active_target: updates.active_provider, // Map frontend name to DB name
                    railway_token: updates.railway_token,
                    railway_workspace_id: updates.railway_workspace_id,
                    railway_project_id: updates.railway_project_id,
                    railway_service_id: updates.railway_service_id,
                    railway_environment: updates.railway_environment || 'production',
                    railway_domain: updates.railway_domain,
                    vps_server_id: updates.vps_server_id,
                    auto_scale_enabled: updates.auto_scale_enabled || false,
                    min_workers: updates.min_workers || 1,
                    max_workers: updates.max_workers || 10,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                config,
            });
        } else {
            // Create new config (first time)
            const { data: config, error } = await supabase
                .from('worker_deployment_config')
                .insert({
                    active_target: updates.active_provider || 'vps',
                    railway_token: updates.railway_token,
                    railway_workspace_id: updates.railway_workspace_id,
                    railway_project_id: updates.railway_project_id,
                    railway_service_id: updates.railway_service_id,
                    railway_environment: updates.railway_environment || 'production',
                    railway_domain: updates.railway_domain,
                    vps_server_id: updates.vps_server_id,
                    auto_scale_enabled: updates.auto_scale_enabled || false,
                    min_workers: updates.min_workers || 1,
                    max_workers: updates.max_workers || 10,
                })
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                config,
            });
        }

    } catch (error: any) {
        console.error('Update worker config error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update config' },
            { status: 500 }
        );
    }
}
