/**
 * SERVER-SIDE FEATURE GATE
 * ========================
 * Reusable utility for API routes to enforce plan-based access control.
 *
 * Usage in any API route:
 *
 *   import { requireFeature } from '@/lib/requireFeature'
 *
 *   export async function POST(req: NextRequest) {
 *     const gate = await requireFeature(req, 'can_chat_brain')
 *     if (gate.denied) return gate.response
 *     // gate.user, gate.orgId, gate.tier are available
 *   }
 *
 * This checks:
 *   1. User is authenticated (Supabase session)
 *   2. User belongs to an org
 *   3. The org's portal config allows the requested feature
 *
 * Superadmins bypass all feature gates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// All known feature flag column names on member_portal_config
export type FeatureFlag =
  | 'can_view_metrics'
  | 'can_chat_brain'
  | 'can_train_brain'
  | 'can_write_emails'
  | 'can_feed_brain'
  | 'can_access_flow_builder'
  | 'can_view_kb'
  | 'can_export_data'
  | 'can_manage_satellites'
  | 'can_view_agent_decisions'

// Default features for the basic tier (when no portal config exists)
const BASIC_TIER_DEFAULTS: Record<FeatureFlag, boolean> = {
  can_view_metrics: true,
  can_chat_brain: false,
  can_train_brain: false,
  can_write_emails: false,
  can_feed_brain: false,
  can_access_flow_builder: false,
  can_view_kb: false,
  can_export_data: false,
  can_manage_satellites: false,
  can_view_agent_decisions: false,
}

interface GateAllowed {
  denied: false
  userId: string
  orgId: string
  role: string
  tier: string
  response?: never
}

interface GateDenied {
  denied: true
  response: NextResponse
  userId?: never
  orgId?: never
  role?: never
  tier?: never
}

export type GateResult = GateAllowed | GateDenied

/**
 * Check authentication + feature access for an API route.
 *
 * @param _req - The NextRequest (used to establish Supabase session via cookies)
 * @param feature - The feature flag to check (e.g. 'can_chat_brain')
 * @returns GateResult — either { denied: false, userId, orgId, role, tier }
 *          or { denied: true, response } (return this response immediately)
 */
export async function requireFeature(
  _req: NextRequest,
  feature: FeatureFlag,
): Promise<GateResult> {
  const supabase = createClient()

  // ── 1. Auth ─────────────────────────────────────────────────────────────
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return {
      denied: true,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // ── 2. Org context ──────────────────────────────────────────────────────
  const { data: me } = await supabase
    .from('users')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single()

  if (!me?.org_id) {
    return {
      denied: true,
      response: NextResponse.json({ error: 'User org context not found' }, { status: 403 }),
    }
  }

  // ── 3. Superadmin bypass ────────────────────────────────────────────────
  if (me.role === 'superadmin') {
    return { denied: false, userId: me.id, orgId: me.org_id, role: me.role, tier: 'superadmin' }
  }

  // ── 4. Load portal config ──────────────────────────────────────────────
  const { data: portalConfig }: { data: any } = await supabase
    .from('member_portal_config')
    .select('*')
    .eq('partner_id', me.org_id)
    .single()

  let allowed: boolean
  let tier: string

  if (portalConfig) {
    tier = portalConfig.tier || 'basic'
    allowed = Boolean(portalConfig[feature])
  } else {
    // No portal config → fall back to basic tier defaults
    tier = 'basic'
    allowed = BASIC_TIER_DEFAULTS[feature] ?? false
  }

  if (!allowed) {
    return {
      denied: true,
      response: NextResponse.json(
        {
          error: 'Feature not available on your plan',
          feature,
          tier,
          upgrade: 'Contact your account manager to upgrade.',
        },
        { status: 403 },
      ),
    }
  }

  return { denied: false, userId: me.id, orgId: me.org_id, role: me.role ?? 'member', tier }
}

/**
 * Lightweight auth-only check (no feature gate).
 * Returns user info if authenticated, 401 otherwise.
 */
export async function requireAuth(_req: NextRequest): Promise<GateResult> {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return {
      denied: true,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: me } = await supabase
    .from('users')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single()

  if (!me?.org_id) {
    return {
      denied: true,
      response: NextResponse.json({ error: 'User org context not found' }, { status: 403 }),
    }
  }

  return { denied: false, userId: me.id, orgId: me.org_id, role: me.role ?? 'member', tier: 'any' }
}
