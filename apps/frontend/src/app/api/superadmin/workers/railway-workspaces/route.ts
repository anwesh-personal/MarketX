import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

// Use service role to bypass RLS
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

const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2';

interface RailwayWorkspace {
    id: string;
    name: string;
}

/**
 * GET - Fetch Railway workspaces using Personal API Token
 * This allows users to select which workspace to use
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

        const { data: config, error: configError } = await supabase
            .from('worker_deployment_config')
            .select('railway_token')
            .single();

        if (configError || !config?.railway_token) {
            return NextResponse.json(
                { error: 'Railway token not configured. Please enter your Railway API token first.' },
                { status: 400 }
            );
        }

        const token = config.railway_token.trim();

        // Query ALL projects accessible to this token across all workspaces
        // Railway's API doesn't expose workspaces/teams directly
        // Instead, we need to get the user's ID and query their projects
        const meQuery = `
            query {
                me {
                    id
                    email
                    name
                }
            }
        `;

        const meResponse = await fetch(RAILWAY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: meQuery }),
        });

        if (!meResponse.ok) {
            const errorText = await meResponse.text();
            console.error('Railway API error:', errorText);
            return NextResponse.json(
                { error: `Railway API error: ${meResponse.status}` },
                { status: 500 }
            );
        }

        const meData = await meResponse.json();

        if (meData.errors) {
            console.error('Railway GraphQL errors:', meData.errors);
            return NextResponse.json(
                { error: meData.errors[0]?.message || 'Railway API error' },
                { status: 500 }
            );
        }

        const me = meData.data?.me;
        if (!me) {
            return NextResponse.json(
                { error: 'Could not fetch user info from Railway' },
                { status: 500 }
            );
        }

        // For now, return the user ID as the only workspace
        // Railway's Personal API Token gives access to personal workspace only
        const workspaces: RailwayWorkspace[] = [
            {
                id: me.id,
                name: `Personal (${me.email || me.name})`
            }
        ];

        return NextResponse.json({
            success: true,
            workspaces,
            workspaceCount: workspaces.length,
        });

    } catch (error: any) {
        console.error('Railway workspaces fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch Railway workspaces' },
            { status: 500 }
        );
    }
}
