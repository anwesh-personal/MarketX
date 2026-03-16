/**
 * Shared API route authentication utilities.
 * Use these in any API route that needs user auth + org context.
 *
 * - getAuthContext(): cookie-based auth → { userId, orgId } or null
 * - supabaseAdmin: service role client for DB operations (bypasses RLS)
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthContext {
    userId: string
    orgId: string
}

export async function getAuthContext(): Promise<AuthContext | null> {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

    if (!userData?.org_id) return null
    return { userId: user.id, orgId: userData.org_id }
}
