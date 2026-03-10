import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MIN_PARTNERS_FOR_CANDIDATE = 2
const MIN_SAMPLE_SIZE_PER_PATTERN = 20
const MIN_CONFIDENCE_FOR_CANDIDATE = 0.5

interface NetworkLearningInput {
    objectType?: string
}

export async function runNetworkLearning(input: NetworkLearningInput) {
    const objectType = input.objectType

    let query = supabase
        .from('knowledge_object')
        .select('id, partner_id, scope, object_type, title, confidence, sample_size, stability_score, pattern_data, applicable_industries, applicable_geographies')
        .eq('scope', 'local')
        .eq('promotion_status', 'active')
        .gte('confidence', MIN_CONFIDENCE_FOR_CANDIDATE)
        .gte('sample_size', MIN_SAMPLE_SIZE_PER_PATTERN)

    if (objectType) query = query.eq('object_type', objectType)

    const { data: localObjects, error } = await query
    if (error) throw error
    if (!localObjects?.length) return { success: true, patterns_detected: 0, candidates_created: 0 }

    const patternGroups: Record<string, any[]> = {}

    for (const ko of localObjects) {
        const key = computePatternKey(ko)
        if (!patternGroups[key]) patternGroups[key] = []
        patternGroups[key].push(ko)
    }

    let patternsDetected = 0
    let candidatesCreated = 0

    for (const [patternKey, group] of Object.entries(patternGroups)) {
        const uniquePartners = new Set(group.map(g => g.partner_id))
        if (uniquePartners.size < MIN_PARTNERS_FOR_CANDIDATE) continue

        patternsDetected++

        const { data: existing } = await supabase
            .from('knowledge_object')
            .select('id')
            .eq('scope', 'candidate_global')
            .eq('title', `[Network] ${group[0].title}`)
            .eq('object_type', group[0].object_type)
            .limit(1)

        if (existing && existing.length > 0) {
            const avgConfidence = group.reduce((s, g) => s + Number(g.confidence), 0) / group.length
            const totalSamples = group.reduce((s, g) => s + g.sample_size, 0)
            const avgStability = group.reduce((s, g) => s + Number(g.stability_score), 0) / group.length

            await supabase
                .from('knowledge_object')
                .update({
                    confidence: Number(avgConfidence.toFixed(4)),
                    sample_size: totalSamples,
                    stability_score: Number(avgStability.toFixed(4)),
                    cross_partner_count: uniquePartners.size,
                    evidence_count: group.length,
                    last_observed_at: new Date().toISOString(),
                })
                .eq('id', existing[0].id)
            continue
        }

        const avgConfidence = group.reduce((s, g) => s + Number(g.confidence), 0) / group.length
        const totalSamples = group.reduce((s, g) => s + g.sample_size, 0)
        const avgStability = group.reduce((s, g) => s + Number(g.stability_score), 0) / group.length

        const mergedPatternData = mergePatternData(group.map(g => g.pattern_data))
        const allIndustries = [...new Set(group.flatMap(g => g.applicable_industries ?? []))]
        const allGeos = [...new Set(group.flatMap(g => g.applicable_geographies ?? []))]

        const { error: insertErr } = await supabase
            .from('knowledge_object')
            .insert({
                partner_id: null,
                scope: 'candidate_global',
                object_type: group[0].object_type,
                title: `[Network] ${group[0].title}`,
                description: `Cross-partner pattern detected from ${uniquePartners.size} partners, ${group.length} observations`,
                confidence: Number(avgConfidence.toFixed(4)),
                sample_size: totalSamples,
                stability_score: Number(avgStability.toFixed(4)),
                evidence_count: group.length,
                evidence_sources: group.map(g => ({ ko_id: g.id, partner_id: g.partner_id, confidence: g.confidence })),
                pattern_data: mergedPatternData,
                applicable_industries: allIndustries,
                applicable_geographies: allGeos,
                cross_partner_count: uniquePartners.size,
                promotion_status: 'active',
                revalidation_cycle: 'medium',
                next_revalidation_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })

        if (!insertErr) candidatesCreated++
    }

    return { success: true, patterns_detected: patternsDetected, candidates_created: candidatesCreated }
}

function computePatternKey(ko: any): string {
    const pd = ko.pattern_data ?? {}
    const signatureKeys = Object.keys(pd).sort().join(',')
    return `${ko.object_type}::${ko.title}::${signatureKeys}`
}

function mergePatternData(patterns: any[]): Record<string, any> {
    if (patterns.length === 0) return {}
    if (patterns.length === 1) return patterns[0]

    const merged: Record<string, any> = {}
    const allKeys = new Set(patterns.flatMap(p => Object.keys(p)))

    for (const key of allKeys) {
        const values = patterns.map(p => p[key]).filter(v => v !== undefined)
        if (values.length === 0) continue

        if (typeof values[0] === 'number') {
            merged[key] = values.reduce((s, v) => s + v, 0) / values.length
        } else if (typeof values[0] === 'string') {
            const counts: Record<string, number> = {}
            for (const v of values) counts[v] = (counts[v] ?? 0) + 1
            merged[key] = Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0]
        } else {
            merged[key] = values[0]
        }
    }

    return merged
}
