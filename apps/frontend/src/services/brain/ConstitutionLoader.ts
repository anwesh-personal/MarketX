/**
 * CONSTITUTION LOADER
 *
 * Loads the active constitution and its rules for an organization.
 * Single source of truth — used by brain/chat, superadmin/agent-chat,
 * and any future route that needs org constitution enforcement.
 *
 * Rules are returned with full metadata (rule_type, enforcement_level)
 * so the caller (PromptAssembler) can group them semantically.
 */

import { createClient } from '@/lib/supabase/server'

export interface ConstitutionRule {
    content: string
    ruleType: 'brand_voice' | 'compliance' | 'forbidden' | 'required' | 'style' | 'format'
    enforcementLevel: 'strict' | 'soft' | 'advisory'
}

/**
 * Load active constitution rules for an organization.
 *
 * Flow:
 *  1. Find the org's most-recently-updated active constitution.
 *  2. Fetch all active rules for that constitution, ordered by priority.
 *  3. Return enriched rule objects for semantic grouping by the PromptAssembler.
 *
 * Returns [] if no constitution or rules exist — never throws.
 */
export async function loadConstitutionRules(orgId: string): Promise<ConstitutionRule[]> {
    try {
        const supabase = createClient()

        const { data: constitution, error: constitutionError } = await supabase
            .from('constitutions')
            .select('id')
            .eq('org_id', orgId)
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (constitutionError || !constitution?.id) {
            return []
        }

        const { data: rules, error: rulesError } = await supabase
            .from('constitution_rules')
            .select('rule_content, rule_type, enforcement_level')
            .eq('constitution_id', constitution.id)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .order('priority', { ascending: true })

        if (rulesError || !rules?.length) {
            return []
        }

        return rules
            .filter(r => (r.rule_content ?? '').trim())
            .map(r => ({
                content: r.rule_content.trim(),
                ruleType: r.rule_type ?? 'required',
                enforcementLevel: r.enforcement_level ?? 'strict',
            }))
    } catch (err) {
        console.error('[ConstitutionLoader] Failed to load rules:', err)
        return []
    }
}
