/**
 * Hydrate belief table via AI generation.
 * Uses the brain-hydrator agent template prompts.
 * AI call delegated to shared ai-caller module.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { callTemplateAI, parseAIJSON, buildSystemPrompt } from './ai-caller'

export async function hydrateBeliefs(
    supabase: SupabaseClient,
    orgId: string,
    qr: any,
    segments: any[],
    sections: any[],
    template: any
): Promise<{ created: number; per_icp: Record<string, number>; errors: string[] }> {
    const result = { created: 0, per_icp: {} as Record<string, number>, errors: [] as string[] }

    // Get ICP rows we just deployed
    const { data: icpRows } = await supabase
        .from('icp')
        .select('id, name')
        .eq('partner_id', orgId)
        .eq('status', 'active')

    if (!icpRows?.length) {
        result.errors.push('No active ICPs found — run ICP hydration first')
        return result
    }

    // Get offer ID
    const { data: offer } = await supabase
        .from('offer')
        .select('id')
        .eq('partner_id', orgId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

    // Build AI prompt
    const systemPrompt = buildSystemPrompt(template)

    const userMessage = [
        '## Generate Beliefs',
        '',
        `Company: ${qr.company_name || 'Unknown'}`,
        `Product: ${qr.core_product_description || qr.one_sentence_description || 'Not provided'}`,
        `Problem Solved: ${qr.problem_solved || 'Not provided'}`,
        `Real buy reason: ${qr.real_buy_reason || 'Not provided'}`,
        `Measurable outcomes: ${qr.measurable_outcomes || 'Not provided'}`,
        `Top differentiator: ${qr.top_differentiator || 'Not provided'}`,
        `Top objections: ${qr.top_objections || 'Not provided'}`,
        `Objection responses: ${qr.objection_responses || 'Not provided'}`,
        `Tone/voice: ${qr.tone_descriptors || 'Not provided'}`,
        '',
        `### ICP Segments (${segments.length})`,
        ...segments.map(s => [
            `- **${s.segment_name}**`,
            `  Industries: ${s.target_industries || 'Any'}`,
            `  Pain points: ${s.pain_points || 'Not specified'}`,
            `  Buying triggers: ${s.buying_triggers || 'Not specified'}`,
            `  Decision criteria: ${s.decision_criteria || 'Not specified'}`,
        ].join('\n')),
        '',
        'Generate 5-15 beliefs PER ICP. Include an "icp_name" field to map each belief.',
        'Return JSON: { "beliefs": [ { "icp_name": "...", "statement": "...", "angle": "...", "lane": "...", "confidence_score": 0.7, "allocation_weight": 0.1, "source_fields": ["..."] } ] }',
    ].join('\n')

    // Call AI
    const aiResponse = await callTemplateAI(supabase, template, systemPrompt, userMessage)
    const parsed = parseAIJSON(aiResponse)

    if (!parsed?.beliefs?.length) {
        result.errors.push('AI returned no beliefs — check prompt or model response')
        return result
    }

    // Insert beliefs with proper ICP matching
    for (const belief of parsed.beliefs) {
        // Match ICP by name (fuzzy — contains match)
        const matchedIcp = icpRows.find(i =>
            belief.icp_name && i.name.toLowerCase().includes(belief.icp_name.toLowerCase())
        ) || icpRows.find(i =>
            belief.icp_name && belief.icp_name.toLowerCase().includes(i.name.toLowerCase())
        )

        if (!matchedIcp) {
            result.errors.push(`No ICP match for belief "${belief.statement?.slice(0, 50)}" (icp_name: ${belief.icp_name})`)
            continue
        }

        // Validate required fields
        if (!belief.statement || belief.statement.length < 10) continue

        const { error } = await supabase.from('belief').insert({
            partner_id: orgId,
            statement: belief.statement,
            angle: belief.angle || 'direct_value',
            lane: belief.lane || 'primary',
            status: 'TEST',
            confidence_score: Math.min(1, Math.max(0, belief.confidence_score ?? 0.5)),
            allocation_weight: Math.min(1, Math.max(0, belief.allocation_weight ?? 0.1)),
            icp_id: matchedIcp.id,
            offer_id: offer?.id || null,
        })

        if (error) {
            result.errors.push(`Insert failed for "${belief.statement.slice(0, 40)}": ${error.message}`)
        } else {
            result.created++
            result.per_icp[matchedIcp.name] = (result.per_icp[matchedIcp.name] || 0) + 1
        }
    }

    return result
}
