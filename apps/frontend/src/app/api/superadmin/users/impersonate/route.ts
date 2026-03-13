import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET;

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
                    plan,
                    status
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

        if (!org || org.status !== 'active') {
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

        await supabase.from('audit_logs').insert({
            action: 'superadmin_impersonate',
            user_id: user.id,
            metadata: {
                superadmin_id: admin.id,
                superadmin_email: admin.email,
                impersonated_user_id: user.id,
                impersonated_email: user.email,
                org_id: org.id,
                org_name: org.name,
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
                plan: org.plan,
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

export async function DELETE(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            );
        }

        await supabase.from('audit_logs').insert({
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
