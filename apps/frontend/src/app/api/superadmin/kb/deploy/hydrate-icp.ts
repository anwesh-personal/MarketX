/**
 * Hydrate ICP table from kb_icp_segments.
 * Field mappings read from config.icp_mapping.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function hydrateICP(
    supabase: SupabaseClient,
    orgId: string,
    segments: any[],
    config: any
): Promise<{ created: number; updated: number; skipped: number }> {
    const mapping = config.icp_mapping
    if (!mapping) return { created: 0, updated: 0, skipped: 0 }

    let created = 0, updated = 0, skipped = 0

    for (const seg of segments) {
        // Build criteria JSONB from mapped fields
        const criteria: Record<string, any> = {}
        for (const field of (mapping.criteria_fields || [])) {
            if (seg[field] !== null && seg[field] !== undefined) {
                criteria[field] = seg[field]
            }
        }

        // Add buying roles to criteria
        const buyingRoles: Record<string, any> = {}
        if (seg.economic_buyer_title) buyingRoles.economic_buyer = { title: seg.economic_buyer_title, concerns: seg.economic_buyer_concerns }
        if (seg.champion_title) buyingRoles.champion = { title: seg.champion_title, motivations: seg.champion_motivations }
        if (seg.operational_owner_title) buyingRoles.operational_owner = { title: seg.operational_owner_title, concerns: seg.operational_owner_concerns }
        if (seg.technical_evaluator_title) buyingRoles.technical_evaluator = { title: seg.technical_evaluator_title, focus: seg.technical_evaluator_focus }
        if (seg.resistor_description) buyingRoles.resistor = { description: seg.resistor_description }
        if (Object.keys(buyingRoles).length > 0) criteria.buying_roles = buyingRoles

        const nameField = mapping.name || 'segment_name'
        const icpName = seg[nameField] || `Segment ${seg.sort_order + 1}`

        // Check if ICP already exists for this org + name
        const { data: existing } = await supabase
            .from('icp')
            .select('id')
            .eq('partner_id', orgId)
            .eq('name', icpName)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase
                .from('icp')
                .update({ criteria, status: 'active' })
                .eq('id', existing.id)
            if (error) { skipped++; continue }
            updated++
        } else {
            const { error } = await supabase
                .from('icp')
                .insert({ partner_id: orgId, name: icpName, criteria, status: 'active' })
            if (error) { skipped++; continue }
            created++
        }
    }

    return { created, updated, skipped }
}
