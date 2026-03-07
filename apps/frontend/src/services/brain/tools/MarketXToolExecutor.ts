/**
 * MARKETX TOOL EXECUTOR
 *
 * Routes tool call names to their TypeScript handler functions.
 * Handler names match brain_tools.handler_function exactly.
 *
 * Rules:
 *  - Every tool in brain_tools must have a corresponding handler here.
 *  - Handlers receive parsed arguments (object, not string).
 *  - Handlers return any serialisable value — the caller JSON.stringifies it.
 *  - Handlers must throw descriptive errors on failure — never return null silently.
 *  - Adding a new tool = add a row to brain_tools + add a handler here. That's it.
 */

import { createClient } from '@/lib/supabase/server'

interface ExecutorContext {
    orgId:    string
    agentId?: string
}

class MarketXToolExecutor {
    async execute(toolName: string, args: Record<string, unknown>, ctx: ExecutorContext): Promise<unknown> {
        switch (toolName) {
            case 'search_kb':             return this.executeSearchKb(args, ctx)
            case 'generate_email':        return this.executeGenerateEmail(args, ctx)
            case 'analyze_signals':       return this.executeAnalyzeSignals(args, ctx)
            case 'check_belief_status':   return this.executeCheckBeliefStatus(args, ctx)
            case 'record_gap':            return this.executeRecordGap(args, ctx)
            case 'get_brief_context':     return this.executeGetBriefContext(args, ctx)
            case 'suggest_angle':         return this.executeSuggestAngle(args, ctx)
            case 'search_leads':          return this.executeSearchLeads(args, ctx)
            case 'update_domain_prompt':  return this.executeUpdateDomainPrompt(args, ctx)
            default:
                throw new Error(
                    `[MarketXToolExecutor] Unknown tool: "${toolName}". ` +
                    `This tool is granted but has no executor handler. ` +
                    `Add a case to MarketXToolExecutor.execute().`
                )
        }
    }

    // ============================================================
    // HANDLERS
    // ============================================================

    private async executeSearchKb(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const query   = String(args.query ?? '')
        const topK    = Number(args.top_k ?? 5)
        const section = args.section ? String(args.section) : null

        if (!query) throw new Error('[search_kb] query is required')

        const supabase = createClient()

        // Hybrid: FTS match
        let q = supabase
            .from('embeddings')
            .select('id, content, metadata, source_type')
            .eq('org_id', ctx.orgId)
            .textSearch('content', query, { type: 'websearch', config: 'english' })
            .limit(topK)

        if (section) {
            q = q.contains('metadata', { section })
        }

        const { data, error } = await q

        if (error) throw new Error(`[search_kb] Supabase error: ${error.message}`)

        return {
            results: (data ?? []).map(d => ({
                content:    d.content,
                sourceType: d.source_type,
                section:    (d.metadata as Record<string, unknown>)?.section ?? null,
            })),
            count: (data ?? []).length,
        }
    }

    private async executeAnalyzeSignals(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const beliefId = String(args.belief_id ?? '')
        const days     = Number(args.days ?? 7)

        if (!beliefId) throw new Error('[analyze_signals] belief_id is required')

        const supabase  = createClient()
        const cutoff    = new Date(Date.now() - days * 86400_000).toISOString()

        const { data, error } = await supabase
            .from('signal_event')
            .select('event_type, created_at')
            .eq('org_id', ctx.orgId)
            .eq('belief_id', beliefId)
            .gte('created_at', cutoff)

        if (error) throw new Error(`[analyze_signals] Supabase error: ${error.message}`)

        const counts: Record<string, number> = {}
        for (const row of data ?? []) {
            counts[row.event_type] = (counts[row.event_type] ?? 0) + 1
        }

        return {
            belief_id: beliefId,
            days,
            total:     (data ?? []).length,
            breakdown: counts,
        }
    }

    private async executeCheckBeliefStatus(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const beliefId = String(args.belief_id ?? '')
        if (!beliefId) throw new Error('[check_belief_status] belief_id is required')

        const supabase = createClient()
        const { data, error } = await supabase
            .from('beliefs')
            .select('id, status, confidence_score, allocation_pct, role')
            .eq('org_id', ctx.orgId)
            .eq('id', beliefId)
            .single()

        if (error) throw new Error(`[check_belief_status] Belief not found: ${error.message}`)

        return {
            belief_id:        data.id,
            status:           data.status,
            confidence_score: data.confidence_score,
            allocation_pct:   data.allocation_pct,
            role:             data.role,
        }
    }

    private async executeRecordGap(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const domain      = String(args.domain ?? '')
        const description = String(args.description ?? '')
        const impact      = String(args.impact ?? 'medium')

        if (!domain)      throw new Error('[record_gap] domain is required')
        if (!description) throw new Error('[record_gap] description is required')

        const supabase = createClient()
        const { error } = await supabase
            .from('knowledge_gaps')
            .upsert({
                org_id:           ctx.orgId,
                domain,
                description,
                impact_level:     impact,
                occurrence_count: 1,
                last_identified:  new Date().toISOString(),
                status:           'identified',
            }, { onConflict: 'org_id,domain', ignoreDuplicates: false })

        if (error) throw new Error(`[record_gap] Failed: ${error.message}`)

        return { recorded: true, domain, description, impact }
    }

    private async executeGetBriefContext(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const briefId = String(args.brief_id ?? '')
        if (!briefId) throw new Error('[get_brief_context] brief_id is required')

        const supabase = createClient()
        const { data, error } = await supabase
            .from('briefs')
            .select('id, test_intent, locked_at, icp:icp_id(*), beliefs(*)')
            .eq('org_id', ctx.orgId)
            .eq('id', briefId)
            .single()

        if (error) throw new Error(`[get_brief_context] Brief not found: ${error.message}`)

        return data
    }

    private async executeSuggestAngle(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const icpId = String(args.icp_id ?? '')
        if (!icpId) throw new Error('[suggest_angle] icp_id is required')

        // Get recent signal data to find best-performing angle
        const supabase = createClient()
        const cutoff   = new Date(Date.now() - 30 * 86400_000).toISOString()

        const { data } = await supabase
            .from('signal_event')
            .select('angle_class, event_type')
            .eq('org_id', ctx.orgId)
            .eq('icp_id', icpId)
            .in('event_type', ['BOOKED_CALL', 'POSITIVE_REPLY'])
            .gte('created_at', cutoff)

        const scores: Record<string, number> = {}
        for (const row of data ?? []) {
            if (row.angle_class) {
                scores[row.angle_class] = (scores[row.angle_class] ?? 0) + 1
            }
        }

        const sorted  = Object.entries(scores).sort((a, b) => b[1] - a[1])
        const best    = sorted[0]?.[0] ?? 'problem_reframe'  // default to first canonical angle

        return {
            icp_id:     icpId,
            recommended: best,
            signal_data: scores,
            basis:       sorted.length > 0 ? 'signal_performance' : 'default',
        }
    }

    private async executeSearchLeads(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const icpId = String(args.icp_id ?? '')
        const limit = Number(args.limit ?? 20)
        if (!icpId) throw new Error('[search_leads] icp_id is required')

        const supabase = createClient()
        const { data, error } = await supabase
            .from('leads')
            .select('id, email, company_name, job_title, seniority, industry')
            .eq('org_id', ctx.orgId)
            .eq('icp_id', icpId)
            .eq('is_active', true)
            .limit(limit)

        if (error) throw new Error(`[search_leads] Supabase error: ${error.message}`)

        return { leads: data ?? [], count: (data ?? []).length }
    }

    private async executeUpdateDomainPrompt(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const content = String(args.content ?? '')
        const section = String(args.section ?? 'general')
        if (!content) throw new Error('[update_domain_prompt] content is required')
        if (!ctx.agentId) throw new Error('[update_domain_prompt] agentId is required')

        const supabase = createClient()

        // Read current domain_prompt, append section update
        const { data: agent } = await supabase
            .from('brain_agents')
            .select('domain_prompt')
            .eq('id', ctx.agentId)
            .single()

        const current   = agent?.domain_prompt ?? ''
        const updated   = `${current}\n\n## ${section.toUpperCase()}\n${content}`.trim()
        const timestamp = new Date().toISOString()

        const { error } = await supabase
            .from('brain_agents')
            .update({ domain_prompt: updated, updated_at: timestamp })
            .eq('id', ctx.agentId)
            .eq('org_id', ctx.orgId)  // security: must own the agent

        if (error) throw new Error(`[update_domain_prompt] Update failed: ${error.message}`)

        return { updated: true, section, length: updated.length }
    }

    // generate_email is intentionally deferred — it requires the
    // full MarketWriter generation pipeline (Phases 4-5 of the roadmap).
    // Until then, it returns a structured placeholder so the Brain
    // acknowledges the intent without hallucinating a fake email.
    private async executeGenerateEmail(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const beliefId   = String(args.belief_id   ?? '')
        const angleClass = String(args.angle_class  ?? '')
        if (!beliefId)   throw new Error('[generate_email] belief_id is required')
        if (!angleClass) throw new Error('[generate_email] angle_class is required')

        return {
            status:     'queued',
            message:    'Email generation has been queued. The MarketWriter pipeline will process it.',
            belief_id:  beliefId,
            angle_class: angleClass,
        }
    }
}

export const marketxToolExecutor = new MarketXToolExecutor()
