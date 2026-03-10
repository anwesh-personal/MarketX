import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ANGLE_LIBRARY = [
    {
        code: 'problem_reframe',
        name: 'Problem Reframe',
        core: 'The problem you think you have is not the real problem.',
        entry: 'Recognition of a misunderstood problem',
        hooks: [
            'Most teams are fixing the symptom, not the root constraint.',
            'The metric you optimize first is usually the wrong one.',
            'This problem looks tactical, but it is actually structural.',
        ],
    },
    {
        code: 'hidden_constraint',
        name: 'Hidden Constraint',
        core: 'Something upstream is silently limiting results.',
        entry: 'Discovery of an unseen bottleneck',
        hooks: [
            'Your funnel is not broken, your qualification logic is.',
            'One invisible bottleneck is capping all downstream performance.',
            'Output changed only after we removed this upstream drag.',
        ],
    },
    {
        code: 'false_solution',
        name: 'False Solution',
        core: 'The industry-accepted solution actually worsens the problem.',
        entry: 'Critical evaluation of standard approaches',
        hooks: [
            'The default playbook is giving activity, not outcomes.',
            'Best practices are often optimized for optics, not conversion.',
            'What looks safe in-market can quietly destroy response quality.',
        ],
    },
    {
        code: 'economic_inefficiency',
        name: 'Economic Inefficiency',
        core: 'Current approach costs 5-10x more than necessary.',
        entry: 'Financial audit of waste',
        hooks: [
            'You are paying premium CAC for avoidable process debt.',
            'Same objective, one-tenth waste, if sequence logic is fixed.',
            'The hidden cost is not tools, it is mis-sequenced effort.',
        ],
    },
    {
        code: 'market_shift',
        name: 'Market Shift',
        core: 'Market rules changed, but strategies have not.',
        entry: 'Observation of new rules vs old assumptions',
        hooks: [
            'Buyer behavior changed faster than outreach strategy.',
            'What worked last year now creates trust friction.',
            'The market moved; the messaging architecture did not.',
        ],
    },
    {
        code: 'opportunity_gap',
        name: 'Opportunity Gap',
        core: 'Competitors are missing something that creates advantage.',
        entry: 'Identification of unrealized potential',
        hooks: [
            'There is a response pocket your competitors are not addressing.',
            'One neglected narrative can create asymmetric lift quickly.',
            'Your category has demand leakage waiting to be captured.',
        ],
    },
    {
        code: 'risk_exposure',
        name: 'Risk Exposure',
        core: 'Current approach introduces hidden risk.',
        entry: 'Revelation of hidden systemic risk',
        hooks: [
            'Current process is one failure away from reputation damage.',
            'Silent deliverability risk is compounding in the background.',
            'The biggest risk is not low volume, it is unstable quality.',
        ],
    },
] as const

const seedSchema = z.object({
    offer_id: z.string().uuid('offer_id must be a valid UUID'),
    overwrite: z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
    const supabase = createClient()
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()

    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const offerId = req.nextUrl.searchParams.get('offer_id')
    if (!offerId) return NextResponse.json({ error: 'offer_id is required' }, { status: 400 })

    const { data: angles, error } = await supabase
        .from('offer_angles')
        .select('id, angle_code, angle_name, core_concept, entry_point, is_active')
        .eq('partner_id', me.org_id)
        .eq('offer_id', offerId)
        .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!angles?.length) return NextResponse.json({ offer_id: offerId, angles: [] }, { status: 200 })

    const angleIds = angles.map((a) => a.id)
    const { data: hooks, error: hooksError } = await supabase
        .from('offer_angle_hooks')
        .select('id, angle_id, hook_text, hook_order, is_active')
        .in('angle_id', angleIds)
        .order('hook_order', { ascending: true })

    if (hooksError) return NextResponse.json({ error: hooksError.message }, { status: 500 })

    const hooksByAngle = new Map<string, Array<{ id: string; text: string; order: number; is_active: boolean }>>()
    for (const hook of hooks ?? []) {
        const arr = hooksByAngle.get(hook.angle_id) ?? []
        arr.push({ id: hook.id, text: hook.hook_text, order: hook.hook_order, is_active: hook.is_active })
        hooksByAngle.set(hook.angle_id, arr)
    }

    return NextResponse.json({
        offer_id: offerId,
        angles: angles.map((a) => ({
            id: a.id,
            code: a.angle_code,
            name: a.angle_name,
            core_concept: a.core_concept,
            entry_point: a.entry_point,
            is_active: a.is_active,
            hooks: hooksByAngle.get(a.id) ?? [],
        })),
    })
}

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me, error: meError } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()

    if (meError || !me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
    if (!['owner', 'admin', 'superadmin'].includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Only admin/owner can seed angles' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = seedSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { offer_id: offerId, overwrite } = parsed.data

    const { data: offer, error: offerError } = await supabase
        .from('offer')
        .select('id')
        .eq('id', offerId)
        .eq('partner_id', me.org_id)
        .single()
    if (offerError || !offer) return NextResponse.json({ error: 'Offer not found for this partner' }, { status: 404 })

    if (overwrite) {
        const { data: existing } = await supabase
            .from('offer_angles')
            .select('id')
            .eq('offer_id', offerId)
            .eq('partner_id', me.org_id)

        if (existing?.length) {
            const ids = existing.map((x) => x.id)
            await supabase.from('offer_angle_hooks').delete().in('angle_id', ids)
            await supabase.from('offer_angles').delete().in('id', ids)
        }
    }

    const created: Array<{ id: string; code: string; hooks: number }> = []

    for (const angle of ANGLE_LIBRARY) {
        const { data: insertedAngle, error: angleError } = await supabase
            .from('offer_angles')
            .upsert({
                partner_id: me.org_id,
                offer_id: offerId,
                angle_code: angle.code,
                angle_name: angle.name,
                core_concept: angle.core,
                entry_point: angle.entry,
                is_system: true,
                is_active: true,
            }, { onConflict: 'offer_id,angle_code' })
            .select('id, angle_code')
            .single()

        if (angleError || !insertedAngle) {
            return NextResponse.json({ error: `Failed to seed angle ${angle.code}: ${angleError?.message}` }, { status: 500 })
        }

        const hooksPayload = angle.hooks.map((hook, idx) => ({
            angle_id: insertedAngle.id,
            hook_text: hook,
            hook_order: idx + 1,
            is_active: true,
        }))

        const { error: hooksError } = await supabase
            .from('offer_angle_hooks')
            .upsert(hooksPayload, { onConflict: 'angle_id,hook_order' })

        if (hooksError) {
            return NextResponse.json({ error: `Failed to seed hooks for ${angle.code}: ${hooksError.message}` }, { status: 500 })
        }

        created.push({ id: insertedAngle.id, code: insertedAngle.angle_code, hooks: hooksPayload.length })
    }

    return NextResponse.json({
        success: true,
        offer_id: offerId,
        angles_seeded: created.length,
        details: created,
    }, { status: 201 })
}
