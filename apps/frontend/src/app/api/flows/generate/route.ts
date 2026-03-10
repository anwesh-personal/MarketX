import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const generateFlowSchema = z.object({
    belief_id: z.string().uuid('belief_id must be a valid UUID'),
    version_no: z.number().int().min(1).optional(),
})

function buildEmailStepCopy(step: number, statement: string, angle: string | null) {
    const angleLabel = angle || 'core angle'

    const subjects = [
        {
            a: `Quick thought on ${angleLabel}`,
            b: `A better lens for this problem`,
        },
        {
            a: `Why this keeps getting ignored`,
            b: `The hidden blocker behind this`,
        },
        {
            a: `What we are seeing in market behavior`,
            b: `Pattern we keep seeing in teams`,
        },
        {
            a: `Should we test this approach?`,
            b: `Worth a quick test this week?`,
        },
    ][step - 1]

    return {
        subjectA: subjects?.a || `Email ${step} - Option A`,
        subjectB: subjects?.b || `Email ${step} - Option B`,
        bodyText: [
            `Belief: ${statement}`,
            '',
            `Step ${step} focus: move the conversation forward without changing offer/ICP assumptions.`,
            'If this is relevant, I can share a concrete test plan tailored to your context.',
        ].join('\n'),
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
        const copy = buildEmailStepCopy(step, belief.statement, belief.angle)
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
