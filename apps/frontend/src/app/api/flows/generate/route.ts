import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const generateFlowSchema = z.object({
    belief_id: z.string().uuid('belief_id must be a valid UUID'),
    version_no: z.number().int().min(1).optional(),
})

interface FlowContext {
    statement: string
    angle: string | null
    offerName: string | null
    offerPromise: string | null
    icpName: string | null
    icpCriteria: Record<string, any> | null
}

const STEP_STRATEGIES = [
    { focus: 'pattern_interrupt', goal: 'Challenge an assumption they hold — open a gap in their thinking' },
    { focus: 'credibility_anchor', goal: 'Share a specific observation or data point that builds trust' },
    { focus: 'value_demonstration', goal: 'Show the concrete impact of the belief through examples or mini case study' },
    { focus: 'commitment_test', goal: 'Invite a small next step — reply, call, resource — low friction commitment' },
]

function buildEmailStepCopy(step: number, ctx: FlowContext) {
    const { statement, angle, offerName, offerPromise, icpName, icpCriteria } = ctx
    const angleLabel = angle || 'this approach'
    const strategy = STEP_STRATEGIES[step - 1] || STEP_STRATEGIES[0]

    const audienceHint = icpName
        ? `for ${icpName}${icpCriteria?.job_title ? ` (${icpCriteria.job_title})` : ''}`
        : ''

    const subjectPairs: Record<number, { a: string; b: string }> = {
        1: {
            a: `Quick thought on ${angleLabel} ${audienceHint}`.trim(),
            b: `A different way to think about ${angleLabel}`,
        },
        2: {
            a: `Why ${angleLabel} keeps getting ignored`,
            b: `The hidden reason behind ${angleLabel.toLowerCase()} struggles`,
        },
        3: {
            a: `What we're seeing with ${angleLabel} in practice`,
            b: `${offerPromise ? offerPromise.substring(0, 50) : `Real results from ${angleLabel}`}`,
        },
        4: {
            a: `Worth a 15-min test ${audienceHint}?`.trim(),
            b: `Quick experiment: ${angleLabel}`,
        },
    }

    const subjects = subjectPairs[step] || { a: `Email ${step} — ${angleLabel}`, b: `Follow up: ${angleLabel}` }

    const bodyLines: string[] = []

    switch (step) {
        case 1:
            bodyLines.push(
                `I've been thinking about something ${audienceHint || 'in this space'} — and it keeps coming back to one core belief:`,
                '', `"${statement}"`, '',
                `Most teams approach ${angleLabel} the conventional way. But what if the real leverage is somewhere else entirely?`,
                '', `Strategy: ${strategy.goal}`,
                '', `If this resonates, I'd love to share what we've been seeing. Just hit reply.`,
            )
            break
        case 2:
            bodyLines.push(
                `Following up on my last note about ${angleLabel}.`,
                '', `Here's what I keep observing: ${statement}`,
                '', `The interesting part isn't the belief itself — it's that ${icpCriteria?.industry || 'most teams'} consistently overlook it.`,
                offerName ? `\nThis is exactly why we built ${offerName}${offerPromise ? ` — ${offerPromise}` : ''}.` : '',
                '', `Strategy: ${strategy.goal}`,
                '', `Curious if you're seeing the same pattern?`,
            )
            break
        case 3:
            bodyLines.push(
                `One more thought on ${angleLabel} — this time with specifics.`,
                '', `"${statement}"`,
                '', `When teams actually test this belief:`,
                `• They stop wasting cycles on ${icpCriteria?.pain_points?.[0] || 'the wrong activities'}`,
                offerPromise ? `• They start seeing ${offerPromise.toLowerCase()}` : '• They see measurable improvement within weeks',
                `• The ROI compounds because the insight is structural, not tactical`,
                '', `Strategy: ${strategy.goal}`,
                '', `Would a concrete example be useful? I can share one relevant to ${icpCriteria?.industry || 'your context'}.`,
            )
            break
        case 4:
            bodyLines.push(
                `Last note in this thread — just want to be respectful of your time.`,
                '', `The core idea: "${statement}"`,
                '', `If this landed for you at all, I have a simple next step:`,
                offerName ? `• Check out ${offerName} — it's built around this exact insight` : '• A 15-minute call to explore if this fits your situation',
                `• No pitch, just a conversation about ${angleLabel} in your context`,
                '', `Strategy: ${strategy.goal}`,
                '', `If the timing isn't right, totally understand. Either way, I hope the perspective was useful.`,
            )
            break
    }

    return {
        subjectA: subjects.a,
        subjectB: subjects.b,
        bodyText: bodyLines.filter(l => l !== undefined).join('\n'),
    }
}

export async function POST(req: NextRequest) {
    const supabase = createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me, error: meError } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()

    if (meError || !me?.org_id) {
        return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
    }

    if (!['owner', 'admin', 'superadmin'].includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Only admin/owner can generate flows' }, { status: 403 })
    }

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = generateFlowSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        )
    }

    const input = parsed.data
    const partnerId = me.org_id
    const versionNo = input.version_no ?? 1

    const { data: belief, error: beliefError } = await supabase
        .from('belief')
        .select('id, partner_id, offer_id, icp_id, brief_id, angle, statement')
        .eq('id', input.belief_id)
        .eq('partner_id', partnerId)
        .single()

    if (beliefError || !belief) {
        return NextResponse.json({ error: 'Belief not found for this partner' }, { status: 404 })
    }

    // Fetch ICP and offer context for personalized copy
    let offerName: string | null = null
    let offerPromise: string | null = null
    let icpName: string | null = null
    let icpCriteria: Record<string, any> | null = null

    if (belief.offer_id) {
        const { data: offer } = await supabase
            .from('offer')
            .select('name, primary_promise')
            .eq('id', belief.offer_id)
            .single()
        if (offer) {
            offerName = offer.name
            offerPromise = offer.primary_promise
        }
    }

    if (belief.icp_id) {
        const { data: icp } = await supabase
            .from('icp')
            .select('name, criteria')
            .eq('id', belief.icp_id)
            .single()
        if (icp) {
            icpName = icp.name
            icpCriteria = icp.criteria as Record<string, any>
        }
    }

    const flowCtx: FlowContext = {
        statement: belief.statement,
        angle: belief.angle,
        offerName,
        offerPromise,
        icpName,
        icpCriteria,
    }

    const { data: flow, error: flowError } = await supabase
        .from('flow')
        .insert({
            partner_id: partnerId,
            offer_id: belief.offer_id,
            icp_id: belief.icp_id,
            belief_id: belief.id,
            version_no: versionNo,
            status: 'active',
            metadata: {
                generated_by: 'api/flows/generate',
                source_brief_id: belief.brief_id,
                email_block: '1-4',
                context: { offerName, icpName, angle: belief.angle },
            },
        })
        .select('id, belief_id, version_no, status, created_at')
        .single()

    if (flowError || !flow) {
        return NextResponse.json(
            { error: `Failed to create flow: ${flowError?.message ?? 'unknown error'}` },
            { status: 500 }
        )
    }

    const steps = [1, 2, 3, 4].map((step) => {
        const copy = buildEmailStepCopy(step, flowCtx)
        return {
            flow_id: flow.id,
            step_number: step,
            subject_a: copy.subjectA,
            subject_b: copy.subjectB,
            body_text: copy.bodyText,
            body_html: null,
        }
    })

    const { data: flowSteps, error: stepsError } = await supabase
        .from('flow_step')
        .insert(steps)
        .select('id, step_number, subject_a, subject_b')
        .order('step_number', { ascending: true })

    if (stepsError || !flowSteps || flowSteps.length !== 4) {
        await supabase.from('flow').delete().eq('id', flow.id)
        return NextResponse.json(
            { error: `Failed to create flow steps: ${stepsError?.message ?? 'incomplete step insert'}` },
            { status: 500 }
        )
    }

    return NextResponse.json(
        {
            success: true,
            flow,
            steps: flowSteps,
        },
        { status: 201 }
    )
}
