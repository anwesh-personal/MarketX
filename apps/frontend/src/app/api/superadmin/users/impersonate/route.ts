import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/superadmin/users/impersonate
 * 
 * Generates a real Supabase Auth session for any user — no password needed.
 * Uses the same proven pattern as Refinery Nexus:
 *   1. generateLink({ type: 'magiclink' }) → get hashed OTP token
 *   2. verifyOtp({ token_hash }) → create real access_token + refresh_token
 *   3. Frontend swaps Supabase session client-side → instant login
 *
 * Fully audit-logged. Superadmin-only.
 */
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            );
        }

        const { user_id } = await request.json();

        if (!user_id) {
            return NextResponse.json(
                { error: 'user_id is required' },
                { status: 400 }
            );
        }

        // 1. Get the target user from Supabase Auth
        const { data: authUser, error: userErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (userErr || !authUser.user) {
            return NextResponse.json(
                { error: `User lookup failed: ${userErr?.message || 'Not found'}` },
                { status: 404 }
            );
        }

        const targetEmail = authUser.user.email;
        if (!targetEmail) {
            return NextResponse.json(
                { error: 'User has no email associated' },
                { status: 400 }
            );
        }

        // 2. Get user profile for display info
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('full_name, role, org_id, is_active, organizations:org_id (id, name, slug, plan)')
            .eq('id', user_id)
            .single();

        if (profile && !profile.is_active) {
            return NextResponse.json(
                { error: 'Cannot impersonate inactive user' },
                { status: 400 }
            );
        }

        // 3. Generate magic link → extract hashed OTP token
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: targetEmail,
        });

        if (linkErr) {
            return NextResponse.json(
                { error: `Link generation failed: ${linkErr.message}` },
                { status: 500 }
            );
        }

        if (!linkData.properties?.hashed_token) {
            return NextResponse.json(
                { error: 'No hashed_token in generated link' },
                { status: 500 }
            );
        }

        // 4. Verify OTP server-side → creates a real Supabase session
        const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.verifyOtp({
            type: 'magiclink',
            token_hash: linkData.properties.hashed_token,
        });

        if (sessionErr || !sessionData.session) {
            return NextResponse.json(
                { error: `Session creation failed: ${sessionErr?.message || 'No session returned'}` },
                { status: 500 }
            );
        }

        // 5. Audit log
        await supabaseAdmin.from('audit_logs').insert({
            action: 'superadmin_impersonate',
            user_id: user_id,
            metadata: {
                superadmin_id: admin.id,
                superadmin_email: admin.email,
                impersonated_user_id: user_id,
                impersonated_email: targetEmail,
                org_id: profile?.org_id,
                timestamp: new Date().toISOString(),
            },
        });

        // 6. Return real Supabase session tokens
        const org = Array.isArray(profile?.organizations)
            ? profile.organizations[0]
            : profile?.organizations;

        return NextResponse.json({
            success: true,
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
            user: {
                id: user_id,
                email: targetEmail,
                full_name: profile?.full_name || targetEmail.split('@')[0],
                role: profile?.role || 'member',
            },
            organization: org ? {
                id: org.id,
                name: org.name,
                slug: org.slug,
                plan: org.plan,
            } : null,
            message: `Now impersonating ${targetEmail}`,
        });

    } catch (error: any) {
        console.error('Impersonate error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to impersonate user' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/superadmin/users/impersonate
 * End impersonation — audit log only (frontend handles session swap back)
 */
export async function DELETE(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            );
        }

        await supabaseAdmin.from('audit_logs').insert({
            action: 'superadmin_end_impersonate',
            user_id: admin.id,
            metadata: {
                superadmin_id: admin.id,
                superadmin_email: admin.email,
                timestamp: new Date().toISOString(),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Impersonation ended',
        });

    } catch (error: any) {
        console.error('End impersonate error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to end impersonation' },
            { status: 500 }
        );
    }
}
