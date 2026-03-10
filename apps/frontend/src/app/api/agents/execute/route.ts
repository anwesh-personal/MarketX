import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
    ContactDecisionAgent,
    TimingWindowAgent,
    AngleSelectionAgent,
    SendPacingAgent,
    ReplyMeaningAgent,
    BuyingRoleAgent,
    BuyerStageAgent,
    UncertaintyResolutionAgent,
    SequenceProgressionAgent,
} from '@/services/mastery'

const AGENT_TYPES = [
    'contact_decision', 'timing_window', 'angle_selection',
    'send_pacing', 'reply_meaning',
    'buying_role', 'buyer_stage', 'uncertainty_resolution', 'sequence_progression',
] as const

const schema = z.object({
    agent_type: z.enum(AGENT_TYPES),
    input: z.record(z.any()),
})

export async function POST(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { agent_type, input } = parsed.data
    const context = { partnerId: me.org_id, supabase }

    try {
        let result

        switch (agent_type) {
            case 'contact_decision':
                result = await new ContactDecisionAgent(context).execute(input as any)
                break
            case 'timing_window':
                result = await new TimingWindowAgent(context).execute(input as any)
                break
            case 'angle_selection':
                result = await new AngleSelectionAgent(context).execute(input as any)
                break
            case 'send_pacing':
                result = await new SendPacingAgent(context).execute(input as any)
                break
            case 'reply_meaning':
                result = await new ReplyMeaningAgent(context).execute(input as any)
                break
            case 'buying_role':
                result = await new BuyingRoleAgent(context).execute(input as any)
                break
            case 'buyer_stage':
                result = await new BuyerStageAgent(context).execute(input as any)
                break
            case 'uncertainty_resolution':
                result = await new UncertaintyResolutionAgent(context).execute(input as any)
                break
            case 'sequence_progression':
                result = await new SequenceProgressionAgent(context).execute(input as any)
                break
        }

        return NextResponse.json({
            success: true,
            agent_type,
            result,
        })
    } catch (err: any) {
        return NextResponse.json({
            error: `Agent execution failed: ${err.message}`,
            agent_type,
        }, { status: 500 })
    }
}
