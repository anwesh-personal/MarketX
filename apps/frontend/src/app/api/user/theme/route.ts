/**
 * Theme Preference API
 *
 * GET  — load saved theme for current user (member or superadmin)
 * POST — save theme for current user
 *
 * Falls back gracefully: if not authenticated, returns 200 with null theme
 * so that localStorage takes over. No auth = no persistence, no crash.
 */

import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ---------- Helpers ----------

type UserInfo =
    | { type: 'member'; userId: string }
    | { type: 'superadmin'; adminId: string }

async function identifyUser(request: NextRequest): Promise<UserInfo | null> {
    // 1) Try superadmin JWT first (uses the middleware's verified JWT logic)
    const admin = await getSuperadmin(request)
    if (admin) {
        return { type: 'superadmin', adminId: admin.id }
    }

    // 2) Try Supabase cookie auth (regular members)
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
            // Resolve to our user record
            const { data } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single()
            if (data?.id) {
                return { type: 'member', userId: data.id }
            }
        }
    } catch { /* no user session */ }

    return null
}

// ---------- GET ----------

export async function GET(request: NextRequest) {
    const user = await identifyUser(request)
    if (!user) {
        return NextResponse.json({ theme: null })
    }

    try {
        if (user.type === 'member') {
            const { data } = await supabaseAdmin
                .from('users')
                .select('theme_preference')
                .eq('id', user.userId)
                .single()
            return NextResponse.json({ theme: data?.theme_preference ?? null })
        }

        // superadmin
        const { data } = await supabaseAdmin
            .from('platform_admins')
            .select('theme_preference')
            .eq('id', user.adminId)
            .single()
        return NextResponse.json({ theme: data?.theme_preference ?? null })
    } catch {
        return NextResponse.json({ theme: null })
    }
}

// ---------- POST ----------

export async function POST(request: NextRequest) {
    const user = await identifyUser(request)
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let body: { theme?: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const theme = body.theme
    if (!theme || typeof theme !== 'string' || !/^(obsidian|aurora|ember|arctic|velvet)-(day|night)$/.test(theme)) {
        return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 })
    }

    try {
        if (user.type === 'member') {
            await supabaseAdmin
                .from('users')
                .update({ theme_preference: theme, theme_updated_at: new Date().toISOString() })
                .eq('id', user.userId)
        } else {
            await supabaseAdmin
                .from('platform_admins')
                .update({ theme_preference: theme, theme_updated_at: new Date().toISOString() })
                .eq('id', user.adminId)
        }

        return NextResponse.json({ ok: true, theme })
    } catch (err: any) {
        console.error('Theme save error:', err)
        return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 })
    }
}
