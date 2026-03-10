import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getConfigValues } from '@/lib/platform-config'

const EXTENSION_BLOCKS = {
    2: { from: 5, to: 8, label: 'Block 2 (emails 5-8)' },
    3: { from: 9, to: 12, label: 'Block 3 (emails 9-12)' },
} as const

const ALLOWED_MUTATIONS = [
    'friction_level',
    'problem_specificity',
    'idea_order',
    'fit_clarity',
    'urgency_tone',
    'social_proof_depth',
] as const

const FORBIDDEN_MUTATIONS = [
    'offer',
    'icp',
    'belief_mixing',
    'angle_change',
    'core_hypothesis',
] as const

const schema = z.object({
    flow_id: z.string().uuid(),
    block: z.literal(2).or(z.literal(3)),
    steps: z.array(z.object({
        step_number: z.number().int().min(1).max(12),
        subject_a: z.string().min(1).max(500),
        subject_b: z.string().min(1).max(500).optional(),
        body_html: z.string().min(1),
        body_text: z.string().optional(),
        mutations_applied: z.array(z.string()).optional(),
    })).min(1).max(4),
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

    const allowedRoles = ['admin', 'owner', 'superadmin']
    if (!allowedRoles.includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { flow_id, block, steps } = parsed.data
    const blockDef = EXTENSION_BLOCKS[block]

    const { data: flow, error: flowErr } = await supabase
        .from('flow')
        .select('id, partner_id, belief_id, offer_id, icp_id, status, version_no')
        .eq('id', flow_id)
        .eq('partner_id', me.org_id)
        .single()
    if (flowErr || !flow) return NextResponse.json({ error: 'Flow not found for this org' }, { status: 404 })

    if (flow.status !== 'active') {
        return NextResponse.json({ error: `Flow is ${flow.status} — only active flows can be extended` }, { status: 409 })
    }

    const { data: belief } = await supabase
        .from('belief')
        .select('id, status, confidence_score')
        .eq('id', flow.belief_id)
        .single()
    if (!belief) return NextResponse.json({ error: 'Bound belief not found' }, { status: 404 })

    const cfg = await getConfigValues(supabase, [
        'promotion_min_sample_size',
        'promotion_min_confidence',
    ])
    const minSample = Number(cfg['promotion_min_sample_size'])
    const minConfidence = Number(cfg['promotion_min_confidence'])

    const { data: signals } = await supabase
        .from('signal_event')
        .select('id')
        .eq('belief_id', flow.belief_id)
    const sampleCount = signals?.length ?? 0

    if (sampleCount < minSample) {
        return NextResponse.json({
            error: `Insufficient signal data (${sampleCount}/${minSample}) — extension blocked by gating`,
            gate: { sample_count: sampleCount, required: minSample },
        }, { status: 409 })
    }

    if (Number(belief.confidence_score) < minConfidence && block === 3) {
        return NextResponse.json({
            error: `Confidence too low for Block 3 extension (${belief.confidence_score}/${minConfidence})`,
            gate: { confidence: Number(belief.confidence_score), required: minConfidence },
        }, { status: 409 })
    }

    const { data: existingSteps } = await supabase
        .from('flow_step')
        .select('step_number')
        .eq('flow_id', flow_id)
        .gte('step_number', blockDef.from)
        .lte('step_number', blockDef.to)
    if (existingSteps && existingSteps.length > 0) {
        return NextResponse.json({
            error: `${blockDef.label} already has steps (${existingSteps.map(s => s.step_number).join(', ')}). Delete existing to re-extend.`,
        }, { status: 409 })
    }

    for (const step of steps) {
        if (step.step_number < blockDef.from || step.step_number > blockDef.to) {
            return NextResponse.json({
                error: `Step ${step.step_number} out of range for ${blockDef.label} (valid: ${blockDef.from}-${blockDef.to})`,
            }, { status: 400 })
        }
        for (const mut of (step.mutations_applied ?? [])) {
            if ((FORBIDDEN_MUTATIONS as readonly string[]).includes(mut)) {
                return NextResponse.json({
                    error: `Forbidden mutation "${mut}" in step ${step.step_number}. Forbidden: ${FORBIDDEN_MUTATIONS.join(', ')}`,
                }, { status: 400 })
            }
        }
    }

    const insertRows = steps.map(s => ({
        flow_id: flow_id,
        step_number: s.step_number,
        subject_a: s.subject_a,
        subject_b: s.subject_b ?? null,
        body_html: s.body_html,
        body_text: s.body_text ?? null,
    }))

    const { data: created, error: insertErr } = await supabase
        .from('flow_step')
        .insert(insertRows)
        .select('id, step_number, subject_a, subject_b')

    if (insertErr) {
        return NextResponse.json({ error: `Extension insert failed: ${insertErr.message}` }, { status: 500 })
    }

    const { error: versionErr } = await supabase
        .from('flow')
        .update({
            version_no: flow.version_no + 1,
            metadata: {
                ...(flow as any).metadata,
                [`block_${block}_extended_at`]: new Date().toISOString(),
                [`block_${block}_extended_by`]: user.id,
                [`block_${block}_mutations`]: steps.map(s => ({
                    step: s.step_number,
                    mutations: s.mutations_applied ?? [],
                })),
            },
        })
        .eq('id', flow_id)

    if (versionErr) {
        console.warn(`[flow-extend] Version bump failed for ${flow_id}: ${versionErr.message}`)
    }

    return NextResponse.json({
        success: true,
        flow_id,
        block: blockDef.label,
        steps_created: created?.length ?? 0,
        new_version: flow.version_no + 1,
        governance: {
            allowed_mutations: ALLOWED_MUTATIONS,
            forbidden_mutations: FORBIDDEN_MUTATIONS,
            gates_passed: { sample_count: sampleCount, confidence: Number(belief.confidence_score) },
        },
    }, { status: 201 })
}
