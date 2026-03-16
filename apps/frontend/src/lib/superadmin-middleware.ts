/**
 * Superadmin Middleware
 *
 * Use this in API routes to validate superadmin JWT tokens.
 * Uses Web Crypto API for JWT verification (Edge + Node.js compatible).
 * No dependency on jsonwebtoken (Node.js-only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET ?? ''

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SuperadminContext {
    id: string
    email: string
    fullName: string | null
}

interface JWTPayload {
    adminId: string
    email: string
    type: 'superadmin'
    iat: number
    exp: number
}

async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null

        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        )

        const signatureInput = encoder.encode(`${parts[0]}.${parts[1]}`)
        const signatureBytes = Uint8Array.from(
            atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
            c => c.charCodeAt(0)
        )

        const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, signatureInput)
        if (!valid) return null

        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload

        if (payload.exp && payload.exp * 1000 < Date.now()) return null

        return payload
    } catch {
        return null
    }
}

/**
 * Extract and validate superadmin from request.
 * Returns admin context if valid, null otherwise.
 */
export async function getSuperadmin(request: NextRequest): Promise<SuperadminContext | null> {
    try {
        if (!JWT_SECRET) return null

        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null

        const token = authHeader.substring(7)
        const payload = await verifyJWT(token, JWT_SECRET)

        if (!payload || payload.type !== 'superadmin') return null

        const { data: admin, error } = await supabase
            .from('platform_admins')
            .select('id, email, full_name, is_active')
            .eq('id', payload.adminId)
            .single()

        if (error || !admin || !admin.is_active) return null

        return {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
        }
    } catch {
        return null
    }
}

/**
 * Require superadmin authentication.
 * Returns admin context or throws 401 response.
 */
export async function requireSuperadmin(request: NextRequest): Promise<SuperadminContext> {
    const admin = await getSuperadmin(request)

    if (!admin) {
        throw NextResponse.json(
            { error: 'Unauthorized - Valid superadmin token required' },
            { status: 401 }
        )
    }

    return admin
}

/**
 * Wrapper for API route handlers that require superadmin.
 */
export function withSuperadmin<T>(
    handler: (request: NextRequest, admin: SuperadminContext) => Promise<NextResponse<T>>
) {
    return async (request: NextRequest): Promise<NextResponse<T | { error: string }>> => {
        const admin = await getSuperadmin(request)

        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Valid superadmin token required' },
                { status: 401 }
            ) as NextResponse<{ error: string }>
        }

        return handler(request, admin)
    }
}
