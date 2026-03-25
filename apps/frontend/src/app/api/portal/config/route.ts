import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * All-true enterprise-level defaults. Used as absolute fallback
 * so no user is ever locked out when config rows are missing.
 */
const ENTERPRISE_FALLBACK = {
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
    max_brain_chats_per_day: 999,
    max_kb_uploads: 100,
    max_custom_flows: 50,
}

/**
 * Map org plan names to config_table tier keys.
 * Any plan not listed here gets enterprise (safest default = open).
 */
const PLAN_TO_TIER_KEY: Record<string, string> = {
    free: 'member_tier_basic',
    starter: 'member_tier_basic',
    basic: 'member_tier_basic',
    pro: 'member_tier_medium',
    medium: 'member_tier_medium',
    enterprise: 'member_tier_enterprise',
}

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get user + org info in one query
    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role, organization:organizations(plan)')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    // 1. Try explicit per-org config (member_portal_config row)
    const { data: portalConfig } = await supabase
        .from('member_portal_config')
        .select('*')
        .eq('partner_id', me.org_id)
        .single()

    if (portalConfig) {
        return NextResponse.json({
            tier: portalConfig.tier,
            features: {
                can_view_metrics: portalConfig.can_view_metrics,
                can_chat_brain: portalConfig.can_chat_brain,
                can_train_brain: portalConfig.can_train_brain,
                can_write_emails: portalConfig.can_write_emails,
                can_feed_brain: portalConfig.can_feed_brain,
                can_access_flow_builder: portalConfig.can_access_flow_builder,
                can_view_kb: portalConfig.can_view_kb,
                can_export_data: portalConfig.can_export_data,
                can_manage_satellites: portalConfig.can_manage_satellites,
                can_view_agent_decisions: portalConfig.can_view_agent_decisions,
                max_brain_chats_per_day: portalConfig.max_brain_chats_per_day,
                max_kb_uploads: portalConfig.max_kb_uploads,
                max_custom_flows: portalConfig.max_custom_flows,
            },
            partner_id: me.org_id,
        })
    }

    // 2. No per-org config → derive from org's plan
    const org = Array.isArray(me.organization) ? me.organization[0] : me.organization
    const orgPlan = ((org as any)?.plan || 'enterprise').toLowerCase()
    const tierKey = PLAN_TO_TIER_KEY[orgPlan] || 'member_tier_enterprise'
    const tierLabel = tierKey.replace('member_tier_', '')

    const { data: tierConfig } = await supabase
        .from('config_table')
        .select('value')
        .eq('key', tierKey)
        .single()

    return NextResponse.json({
        tier: tierLabel,
        features: tierConfig?.value ?? ENTERPRISE_FALLBACK,
        partner_id: me.org_id,
    })
}
