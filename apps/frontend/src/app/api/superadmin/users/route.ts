import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';
import { requireEnv } from '@/lib/require-env';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all users across all organizations
export async function GET(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const { data: users, error } = await supabase
            .from('users')
            .select(`
        *,
        organization:organizations(
          id,
          name,
          slug,
          plan,
          status
        )
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Format for frontend
        const formattedUsers = users.map(user => ({
            ...user,
            org_id: user.organization.id,
            org_name: user.organization.name,
            org_slug: user.organization.slug,
            org_plan: user.organization.plan,
            org_status: user.organization.status,
        }));

        return NextResponse.json({ users: formattedUsers });
    } catch (error) {
        console.error('Users GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// POST - Create new user
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            email,
            full_name,
            org_id,
            role = 'member',
            can_upload_kb = false,
            can_trigger_runs = false,
            can_view_analytics = true,
            can_manage_team = false,
        } = body;

        // Validate required fields
        if (!email || !org_id) {
            return NextResponse.json(
                { error: 'Email and organization are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Check if organization exists
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, name, max_team_members, status')
            .eq('id', org_id)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Check if organization is active
        if (org.status !== 'active') {
            return NextResponse.json(
                { error: 'Cannot add users to inactive organization' },
                { status: 400 }
            );
        }

        // Check team size limit
        const { count: currentTeamSize } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org_id);

        if (currentTeamSize && currentTeamSize >= org.max_team_members) {
            return NextResponse.json(
                {
                    error: `Team size limit reached (${org.max_team_members}). Upgrade plan to add more members.`,
                },
                { status: 400 }
            );
        }

        // Check if email already exists in Supabase Auth (paginated — default only returns 50)
        let emailExists = false;
        let page = 1;
        const perPage = 100;
        while (true) {
            const { data: batch } = await supabase.auth.admin.listUsers({ page, perPage });
            if (!batch?.users?.length) break;
            if (batch.users.some(u => u.email === email)) {
                emailExists = true;
                break;
            }
            if (batch.users.length < perPage) break;
            page++;
            if (page > 10) break; // safety cap at 1000 users
        }

        if (emailExists) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 400 }
            );
        }

        // Create Supabase Auth user with INVITE (sends email automatically)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            email_confirm: false, // Require email confirmation
            user_metadata: {
                full_name,
                org_id,
            },
        });

        if (authError) {
            console.error('Supabase auth error:', authError);
            return NextResponse.json(
                { error: `Failed to create auth user: ${authError.message}` },
                { status: 500 }
            );
        }

        // Generate invite link and send email
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
            type: 'invite',
            email,
            options: {
                redirectTo: `${requireEnv('NEXT_PUBLIC_APP_URL')}/auth/callback`,
            },
        });

        if (inviteError) {
            console.error('Failed to generate invite link:', inviteError);
            // Don't fail - user is created, just log it
        } else {
            // Invite sent — link available via inviteData.properties.action_link if needed
        }

        // Create user in users table
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: authUser.user.id, // Use same ID as auth user
                org_id,
                email,
                full_name,
                role,
                is_active: true,
                can_upload_kb,
                can_trigger_runs,
                can_view_analytics,
                can_manage_team,
            })
            .select(`
                *,
                organization:organizations(
                    id,
                    name,
                    slug,
                    plan
                )
            `)
            .single();

        if (userError) {
            // Rollback: delete auth user if users table insert fails
            await supabase.auth.admin.deleteUser(authUser.user.id);
            console.error('Users table error:', userError);
            return NextResponse.json(
                { error: `Failed to create user record: ${userError.message}` },
                { status: 500 }
            );
        }

        // Send welcome email (optional - can be implemented later)
        // await sendWelcomeEmail(email, password);

        return NextResponse.json(
            {
                user: {
                    ...user,
                    org_name: user.organization.name,
                    org_slug: user.organization.slug,
                    org_plan: user.organization.plan,
                },
                message: 'User created successfully',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('User POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}

// PATCH - Update user
export async function PATCH(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { userId, new_password, ...updates } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // If password is being updated, use admin API
        if (new_password) {
            if (new_password.length < 8) {
                return NextResponse.json(
                    { error: 'Password must be at least 8 characters' },
                    { status: 400 }
                );
            }

            // Update password in Supabase Auth - IMMEDIATE activation
            const { error: passwordError } = await supabase.auth.admin.updateUserById(
                userId,
                { password: new_password }
            );

            if (passwordError) {
                console.error('Password update error:', passwordError);
                return NextResponse.json(
                    { error: `Failed to update password: ${passwordError.message}` },
                    { status: 500 }
                );
            }

            // Password updated — do NOT log credentials
        }

        // Update user in users table
        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select(`
                *,
                organization:organizations(
                    id,
                    name,
                    slug,
                    plan
                )
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({
            user: {
                ...user,
                org_name: user.organization.name,
                org_slug: user.organization.slug,
                org_plan: user.organization.plan,
            },
        });
    } catch (error) {
        console.error('User PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid superadmin token required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Delete from auth (will cascade to users table if FK is set up properly)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('Auth delete error:', authError);
            return NextResponse.json(
                { error: `Failed to delete user: ${authError.message}` },
                { status: 500 }
            );
        }

        // Also delete from users table (in case cascade didn't work)
        await supabase.from('users').delete().eq('id', userId);

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('User DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
