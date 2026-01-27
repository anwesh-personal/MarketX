import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'axiom-jwt-secret-change-in-production';

/**
 * POST /api/superadmin/users/impersonate
 * Start impersonating a user (creates real JWT for that user)
 * 
 * SECURITY: Only superadmins should have access to this route
 * This creates a REAL session as the target user
 */
export async function POST(request: NextRequest) {
    try {
        const { user_id } = await request.json();

        if (!user_id) {
            return NextResponse.json(
                { error: 'user_id is required' },
                { status: 400 }
            );
        }

        // Get user details with org info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                id,
                email,
                full_name,
                role,
                org_id,
                is_active,
                organizations:org_id (
                    id,
                    name,
                    slug,
                    license_tier,
                    is_active
                )
            `)
            .eq('id', user_id)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (!user.is_active) {
            return NextResponse.json(
                { error: 'Cannot impersonate inactive user' },
                { status: 400 }
            );
        }

        const org = Array.isArray(user.organizations)
            ? user.organizations[0]
            : user.organizations;

        if (!org || !org.is_active) {
            return NextResponse.json(
                { error: 'User organization is not active' },
                { status: 400 }
            );
        }

        // Create JWT token for the user (same as regular login)
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                orgId: org.id,
                role: user.role,
                type: 'user', // Regular user token (not superadmin)
            },
            JWT_SECRET,
            { expiresIn: '8h' } // Impersonation session expires in 8 hours
        );

        // Log impersonation event (for audit trail)
        await supabase.from('audit_logs').insert({
            action: 'superadmin_impersonate',
            user_id: user.id,
            metadata: {
                impersonated_user_id: user.id,
                impersonated_email: user.email,
                org_id: org.id,
                org_name: org.name,
                // In production, capture superadmin ID from request auth
                timestamp: new Date().toISOString(),
            },
        });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
            },
            organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
                license_tier: org.license_tier,
            },
            message: `Now impersonating ${user.email}`,
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
 * End impersonation (return to superadmin session)
 * 
 * Client should call this before returning to superadmin panel
 */
export async function DELETE(request: NextRequest) {
    try {
        // Extract user info from current token (if any)
        const authHeader = request.headers.get('Authorization');
        let userId: string | null = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const payload = jwt.verify(token, JWT_SECRET) as any;
                userId = payload.userId;
            } catch {
                // Invalid token, ignore
            }
        }

        // Log end of impersonation
        if (userId) {
            await supabase.from('audit_logs').insert({
                action: 'superadmin_end_impersonate',
                user_id: userId,
                metadata: {
                    timestamp: new Date().toISOString(),
                },
            });
        }

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
