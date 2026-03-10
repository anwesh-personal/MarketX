import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ReplyMeaningAgent } from '@/services/mastery'

const schema = z.object({
    reply_text: z.string().min(1).max(50000),
    belief_id: z.string().uuid(),
    flow_step_id: z.string().uuid().optional(),
    sender_email: z.string().email().optional(),
})

export async function POST(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { reply_text, belief_id, flow_step_id, sender_email } = parsed.data

    const { data: belief } = await supabase
        .from('belief')
        .select('id, partner_id, offer_id, icp_id, brief_id')
        .eq('id', belief_id)
        .eq('partner_id', me.org_id)
        .single()
    if (!belief) return NextResponse.json({ error: 'Belief not found for this org' }, { status: 404 })

    const agent = new ReplyMeaningAgent({ partnerId: me.org_id, supabase })
    const result = await agent.execute({
        replyText: reply_text,
        beliefId: belief_id,
        flowStepId: flow_step_id,
        senderEmail: sender_email,
    })

    const { error: signalErr } = await supabase
        .from('signal_event')
        .insert({
            partner_id: me.org_id,
            offer_id: belief.offer_id,
            icp_id: belief.icp_id,
            brief_id: belief.brief_id,
            belief_id: belief_id,
            flow_step_id: flow_step_id ?? null,
            event_type: 'reply',
            metadata: {
                classification: result.decision,
                confidence: result.confidence,
                recommended_action: result.detail.recommended_action,
                agent_version: '1.0',
                sender_email,
                word_count: result.detail.word_count,
                has_question: result.detail.has_question,
            },
        })

    if (signalErr) {
        console.warn(`[classify-reply] Signal persist failed: ${signalErr.message}`)
    }

    return NextResponse.json({
        classification: result.decision,
        confidence: result.confidence,
        recommended_action: result.detail.recommended_action,
        detail: result.detail,
        reasoning: result.reasoning,
        signal_persisted: !signalErr,
    })
}
