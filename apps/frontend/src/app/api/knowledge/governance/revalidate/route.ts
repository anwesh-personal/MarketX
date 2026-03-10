import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CYCLE_DAYS: Record<string, number> = { fast: 7, medium: 30, slow: 90 }

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

    let body: { scope?: string; org_id?: string } = {}
    try { body = await req.json() } catch { /* optional */ }

    const now = new Date().toISOString()

    let query = supabase
        .from('knowledge_object')
        .select('id, scope, partner_id, object_type, confidence, sample_size, stability_score, revalidation_cycle, last_observed_at, next_revalidation_at, evidence_count')
        .eq('promotion_status', 'active')
        .lte('next_revalidation_at', now)

    if (body.scope) query = query.eq('scope', body.scope)
    const targetOrg = me.role === 'superadmin' && body.org_id ? body.org_id : me.org_id
    if (body.scope === 'local') query = query.eq('partner_id', targetOrg)

    const { data: dueObjects, error: fetchErr } = await query
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    if (!dueObjects?.length) {
        return NextResponse.json({ success: true, revalidated: 0, message: 'No objects due for revalidation' })
    }

    let revalidated = 0
    let suspended = 0
    let demoted = 0

    for (const ko of dueObjects) {
        const cycleDays = CYCLE_DAYS[ko.revalidation_cycle] ?? 30
        const daysSinceObserved = (Date.now() - new Date(ko.last_observed_at).getTime()) / (1000 * 60 * 60 * 24)

        let newStatus = 'active'
        let newCycle = ko.revalidation_cycle

        if (daysSinceObserved > cycleDays * 3 && ko.evidence_count < 3) {
            newStatus = 'suspended'
            suspended++
        } else if (Number(ko.stability_score) < 0.3 && Number(ko.confidence) < 0.4) {
            newStatus = 'demoted'
            demoted++
        } else {
            if (Number(ko.confidence) > 0.8 && Number(ko.stability_score) > 0.7) {
                newCycle = 'slow'
            } else if (Number(ko.confidence) < 0.5) {
                newCycle = 'fast'
            } else {
                newCycle = 'medium'
            }
        }

        const nextRevalidation = new Date(Date.now() + (CYCLE_DAYS[newCycle] ?? 30) * 24 * 60 * 60 * 1000).toISOString()

        await supabase
            .from('knowledge_object')
            .update({
                promotion_status: newStatus,
                revalidation_cycle: newCycle,
                next_revalidation_at: nextRevalidation,
                review_notes: newStatus !== 'active'
                    ? `Auto-revalidation: ${newStatus} (days since observed: ${Math.round(daysSinceObserved)}, confidence: ${ko.confidence}, stability: ${ko.stability_score})`
                    : ko.review_notes,
            })
            .eq('id', ko.id)

        revalidated++
    }

    return NextResponse.json({
        success: true,
        revalidated,
        suspended,
        demoted,
        still_active: revalidated - suspended - demoted,
    })
}
