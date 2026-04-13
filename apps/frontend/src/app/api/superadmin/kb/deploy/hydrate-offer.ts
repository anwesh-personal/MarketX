/**
 * Hydrate offer table from questionnaire data.
 * Field mappings read from config.offer_mapping.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function hydrateOffer(
    supabase: SupabaseClient,
    orgId: string,
    qr: any,
    config: any
): Promise<{ action: 'created' | 'updated' | 'skipped'; offer_id: string | null }> {
    const mapping = config.offer_mapping
    if (!mapping) return { action: 'skipped', offer_id: null }

    // Build offer row from mapped fields
    const offerData: Record<string, any> = { partner_id: orgId, status: 'active' }

    for (const [offerField, qrField] of Object.entries(mapping)) {
        const value = qr[qrField as string]
        if (value !== null && value !== undefined) {
            offerData[offerField] = value
        }
    }

    // Fallback name
    if (!offerData.name) offerData.name = qr.company_name || 'Primary Offer'

    // Check if offer exists
    const { data: existing } = await supabase
        .from('offer')
        .select('id')
        .eq('partner_id', orgId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

    if (existing) {
        await supabase.from('offer').update(offerData).eq('id', existing.id)
        return { action: 'updated', offer_id: existing.id }
    }

    const { data: created } = await supabase
        .from('offer')
        .insert(offerData)
        .select('id')
        .single()

    return { action: 'created', offer_id: created?.id || null }
}
