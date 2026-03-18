import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const flowId = params.id

    const { data: flow, error: flowErr } = await supabase
        .from('flow')
        .select('id, partner_id, belief_id, offer_id, icp_id, version_no, status, metadata')
        .eq('id', flowId)
        .eq('partner_id', me.org_id)
        .single()
    if (flowErr || !flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 })

    const { data: steps } = await supabase
        .from('flow_step')
        .select('id, step_number, subject_a, subject_b')
        .eq('flow_id', flowId)
        .order('step_number', { ascending: true })

    const stepIds = (steps ?? []).map(s => s.id)

    const { data: rawSignals } = await supabase
        .from('signal_event')
        .select('id, flow_step_id, event_type, meta, metadata, occurred_at')
        .eq('flow_id', flowId)

    const signals = (rawSignals ?? []).map(s => ({
        ...s,
        metadata: (s as any).metadata && Object.keys((s as any).metadata).length > 0
            ? (s as any).metadata
            : (s as any).meta || {},
    }))

    const stepAnalysis = (steps ?? []).map(step => {
        const stepSignals = (signals ?? []).filter(s => s.flow_step_id === step.id)
        const byType: Record<string, number> = {}
        for (const s of stepSignals) {
            byType[s.event_type] = (byType[s.event_type] ?? 0) + 1
        }

        const sends = byType['send'] ?? 0
        const opens = byType['open'] ?? 0
        const clicks = byType['click'] ?? 0
        const replies = byType['reply'] ?? 0
        const bookings = byType['booking'] ?? 0
        const bounces = byType['bounce'] ?? 0

        const uniqueAccounts = new Set(
            stepSignals
                .map(s => (s.metadata as any)?.account_id || (s.metadata as any)?.subscriber_email)
                .filter(Boolean)
        )

        const engagementTypes = {
            click_only: 0,
            reply_only: 0,
            click_and_reply: 0,
            booking_direct: 0,
            none: 0,
        }

        const accountActions: Record<string, Set<string>> = {}
        for (const s of stepSignals) {
            const acct = (s.metadata as any)?.account_id || (s.metadata as any)?.subscriber_email || 'unknown'
            if (!accountActions[acct]) accountActions[acct] = new Set()
            accountActions[acct].add(s.event_type)
        }
        for (const [, actions] of Object.entries(accountActions)) {
            const hasClick = actions.has('click')
            const hasReply = actions.has('reply')
            const hasBooking = actions.has('booking')
            if (hasBooking) engagementTypes.booking_direct++
            else if (hasClick && hasReply) engagementTypes.click_and_reply++
            else if (hasClick) engagementTypes.click_only++
            else if (hasReply) engagementTypes.reply_only++
            else engagementTypes.none++
        }

        return {
            step_number: step.step_number,
            step_id: step.id,
            subject_a: step.subject_a,
            subject_b: step.subject_b,
            signals: {
                sends, opens, clicks, replies, bookings, bounces,
                open_rate: sends > 0 ? opens / sends : 0,
                click_rate: opens > 0 ? clicks / opens : 0,
                reply_rate: sends > 0 ? replies / sends : 0,
                booking_rate: sends > 0 ? bookings / sends : 0,
                bounce_rate: sends > 0 ? bounces / sends : 0,
            },
            engagement_mix: engagementTypes,
            unique_accounts: uniqueAccounts.size,
            account_spread_ratio: sends > 0 ? uniqueAccounts.size / sends : 0,
        }
    })

    const allSignals = signals ?? []
    const replySignals = allSignals.filter(s => s.event_type === 'reply')
    const replyClassifications: Record<string, number> = {}
    for (const r of replySignals) {
        const label = (r.metadata as any)?.classification || (r.metadata as any)?.reply_label || 'unknown'
        replyClassifications[label] = (replyClassifications[label] ?? 0) + 1
    }

    const totalSends = stepAnalysis.reduce((sum, s) => sum + s.signals.sends, 0)
    const totalBookings = stepAnalysis.reduce((sum, s) => sum + s.signals.bookings, 0)
    const totalReplies = stepAnalysis.reduce((sum, s) => sum + s.signals.replies, 0)

    const blockPerformance: Record<string, any> = {}
    for (const [blockLabel, range] of Object.entries({ 'block_1': [1, 4], 'block_2': [5, 8], 'block_3': [9, 12], 'reflection': [13, 999] })) {
        const blockSteps = stepAnalysis.filter(s => s.step_number >= range[0] && s.step_number <= range[1])
        if (blockSteps.length === 0) continue
        const bSends = blockSteps.reduce((s, st) => s + st.signals.sends, 0)
        const bReplies = blockSteps.reduce((s, st) => s + st.signals.replies, 0)
        const bBookings = blockSteps.reduce((s, st) => s + st.signals.bookings, 0)
        blockPerformance[blockLabel] = {
            steps: blockSteps.length,
            sends: bSends,
            replies: bReplies,
            bookings: bBookings,
            reply_rate: bSends > 0 ? bReplies / bSends : 0,
            booking_rate: bSends > 0 ? bBookings / bSends : 0,
        }
    }

    return NextResponse.json({
        flow_id: flowId,
        belief_id: flow.belief_id,
        version: flow.version_no,
        total_steps: (steps ?? []).length,
        summary: {
            total_sends: totalSends,
            total_replies: totalReplies,
            total_bookings: totalBookings,
            overall_reply_rate: totalSends > 0 ? totalReplies / totalSends : 0,
            overall_booking_rate: totalSends > 0 ? totalBookings / totalSends : 0,
        },
        step_analysis: stepAnalysis,
        reply_composition: replyClassifications,
        block_performance: blockPerformance,
    })
}
