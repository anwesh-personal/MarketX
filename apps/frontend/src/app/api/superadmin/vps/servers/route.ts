import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSuperadmin } from '@/lib/superadmin-middleware';

/**
 * VPS Server Management API
 * CRUD operations for VPS servers
 */

/**
 * GET /api/superadmin/vps/servers
 * List all VPS servers
 */
export async function GET(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = createClient();

        const { data: servers, error } = await supabase
            .from('vps_servers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Don't send passwords to frontend (security)
        const sanitized = servers?.map(s => ({
            ...s,
            password: s.password ? '••••••••' : null,
            ssh_key: s.ssh_key ? '••••••••' : null,
        }));

        return NextResponse.json({
            success: true,
            servers: sanitized || [],
        });

    } catch (error: any) {
        console.error('List VPS servers error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list servers' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/superadmin/vps/servers
 * Add new VPS server
 */
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = createClient();
        const { name, description, host, port, username, password, ssh_key } = await request.json();

        if (!name || !host || !username) {
            return NextResponse.json(
                { error: 'name, host, and username required' },
                { status: 400 }
            );
        }

        if (!password && !ssh_key) {
            return NextResponse.json(
                { error: 'Either password or ssh_key required' },
                { status: 400 }
            );
        }

        const { data: server, error } = await supabase
            .from('vps_servers')
            .insert({
                name,
                description,
                host,
                port: port || 22,
                username,
                password: password || null,
                ssh_key: ssh_key || null,
                status: 'active',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            server: {
                ...server,
                password: server.password ? '••••••••' : null,
                ssh_key: server.ssh_key ? '••••••••' : null,
            },
        });

    } catch (error: any) {
        console.error('Create VPS server error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create server' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/superadmin/vps/servers
 * Update VPS server
 */
export async function PATCH(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = createClient();
        const { id, name, description, host, port, username, password, ssh_key, status } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'id required' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (host) updateData.host = host;
        if (port) updateData.port = port;
        if (username) updateData.username = username;
        if (password) updateData.password = password;
        if (ssh_key) updateData.ssh_key = ssh_key;
        if (status) updateData.status = status;

        const { data: server, error } = await supabase
            .from('vps_servers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            server: {
                ...server,
                password: server.password ? '••••••••' : null,
                ssh_key: server.ssh_key ? '••••••••' : null,
            },
        });

    } catch (error: any) {
        console.error('Update VPS server error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update server' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/superadmin/vps/servers
 * Delete VPS server
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

        const { error } = await supabase
            .from('vps_servers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'VPS server deleted',
        });

    } catch (error: any) {
        console.error('Delete VPS server error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete server' },
            { status: 500 }
        );
    }
}
