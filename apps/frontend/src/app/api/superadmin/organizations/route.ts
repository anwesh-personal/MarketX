import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all organizations
export async function GET(request: NextRequest) {
    try {
        const { data: orgs, error } = await supabase
            .from('organizations')
            .select(`
        *,
        users:users(count)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Add usage stats for each org
        const orgsWithStats = await Promise.all(
            orgs.map(async (org) => {
                const [kbs, runs] = await Promise.all([
                    supabase.from('knowledge_bases').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
                    supabase.from('runs').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
                ]);

                return {
                    ...org,
                    current_kbs_count: kbs.count || 0,
                    total_runs: runs.count || 0,
                    current_team_size: org.users?.[0]?.count || 0,
                };
            })
        );

        return NextResponse.json({ organizations: orgsWithStats });
    } catch (error) {
        console.error('Organizations GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }
}

// POST - Create new organization
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, slug, plan = 'free', owner_email } = body;

        // Validate required fields
        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
        }

        // Check if slug already exists
        const { data: existing } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
        }

        // Set quotas based on plan
        const quotas: Record<string, any> = {
            free: { max_kbs: 1, max_runs_per_month: 10, max_team_members: 3 },
            starter: { max_kbs: 5, max_runs_per_month: 100, max_team_members: 5 },
            pro: { max_kbs: 20, max_runs_per_month: 1000, max_team_members: 20 },
            enterprise: { max_kbs: 100, max_runs_per_month: 10000, max_team_members: 100 },
        };

        const orgQuotas = quotas[plan] || quotas.free;

        // Create organization
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name,
                slug,
                plan,
                status: 'active',
                ...orgQuotas,
            })
            .select()
            .single();

        if (orgError) throw orgError;

        // Create owner user if email provided
        if (owner_email) {
            await supabase.from('users').insert({
                org_id: org.id,
                email: owner_email,
                role: 'owner',
                is_active: true,
                can_upload_kb: true,
                can_trigger_runs: true,
                can_view_analytics: true,
                can_manage_team: true,
            });
        }

        // Log transaction
        await supabase.from('license_transactions').insert({
            org_id: org.id,
            transaction_type: 'created',
            to_plan: plan,
            quota_changes: orgQuotas,
        });

        return NextResponse.json({ organization: org }, { status: 201 });
    } catch (error) {
        console.error('Organization POST error:', error);
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }
}
