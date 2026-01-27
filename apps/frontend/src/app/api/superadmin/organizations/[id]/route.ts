import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/superadmin/organizations/[id]
 * Get single organization by ID
 */
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        const { data: org, error } = await supabase
            .from('organizations')
            .select(`
                *,
                users:users(count)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!org) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            );
        }

        // Get additional stats
        const [kbs, runs] = await Promise.all([
            supabase
                .from('knowledge_bases')
                .select('*', { count: 'exact', head: true })
                .eq('org_id', org.id),
            supabase
                .from('engine_run_logs')
                .select('*', { count: 'exact', head: true })
                .eq('org_id', org.id),
        ]);

        return NextResponse.json({
            organization: {
                ...org,
                current_kbs_count: kbs.count || 0,
                total_runs: runs.count || 0,
                current_team_size: org.users?.[0]?.count || 0,
            },
        });
    } catch (error: any) {
        console.error('Organization GET error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch organization' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/superadmin/organizations/[id]
 * Update organization
 */
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;
        const updates = await request.json();

        // Allowed fields to update
        const allowedFields = [
            'name',
            'license_tier',
            'is_active',
            'max_kbs',
            'max_runs_per_month',
            'max_team_members',
        ];

        // Filter to only allowed fields
        const filteredUpdates: Record<string, any> = {};
        for (const key of Object.keys(updates)) {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Update organization
        const { data: org, error } = await supabase
            .from('organizations')
            .update({
                ...filteredUpdates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log license change if tier was updated
        if (filteredUpdates.license_tier) {
            const { data: oldOrg } = await supabase
                .from('organizations')
                .select('license_tier')
                .eq('id', id)
                .single();

            await supabase.from('license_transactions').insert({
                org_id: id,
                transaction_type: 'tier_change',
                from_tier: oldOrg?.license_tier || null,
                to_tier: filteredUpdates.license_tier,
                changed_by_admin_id: null, // TODO: Add superadmin ID when auth is implemented
            });
        }

        return NextResponse.json({
            organization: org,
            message: 'Organization updated successfully',
        });
    } catch (error: any) {
        console.error('Organization PATCH error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update organization' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/superadmin/organizations/[id]
 * Soft delete organization (set is_active = false)
 */
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        // Soft delete - set is_active to false
        const { data: org, error } = await supabase
            .from('organizations')
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log deletion
        await supabase.from('license_transactions').insert({
            org_id: id,
            transaction_type: 'deleted',
            from_tier: org.license_tier,
            to_tier: null,
            changed_by_admin_id: null, // TODO: Add superadmin ID when auth is implemented
        });

        return NextResponse.json({
            message: 'Organization deactivated successfully',
        });
    } catch (error: any) {
        console.error('Organization DELETE error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete organization' },
            { status: 500 }
        );
    }
}
