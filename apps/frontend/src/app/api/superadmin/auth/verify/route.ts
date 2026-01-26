/**
 * Superadmin JWT Verification Endpoint
 * 
 * Validates the JWT token server-side and returns admin info
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'axiom-jwt-secret-change-in-production';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JWTPayload {
    adminId: string;
    email: string;
    type: 'superadmin';
    iat: number;
    exp: number;
}

export async function POST(request: NextRequest) {
    try {
        // Extract token from Authorization header
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid Authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); // Remove 'Bearer '

        // Verify JWT
        let payload: JWTPayload;
        try {
            payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Ensure this is a superadmin token
        if (payload.type !== 'superadmin') {
            return NextResponse.json(
                { error: 'Invalid token type' },
                { status: 401 }
            );
        }

        // Verify admin still exists and is active in database
        const { data: admin, error } = await supabase
            .from('platform_admins')
            .select('id, email, full_name, is_active')
            .eq('id', payload.adminId)
            .single();

        if (error || !admin || !admin.is_active) {
            return NextResponse.json(
                { error: 'Admin account not found or deactivated' },
                { status: 401 }
            );
        }

        // Update last login timestamp
        await supabase
            .from('platform_admins')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', admin.id);

        return NextResponse.json({
            valid: true,
            admin: {
                id: admin.id,
                email: admin.email,
                fullName: admin.full_name,
            },
            expiresAt: payload.exp * 1000,
        });

    } catch (error) {
        console.error('Token verification error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}
