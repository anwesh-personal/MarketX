import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/workers/config
 * Get current worker deployment configuration
 */
export async function GET() {
    try {
        const supabase = createClient();

        const { data: config, error } = await supabase
            .from('worker_deployment_config')
            .select(`
                id,
                active_provider,
                railway_project_id,
                railway_service_id,
                railway_environment,
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
 * Update worker deployment configuration
 */
export async function PUT(request: NextRequest) {
    try {
        const supabase = createClient();
        const updates = await request.json();

        // Get current config ID
        const { data: existing } = await supabase
            .from('worker_deployment_config')
            .select('id')
            .single();

        if (!existing) {
            return NextResponse.json(
                { error: 'Config not found' },
                { status: 404 }
            );
        }

        // Update config
        const { data: config, error } = await supabase
            .from('worker_deployment_config')
            .update({
                active_provider: updates.active_provider,
                railway_token: updates.railway_token,
                railway_project_id: updates.railway_project_id,
                railway_service_id: updates.railway_service_id,
                railway_environment: updates.railway_environment,
                vps_server_id: updates.vps_server_id,
                auto_scale_enabled: updates.auto_scale_enabled,
                min_workers: updates.min_workers,
                max_workers: updates.max_workers,
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

    } catch (error: any) {
        console.error('Update worker config error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update config' },
            { status: 500 }
        );
    }
}
