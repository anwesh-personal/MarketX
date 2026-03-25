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

// Enterprise fallback — safest default so nobody is locked out
const ENTERPRISE_DEFAULTS: Record<FeatureFlag, boolean> = {
  can_view_metrics: true,
  can_chat_brain: true,
  can_train_brain: true,
  can_write_emails: true,
  can_feed_brain: true,
  can_access_flow_builder: true,
  can_view_kb: true,
  can_export_data: true,
  can_manage_satellites: true,
  can_view_agent_decisions: true,
}

const PLAN_TO_TIER_KEY: Record<string, string> = {
  free: 'member_tier_basic',
  starter: 'member_tier_basic',
  basic: 'member_tier_basic',
  pro: 'member_tier_medium',
  medium: 'member_tier_medium',
  enterprise: 'member_tier_enterprise',
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
    .select('id, org_id, role, organization:organizations(plan)')
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
    // No portal config → derive from org's actual plan
    const org = Array.isArray((me as any).organization) ? (me as any).organization[0] : (me as any).organization
    const orgPlan = (org?.plan || 'enterprise').toLowerCase()
    const tierKey = PLAN_TO_TIER_KEY[orgPlan] || 'member_tier_enterprise'
    tier = tierKey.replace('member_tier_', '')

    // Try config_table for tier defaults
    const { data: tierConfig } = await supabase
      .from('config_table')
      .select('value')
      .eq('key', tierKey)
      .single()

    if (tierConfig?.value && typeof tierConfig.value === 'object') {
      allowed = Boolean((tierConfig.value as any)[feature])
    } else {
      // Absolute fallback: enterprise defaults (everything open)
      allowed = ENTERPRISE_DEFAULTS[feature] ?? true
    }
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
