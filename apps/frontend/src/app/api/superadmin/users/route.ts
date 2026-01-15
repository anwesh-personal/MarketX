import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all users across all organizations
export async function GET(request: NextRequest) {
    try {
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
