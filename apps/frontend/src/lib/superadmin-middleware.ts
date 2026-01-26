/**
 * Superadmin Middleware
 * 
 * Use this in API routes to validate superadmin JWT tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'axiom-jwt-secret-change-in-production';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SuperadminContext {
    id: string;
    email: string;
    fullName: string | null;
}

interface JWTPayload {
    adminId: string;
    email: string;
    type: 'superadmin';
    iat: number;
    exp: number;
}

/**
 * Extract and validate superadmin from request
 * Returns admin context if valid, null otherwise
 */
export async function getSuperadmin(request: NextRequest): Promise<SuperadminContext | null> {
    try {
        // Extract token from Authorization header
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);

        // Verify JWT
        let payload: JWTPayload;
        try {
            payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch {
            return null;
        }

        // Ensure this is a superadmin token
        if (payload.type !== 'superadmin') {
            return null;
        }

        // Verify admin exists and is active
        const { data: admin, error } = await supabase
            .from('platform_admins')
            .select('id, email, full_name, is_active')
            .eq('id', payload.adminId)
            .single();

        if (error || !admin || !admin.is_active) {
            return null;
        }

        return {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
        };

    } catch {
        return null;
    }
}

/**
 * Require superadmin authentication
 * Returns admin context or throws 401 response
 */
export async function requireSuperadmin(request: NextRequest): Promise<SuperadminContext> {
    const admin = await getSuperadmin(request);

    if (!admin) {
        throw NextResponse.json(
            { error: 'Unauthorized - Valid superadmin token required' },
            { status: 401 }
        );
    }

    return admin;
}

/**
 * Wrapper for API route handlers that require superadmin
 */
export function withSuperadmin<T>(
    handler: (request: NextRequest, admin: SuperadminContext) => Promise<NextResponse<T>>
) {
    return async (request: NextRequest): Promise<NextResponse<T | { error: string }>> => {
        const admin = await getSuperadmin(request);

        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Valid superadmin token required' },
                { status: 401 }
            ) as NextResponse<{ error: string }>;
        }

        return handler(request, admin);
    };
}
