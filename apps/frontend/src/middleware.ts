import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PUBLIC_SUPERADMIN_PATHS = [
    '/api/superadmin/auth/login',
    '/api/superadmin/auth/verify',
]

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Decode and verify JWT using Web Crypto API (Edge Runtime compatible).
 * jsonwebtoken uses Node.js crypto and CANNOT run in Edge Runtime.
 */
async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
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

        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

        if (payload.exp && payload.exp * 1000 < Date.now()) return null

        return payload
    } catch {
        return null
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (!pathname.startsWith('/api/superadmin')) return NextResponse.next()

    if (PUBLIC_SUPERADMIN_PATHS.some(p => pathname === p)) return NextResponse.next()

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
        return NextResponse.json({ error: 'Server misconfigured — JWT_SECRET not set' }, { status: 500 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized — superadmin token required' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    const payload = await verifyJWT(token, jwtSecret)
    if (!payload || payload.type !== 'superadmin') {
        return NextResponse.json({ error: 'Unauthorized — invalid or expired token' }, { status: 401 })
    }

    if (payload.adminId) {
        const { data: admin, error } = await supabaseAdmin
            .from('platform_admins')
            .select('is_active')
            .eq('id', payload.adminId as string)
            .single()

        if (error || !admin || !admin.is_active) {
            return NextResponse.json({ error: 'Unauthorized — admin account deactivated or not found' }, { status: 401 })
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/superadmin/:path*',
}
