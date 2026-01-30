import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';

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

/**
 * GET - Test Railway API token and diagnose issues
 */
export async function GET() {
    try {
        const supabase = createClient();

        const { data: config, error: configError } = await supabase
            .from('worker_deployment_config')
            .select('railway_token')
            .single();

        if (configError || !config?.railway_token) {
            return NextResponse.json({
                success: false,
                error: 'No Railway token configured',
                help: 'Enter your Railway Personal API Token first'
            });
        }

        const token = config.railway_token.trim();

        // Test 1: Simple me query
        const meQuery = `
            query {
                me {
                    id
                    email
                    name
                }
            }
        `;

        const response = await fetch(RAILWAY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: meQuery }),
        });

        const responseText = await response.text();
        let data;

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            return NextResponse.json({
                success: false,
                error: 'Invalid response from Railway',
                details: responseText.substring(0, 500),
                help: 'Railway API returned non-JSON response'
            });
        }

        if (data.errors) {
            const error = data.errors[0];

            if (error.message === 'Not Authorized') {
                return NextResponse.json({
                    success: false,
                    error: 'Token not authorized',
                    details: error,
                    help: 'Your token might be: 1) Invalid/expired, 2) A Project Token (need Personal Token), or 3) Not properly formatted. Go to railway.com/account/tokens and create a new Personal API Token.'
                });
            }

            return NextResponse.json({
                success: false,
                error: error.message,
                details: data.errors,
                help: 'GraphQL query failed'
            });
        }

        if (data.data?.me) {
            return NextResponse.json({
                success: true,
                user: {
                    id: data.data.me.id,
                    email: data.data.me.email,
                    name: data.data.me.name
                },
                message: '✅ Token is valid and working!',
                tokenPreview: `${token.substring(0, 8)}...${token.substring(token.length - 4)}`
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Unexpected response structure',
            details: data,
            help: 'Railway API response does not contain expected data'
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            help: 'Network or server error'
        });
    }
}
