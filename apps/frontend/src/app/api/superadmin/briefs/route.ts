import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const createBriefSchema = z.object({
    org_id: z.string().uuid('org_id must be a valid UUID'),
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

export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode')
    const orgId = searchParams.get('org_id')

    if (mode === 'options') {
        if (!orgId) return NextResponse.json({ error: 'org_id is required for options mode' }, { status: 400 })

        const [{ data: offers, error: offersError }, { data: icps, error: icpsError }] = await Promise.all([
            supabase.from('offer').select('id, name').eq('partner_id', orgId).order('created_at', { ascending: false }),
            supabase.from('icp').select('id, name').eq('partner_id', orgId).order('created_at', { ascending: false }),
        ])

        if (offersError || icpsError) {
            return NextResponse.json({ error: offersError?.message ?? icpsError?.message ?? 'Failed to load options' }, { status: 500 })
        }

        return NextResponse.json({ offers: offers ?? [], icps: icps ?? [] })
    }

    const status = searchParams.get('status')
    const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') ?? 50)))

    let query = supabase
        .from('brief')
        .select('id, partner_id, offer_id, icp_id, title, hypothesis, locked_fields, status, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (orgId) query = query.eq('partner_id', orgId)
    if (status) query = query.eq('status', status)

    const { data: briefs, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!briefs?.length) return NextResponse.json({ briefs: [] })

    const briefIds = briefs.map((b) => b.id)

    const [{ data: beliefs }, { data: competitions }] = await Promise.all([
        supabase
            .from('belief')
            .select('id, brief_id, lane, status, allocation_weight, statement, angle')
            .in('brief_id', briefIds),
        supabase
            .from('belief_competition')
            .select('id, brief_id, champion_belief_id, challenger_belief_id, allocation_champion, allocation_challenger, active')
            .in('brief_id', briefIds),
    ])

    const beliefsByBrief = new Map<string, Array<Record<string, unknown>>>()
    for (const belief of beliefs ?? []) {
        const list = beliefsByBrief.get(belief.brief_id) ?? []
        list.push(belief)
        beliefsByBrief.set(belief.brief_id, list)
    }

    const competitionByBrief = new Map<string, Record<string, unknown>>()
    for (const comp of competitions ?? []) {
        competitionByBrief.set(comp.brief_id, comp)
    }

    return NextResponse.json({
        briefs: briefs.map((brief) => ({
            ...brief,
            beliefs: beliefsByBrief.get(brief.id) ?? [],
            competition: competitionByBrief.get(brief.id) ?? null,
        })),
    })
}

export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = createBriefSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const input = parsed.data
    const partnerId = input.org_id

    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, status')
        .eq('id', partnerId)
        .single()
    if (orgError || !org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const { data: partner } = await supabase.from('partner').select('id').eq('id', partnerId).maybeSingle()
    if (!partner) {
        await supabase.from('partner').insert({
            id: org.id,
            legal_name: org.name,
            status: org.status === 'cancelled' ? 'archived' : org.status,
        })
    }

    const { data: icp, error: icpError } = await supabase
        .from('icp')
        .select('id')
        .eq('id', input.icp_id)
        .eq('partner_id', partnerId)
        .single()
    if (icpError || !icp) return NextResponse.json({ error: 'ICP not found for this org' }, { status: 404 })

    const { data: offer, error: offerError } = await supabase
        .from('offer')
        .select('id')
        .eq('id', input.offer_id)
        .eq('partner_id', partnerId)
        .single()
    if (offerError || !offer) return NextResponse.json({ error: 'Offer not found for this org' }, { status: 404 })

    let selectedAngle: string | null = input.angle ?? null
    if (selectedAngle) {
        const { data: angle } = await supabase
            .from('offer_angles')
            .select('id')
            .eq('partner_id', partnerId)
            .eq('offer_id', input.offer_id)
            .eq('angle_code', selectedAngle)
            .eq('is_active', true)
            .maybeSingle()
        if (!angle) return NextResponse.json({ error: `Angle "${selectedAngle}" not found for this offer` }, { status: 400 })
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

    const { data: brief, error: briefError } = await supabase
        .from('brief')
        .insert({
            partner_id: partnerId,
            offer_id: input.offer_id,
            icp_id: input.icp_id,
            title: input.title ?? null,
            hypothesis: input.hypothesis,
            locked_fields: input.locked_fields ?? {},
            status: 'active',
        })
        .select('id, partner_id, offer_id, icp_id, title, hypothesis, status, locked_fields, created_at')
        .single()

    if (briefError || !brief) {
        return NextResponse.json({ error: `Failed to create brief: ${briefError?.message ?? 'unknown'}` }, { status: 500 })
    }

    const beliefRows = [
        {
            partner_id: partnerId,
            brief_id: brief.id,
            icp_id: input.icp_id,
            offer_id: input.offer_id,
            angle: selectedAngle,
            statement: input.champion_statement ?? fallbackChampionStatement(input.hypothesis),
            lane: 'champion',
            status: 'TEST',
            allocation_weight: 0.5,
        },
        {
            partner_id: partnerId,
            brief_id: brief.id,
            icp_id: input.icp_id,
            offer_id: input.offer_id,
            angle: selectedAngle,
            statement: input.challenger_statement ?? fallbackChallengerStatement(input.hypothesis),
            lane: 'challenger',
            status: 'TEST',
            allocation_weight: 0.5,
        },
    ]

    const { data: beliefs, error: beliefsError } = await supabase
        .from('belief')
        .insert(beliefRows)
        .select('id, lane, status, allocation_weight, statement, angle')

    if (beliefsError || !beliefs || beliefs.length !== 2) {
        await supabase.from('brief').delete().eq('id', brief.id)
        return NextResponse.json({ error: `Failed to create beliefs: ${beliefsError?.message ?? 'incomplete insert'}` }, { status: 500 })
    }

    const champion = beliefs.find((b) => b.lane === 'champion')
    const challenger = beliefs.find((b) => b.lane === 'challenger')
    if (!champion || !challenger) {
        await supabase.from('belief').delete().eq('brief_id', brief.id)
        await supabase.from('brief').delete().eq('id', brief.id)
        return NextResponse.json({ error: 'Belief pairing failed: champion/challenger not created' }, { status: 500 })
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
        return NextResponse.json({ error: `Failed to create competition pair: ${competitionError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        created_by_admin_id: admin.id,
        brief,
        beliefs: { champion, challenger },
        competition,
    }, { status: 201 })
}
