import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all organizations
export async function GET(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

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
                    supabase.from('engine_run_logs').select('*', { count: 'exact', head: true }).eq('org_id', org.id),
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
        const { name, slug, plan = 'hobby', owner_email } = body;

        // Validate required fields
        if (!name || !slug) {
            return NextRespons
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }
e.json({ error: 'Name and slug are required' }, { status: 400 });
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

        // Set quotas based on license tier
        const quotas: Record<string, any> = {
            hobby: { max_kbs: 1, max_runs_per_month: 10, max_team_members: 3 },
            pro: { max_kbs: 20, max_runs_per_month: 1000, max_team_members: 20 },
            enterprise: { max_kbs: 100, max_runs_per_month: 10000, max_team_members: 100 },
        };

        const orgQuotas = quotas[plan] || quotas.hobby;

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

        let ownerCreated = false;

        // Create owner user if email provided
        if (owner_email) {
            // Generate secure password
            const generatePassword = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                let password = '';
                for (let i = 0; i < 16; i++) {
                    password += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return password;
            };

            const ownerPassword = generatePassword();

            try {
                // Create Supabase Auth user
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: owner_email,
                    password: ownerPassword,
                    email_confirm: true, // Auto-confirm
                    user_metadata: {
                        full_name: `${name} Owner`,
                        org_id: org.id,
                    },
                });

                if (authError) {
                    console.error('Failed to create owner auth user:', authError);
                    throw new Error(`Failed to create owner: ${authError.message}`);
                }

                // Create database record
                const { error: userError } = await supabase.from('users').insert({
                    id: authUser.user.id,
                    org_id: org.id,
                    email: owner_email,
                    full_name: `${name} Owner`,
                    role: 'owner',
                    is_active: true,
                    can_upload_kb: true,
                    can_trigger_runs: true,
                    can_view_analytics: true,
                    can_manage_team: true,
                });

                if (userError) {
                    // Rollback: delete auth user if database insert fails
                    await supabase.auth.admin.deleteUser(authUser.user.id);
                    throw new Error(`Failed to create owner record: ${userError.message}`);
                }

                // TODO: Send welcome email with credentials
                // await sendWelcomeEmail(owner_email, ownerPassword, org.name);
                ownerCreated = true;
            } catch (error) {
                console.error('Error creating owner user:', error);
                // Don't fail org creation if owner creation fails
                // But log it prominently
                console.error('⚠️  Organization created but owner user creation failed!');
            }
        }

        // Log transaction
        await supabase.from('license_transactions').insert({
            org_id: org.id,
            admin_id: null,
            transaction_type: 'created',
            from_plan: null,
            to_plan: plan,
            quota_changes: orgQuotas,
        });

        return NextResponse.json({
            organization: org,
            owner_user_created: ownerCreated,
            message: ownerCreated
                ? 'Organization and owner user created successfully. Trigger your secure invite or password reset flow before first login.'
                : 'Organization created successfully'
        }, { status: 201 });
    } catch (error) {
        console.error('Organization POST error:', error);
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }
}
