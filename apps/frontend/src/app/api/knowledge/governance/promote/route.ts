import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
    PROMOTION_MIN_CROSS_PARTNER,
    PROMOTION_MIN_SAMPLE_SIZE,
    PROMOTION_MIN_STABILITY,
    PROMOTION_REVALIDATION_WINDOW_MS,
} from '@/lib/config-defaults'

const VALID_TRANSITIONS: Record<string, string[]> = {
    active:       ['candidate'],
    candidate:    ['under_review', 'active'],
    under_review: ['promoted', 'active', 'suspended'],
    promoted:     ['demoted', 'suspended', 'retired'],
    demoted:      ['active', 'retired'],
    suspended:    ['active', 'under_review', 'retired'],
    retired:      [],
}

const schema = z.object({
    knowledge_object_id: z.string().uuid(),
    target_status: z.enum(['candidate', 'under_review', 'promoted', 'demoted', 'suspended', 'retired', 'active']),
    review_notes: z.string().optional(),
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

    if (!['admin', 'owner', 'superadmin'].includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { knowledge_object_id, target_status, review_notes } = parsed.data

    const { data: ko, error: koErr } = await supabase
        .from('knowledge_object')
        .select('*')
        .eq('id', knowledge_object_id)
        .single()
    if (koErr || !ko) return NextResponse.json({ error: 'Knowledge object not found' }, { status: 404 })

    if (ko.scope === 'local' && ko.partner_id !== me.org_id && me.role !== 'superadmin') {
        return NextResponse.json({ error: 'Cannot modify KB from another org' }, { status: 403 })
    }

    const current = ko.promotion_status
    const valid = VALID_TRANSITIONS[current] ?? []
    if (!valid.includes(target_status)) {
        return NextResponse.json({
            error: `Invalid transition: ${current} → ${target_status}. Valid: [${valid.join(', ')}]`,
        }, { status: 409 })
    }

    if (target_status === 'promoted') {
        if (ko.scope !== 'local' && ko.scope !== 'candidate_global') {
            return NextResponse.json({ error: 'Only local or candidate_global objects can be promoted to global' }, { status: 409 })
        }

        if (ko.cross_partner_count < PROMOTION_MIN_CROSS_PARTNER) {
            return NextResponse.json({
                error: `Promotion to global requires cross_partner_count >= ${PROMOTION_MIN_CROSS_PARTNER} (current: ${ko.cross_partner_count})`,
            }, { status: 409 })
        }
        if (ko.sample_size < PROMOTION_MIN_SAMPLE_SIZE) {
            return NextResponse.json({
                error: `Promotion to global requires sample_size >= ${PROMOTION_MIN_SAMPLE_SIZE} (current: ${ko.sample_size})`,
            }, { status: 409 })
        }
        if (Number(ko.stability_score) < PROMOTION_MIN_STABILITY) {
            return NextResponse.json({
                error: `Promotion to global requires stability_score >= ${PROMOTION_MIN_STABILITY} (current: ${ko.stability_score})`,
            }, { status: 409 })
        }
        if (ko.harmful_side_effects) {
            return NextResponse.json({ error: 'Cannot promote object with harmful side effects flag' }, { status: 409 })
        }
    }

    const updates: Record<string, any> = {
        promotion_status: target_status,
        review_notes: review_notes ?? ko.review_notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
    }

    if (target_status === 'candidate') {
        updates.scope = 'candidate_global'
    } else if (target_status === 'promoted') {
        const { data: globalCopy, error: copyErr } = await supabase
            .from('knowledge_object')
            .insert({
                partner_id: null,
                scope: 'global',
                object_type: ko.object_type,
                title: ko.title,
                description: ko.description,
                evidence_count: ko.evidence_count,
                evidence_sources: ko.evidence_sources,
                confidence: ko.confidence,
                sample_size: ko.sample_size,
                first_observed_at: ko.first_observed_at,
                last_observed_at: ko.last_observed_at,
                stability_score: ko.stability_score,
                observation_window_days: ko.observation_window_days,
                applicable_industries: ko.applicable_industries,
                applicable_geographies: ko.applicable_geographies,
                applicable_seniorities: ko.applicable_seniorities,
                applicable_offer_types: ko.applicable_offer_types,
                pattern_data: ko.pattern_data,
                recommendation: ko.recommendation,
                constraints: ko.constraints,
                locked_fields: ko.locked_fields,
                promoted_from_id: ko.id,
                promotion_status: 'active',
                cross_partner_count: ko.cross_partner_count,
                revalidation_cycle: ko.revalidation_cycle,
                next_revalidation_at: new Date(Date.now() + PROMOTION_REVALIDATION_WINDOW_MS).toISOString(),
            })
            .select('id')
            .single()

        if (copyErr) return NextResponse.json({ error: `Global copy failed: ${copyErr.message}` }, { status: 500 })

        updates.promotion_status = 'promoted'
        updates.scope = 'candidate_global'

        return NextResponse.json({
            success: true,
            transition: { from: current, to: 'promoted' },
            source_id: ko.id,
            global_copy_id: globalCopy?.id,
        })
    }

    if (target_status === 'active' && ko.scope === 'candidate_global') {
        updates.scope = 'local'
    }

    const { error: updateErr } = await supabase
        .from('knowledge_object')
        .update(updates)
        .eq('id', knowledge_object_id)

    if (updateErr) return NextResponse.json({ error: `Update failed: ${updateErr.message}` }, { status: 500 })

    return NextResponse.json({
        success: true,
        transition: { from: current, to: target_status },
        knowledge_object_id,
    })
}
