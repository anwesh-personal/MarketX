import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const PUBLIC_SUPERADMIN_PATHS = [
    '/api/superadmin/auth/login',
    '/api/superadmin/auth/verify',
]

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

    try {
        const payload = jwt.verify(token, jwtSecret) as { type?: string }
        if (payload.type !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized — not a superadmin token' }, { status: 401 })
        }
    } catch {
        return NextResponse.json({ error: 'Unauthorized — invalid or expired token' }, { status: 401 })
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/superadmin/:path*',
}
