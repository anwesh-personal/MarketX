import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const { data: portalConfig } = await supabase
        .from('member_portal_config')
        .select('*')
        .eq('partner_id', me.org_id)
        .single()

    if (!portalConfig) {
        const { data: defaultTier } = await supabase
            .from('config_table')
            .select('value')
            .eq('key', 'member_tier_basic')
            .single()

        return NextResponse.json({
            tier: 'basic',
            features: defaultTier?.value ?? {
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
                max_brain_chats_per_day: 0,
                max_kb_uploads: 0,
                max_custom_flows: 0,
            },
            partner_id: me.org_id,
        })
    }

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
