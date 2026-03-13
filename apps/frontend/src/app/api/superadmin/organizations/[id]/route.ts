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
            'plan',
            'status',
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

        const { data: existingOrg, error: existingOrgError } = await supabase
            .from('organizations')
            .select('plan, status')
            .eq('id', id)
            .single();

        if (existingOrgError) throw existingOrgError;

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

        // Log license change if plan was updated
        if (filteredUpdates.plan) {
            await supabase.from('license_transactions').insert({
                org_id: id,
                admin_id: null, // TODO: Add superadmin ID when auth is implemented
                transaction_type: 'plan_changed',
                from_plan: existingOrg?.plan || null,
                to_plan: filteredUpdates.plan,
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
 * Soft delete organization (set status = suspended)
 */
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params;

        // Soft delete - set status to suspended
        const { data: org, error } = await supabase
            .from('organizations')
            .update({
                status: 'suspended',
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log deletion
        await supabase.from('license_transactions').insert({
            org_id: id,
            admin_id: null, // TODO: Add superadmin ID when auth is implemented
            transaction_type: 'suspended',
            from_plan: org.plan || null,
            to_plan: org.plan || null,
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
