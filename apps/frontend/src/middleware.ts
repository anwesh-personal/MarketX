import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const PUBLIC_SUPERADMIN_PATHS = [
    '/api/superadmin/auth/login',
    '/api/superadmin/auth/verify',
]

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    let payload: { adminId?: string; type?: string }
    try {
        payload = jwt.verify(token, jwtSecret) as { adminId?: string; type?: string }
        if (payload.type !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized — not a superadmin token' }, { status: 401 })
        }
    } catch {
        return NextResponse.json({ error: 'Unauthorized — invalid or expired token' }, { status: 401 })
    }

    if (payload.adminId) {
        const { data: admin, error } = await supabaseAdmin
            .from('platform_admins')
            .select('is_active')
            .eq('id', payload.adminId)
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
