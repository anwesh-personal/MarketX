/**
 * Hydrate brain_agents.domain_prompt via AI.
 * Generates a concise business context summary from KB data
 * that becomes Layer 3 (BUSINESS CONTEXT) in PromptAssembler.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { callTemplateAI, parseAIJSON, buildSystemPrompt } from './ai-caller'

export async function hydrateDomainPrompt(
    supabase: SupabaseClient,
    orgId: string,
    qr: any,
    segments: any[],
    sections: any[],
    template: any
): Promise<{ agents_updated: number; domain_prompt_length: number; domain_prompt_preview: string }> {
    const systemPrompt = buildSystemPrompt(template)

    // Build abbreviated section summaries (capped to avoid token overflow)
    const sectionSummaries = sections
        .filter(s => s.content)
        .slice(0, 15)  // Cap at 15 sections to stay within token limits
        .map(s => `### Section ${s.section_number}: ${s.section_title}\n${s.content.slice(0, 600)}`)
        .join('\n\n')

    const userMessage = [
        '## Generate Domain Prompt Only',
        '',
        `Company: ${qr.company_name || 'Unknown'}`,
        `Description: ${qr.one_sentence_description || 'N/A'}`,
        `Product: ${qr.core_product_description || 'N/A'}`,
        `Problem Solved: ${qr.problem_solved || 'N/A'}`,
        `Differentiator: ${qr.top_differentiator || 'N/A'}`,
        `Real buy reason: ${qr.real_buy_reason || 'N/A'}`,
        `Outcomes: ${qr.measurable_outcomes || 'N/A'}`,
        `CTA: ${qr.primary_cta_type || 'N/A'}`,
        `Tone: ${qr.tone_descriptors || 'N/A'}`,
        `Banned phrases: ${qr.banned_phrases || 'None'}`,
        '',
        `### ICP Segments (${segments.length})`,
        ...segments.map(s => `- **${s.segment_name}**: targets ${s.target_industries || 'various'}, pain: ${s.pain_points || 'unspecified'}`),
        '',
        `### KB Sections (abbreviated)`,
        sectionSummaries,
        '',
        'Generate a 300-500 word business context prompt.',
        'Return JSON: { "domain_prompt": "..." }',
    ].join('\n')

    const content = await callTemplateAI(supabase, template, systemPrompt, userMessage)
    const parsed = parseAIJSON(content)

    // Extract domain prompt — from JSON or raw text
    let domainPrompt: string
    if (parsed?.domain_prompt && typeof parsed.domain_prompt === 'string') {
        domainPrompt = parsed.domain_prompt
    } else {
        // AI didn't return JSON — use the raw response (trim markdown artifacts)
        domainPrompt = content
            .replace(/^```[\s\S]*?```/gm, '')
            .replace(/^#+\s+/gm, '')
            .trim()
            .slice(0, 2000)
    }

    if (domainPrompt.length < 50) {
        throw new Error(`Domain prompt too short (${domainPrompt.length} chars) — AI likely failed to generate meaningful content`)
    }

    // Update ALL brain_agents for this org
    const { data: agents } = await supabase
        .from('brain_agents')
        .select('id')
        .eq('org_id', orgId)

    let updated = 0
    for (const agent of (agents || [])) {
        const { error } = await supabase
            .from('brain_agents')
            .update({ domain_prompt: domainPrompt })
            .eq('id', agent.id)

        if (!error) updated++
    }

    return {
        agents_updated: updated,
        domain_prompt_length: domainPrompt.length,
        domain_prompt_preview: domainPrompt.slice(0, 200) + (domainPrompt.length > 200 ? '...' : ''),
    }
}
