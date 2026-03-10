import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const generateBriefSchema = z.object({
    icp_id: z.string().uuid('icp_id must be a valid UUID'),
    offer_id: z.string().uuid('offer_id must be a valid UUID'),
    title: z.string().min(1).max(255).optional(),
    hypothesis: z.string().min(10, 'hypothesis must be at least 10 chars'),
    champion_statement: z.string().min(10).optional(),
    challenger_statement: z.string().min(10).optional(),
    angle: z.string().max(255).optional(),
    locked_fields: z.record(z.string(), z.unknown()).optional(),
})

function fallbackChampionStatement(hypothesis: string): string {
    return `Champion hypothesis: ${hypothesis}`
}

function fallbackChallengerStatement(hypothesis: string): string {
    return `Challenger hypothesis: Contrary to baseline, ${hypothesis}`
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
        return NextResponse.json({ error: 'Only admin/owner can generate briefs' }, { status: 403 })
    }

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = generateBriefSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        )
    }

    const input = parsed.data
    const partnerId = me.org_id

    const { data: icp, error: icpError } = await supabase
        .from('icp')
        .select('id')
        .eq('id', input.icp_id)
        .eq('partner_id', partnerId)
        .single()

    if (icpError || !icp) {
        return NextResponse.json({ error: 'ICP not found for this partner' }, { status: 404 })
    }

    const { data: offer, error: offerError } = await supabase
        .from('offer')
        .select('id')
        .eq('id', input.offer_id)
        .eq('partner_id', partnerId)
        .single()

    if (offerError || !offer) {
        return NextResponse.json({ error: 'Offer not found for this partner' }, { status: 404 })
    }

    let selectedAngle: string | null = input.angle ?? null
    if (selectedAngle) {
        const { data: angleRow, error: angleError } = await supabase
            .from('offer_angles')
            .select('id, angle_code')
            .eq('partner_id', partnerId)
            .eq('offer_id', input.offer_id)
            .eq('angle_code', selectedAngle)
            .eq('is_active', true)
            .maybeSingle()

        if (angleError) {
            return NextResponse.json({ error: `Angle lookup failed: ${angleError.message}` }, { status: 500 })
        }
        if (!angleRow) {
            return NextResponse.json(
                { error: `Angle "${selectedAngle}" is not seeded for this offer. Seed angles first via POST /api/angles.` },
                { status: 400 }
            )
        }
    } else {
        const { data: fallbackAngle } = await supabase
            .from('offer_angles')
            .select('angle_code')
            .eq('partner_id', partnerId)
            .eq('offer_id', input.offer_id)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
        selectedAngle = fallbackAngle?.angle_code ?? null
    }

    const briefRow = {
        partner_id: partnerId,
        offer_id: input.offer_id,
        icp_id: input.icp_id,
        title: input.title ?? null,
        hypothesis: input.hypothesis,
        locked_fields: input.locked_fields ?? {},
        status: 'active' as const,
    }

    const { data: brief, error: briefError } = await supabase
        .from('brief')
        .insert(briefRow)
        .select('id, partner_id, offer_id, icp_id, title, hypothesis, status, created_at')
        .single()

    if (briefError || !brief) {
        return NextResponse.json(
            { error: `Failed to create brief: ${briefError?.message ?? 'unknown error'}` },
            { status: 500 }
        )
    }

    const championBelief = {
        partner_id: partnerId,
        brief_id: brief.id,
        icp_id: input.icp_id,
        offer_id: input.offer_id,
        angle: selectedAngle,
        statement: input.champion_statement ?? fallbackChampionStatement(input.hypothesis),
        lane: 'champion' as const,
        status: 'TEST' as const,
        allocation_weight: 0.5,
    }

    const challengerBelief = {
        partner_id: partnerId,
        brief_id: brief.id,
        icp_id: input.icp_id,
        offer_id: input.offer_id,
        angle: selectedAngle,
        statement: input.challenger_statement ?? fallbackChallengerStatement(input.hypothesis),
        lane: 'challenger' as const,
        status: 'TEST' as const,
        allocation_weight: 0.5,
    }

    const { data: insertedBeliefs, error: beliefsError } = await supabase
        .from('belief')
        .insert([championBelief, challengerBelief])
        .select('id, lane, status, allocation_weight, statement')

    if (beliefsError || !insertedBeliefs || insertedBeliefs.length !== 2) {
        await supabase.from('brief').delete().eq('id', brief.id)
        return NextResponse.json(
            { error: `Failed to create paired beliefs: ${beliefsError?.message ?? 'incomplete belief insert'}` },
            { status: 500 }
        )
    }

    const champion = insertedBeliefs.find((b) => b.lane === 'champion')
    const challenger = insertedBeliefs.find((b) => b.lane === 'challenger')
    if (!champion || !challenger) {
        await supabase.from('belief').delete().eq('brief_id', brief.id)
        await supabase.from('brief').delete().eq('id', brief.id)
        return NextResponse.json(
            { error: 'Belief pairing failed: champion/challenger lanes not created correctly' },
            { status: 500 }
        )
    }

    const { data: competition, error: competitionError } = await supabase
        .from('belief_competition')
        .insert({
            partner_id: partnerId,
            brief_id: brief.id,
            champion_belief_id: champion.id,
            challenger_belief_id: challenger.id,
            allocation_champion: 0.5,
            allocation_challenger: 0.5,
            active: true,
        })
        .select('id, allocation_champion, allocation_challenger, active')
        .single()

    if (competitionError || !competition) {
        await supabase.from('belief').delete().eq('brief_id', brief.id)
        await supabase.from('brief').delete().eq('id', brief.id)
        return NextResponse.json(
            { error: `Failed to create belief competition pair: ${competitionError?.message ?? 'unknown error'}` },
            { status: 500 }
        )
    }

    return NextResponse.json(
        {
            success: true,
            brief,
            beliefs: {
                champion,
                challenger,
            },
            competition,
        },
        { status: 201 }
    )
}
