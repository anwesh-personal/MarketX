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
 *
 * RS:OS Schema Notes:
 *  - RS:OS tables use `partner_id` (NOT `org_id`).
 *  - `partner.id = organizations.id` (1:1 mapping).
 *  - Table names: `belief` (not beliefs), `brief` (not briefs), `signal_event`, `icp`, `offer`, `flow`.
 *  - When querying RS:OS tables, use `partner_id` and pass `ctx.orgId` (they are equivalent).
 */

import { createClient } from '@/lib/supabase/server'
import { queues } from '@/lib/worker-queues'
import { randomUUID } from 'crypto'

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
            case 'get_icp_context':       return this.executeGetIcpContext(args, ctx)
            case 'list_active_beliefs':      return this.executeListActiveBeliefs(args, ctx)
            case 'get_campaign_insights':    return this.executeGetCampaignInsights(args, ctx)
            case 'get_self_reflection':      return this.executeGetSelfReflection(args, ctx)
            case 'get_knowledge_gaps':       return this.executeGetKnowledgeGaps(args, ctx)
            case 'get_brain_health':         return this.executeGetBrainHealth(args, ctx)
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

    /**
     * Search the organization's knowledge base using hybrid FTS.
     * Uses `embeddings` table which is org-scoped via `org_id`.
     */
    private async executeSearchKb(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const query   = String(args.query ?? '')
        const topK    = Number(args.top_k ?? 5)
        const section = args.section ? String(args.section) : null

        if (!query) throw new Error('[search_kb] query is required')

        const supabase = createClient()

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

    /**
     * Analyze signal events for a belief over a time period.
     * RS:OS table: `signal_event` uses `partner_id` (= org_id).
     */
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
            .select('event_type, occurred_at')
            .eq('partner_id', ctx.orgId)
            .eq('belief_id', beliefId)
            .gte('occurred_at', cutoff)

        if (error) throw new Error(`[analyze_signals] Supabase error: ${error.message}`)

        const counts: Record<string, number> = {}
        for (const row of data ?? []) {
            counts[row.event_type] = (counts[row.event_type] ?? 0) + 1
        }

        const total = (data ?? []).length
        const sends = counts['send'] ?? 0
        const opens = counts['open'] ?? 0
        const clicks = counts['click'] ?? 0
        const replies = counts['reply'] ?? 0
        const bookings = counts['booking'] ?? 0

        return {
            belief_id: beliefId,
            days,
            total,
            breakdown: counts,
            metrics: {
                open_rate: sends > 0 ? (opens / sends * 100).toFixed(2) + '%' : 'N/A',
                click_rate: sends > 0 ? (clicks / sends * 100).toFixed(2) + '%' : 'N/A',
                reply_rate: sends > 0 ? (replies / sends * 100).toFixed(2) + '%' : 'N/A',
                booking_rate: sends > 0 ? (bookings / sends * 100).toFixed(2) + '%' : 'N/A',
            }
        }
    }

    /**
     * Check the status and metrics of a specific belief.
     * RS:OS table: `belief` uses `partner_id` (= org_id).
     */
    private async executeCheckBeliefStatus(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const beliefId = String(args.belief_id ?? '')
        if (!beliefId) throw new Error('[check_belief_status] belief_id is required')

        const supabase = createClient()
        const { data, error } = await supabase
            .from('belief')
            .select('id, statement, angle, lane, status, confidence_score, allocation_weight, brief_id, icp_id, offer_id')
            .eq('partner_id', ctx.orgId)
            .eq('id', beliefId)
            .single()

        if (error) throw new Error(`[check_belief_status] Belief not found: ${error.message}`)

        return {
            belief_id:         data.id,
            statement:         data.statement,
            angle:             data.angle,
            lane:              data.lane,
            status:            data.status,
            confidence_score:  data.confidence_score,
            allocation_weight: data.allocation_weight,
            brief_id:          data.brief_id,
            icp_id:            data.icp_id,
            offer_id:          data.offer_id,
        }
    }

    /**
     * Record a knowledge gap identified during conversation.
     * Uses `knowledge_gaps` table which is org-scoped via `org_id`.
     */
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

    /**
     * Get full context for a brief including ICP and beliefs.
     * RS:OS table: `brief` uses `partner_id` (= org_id).
     */
    private async executeGetBriefContext(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const briefId = String(args.brief_id ?? '')
        if (!briefId) throw new Error('[get_brief_context] brief_id is required')

        const supabase = createClient()
        
        const { data: brief, error: briefError } = await supabase
            .from('brief')
            .select('id, title, hypothesis, locked_fields, status, offer_id, icp_id')
            .eq('partner_id', ctx.orgId)
            .eq('id', briefId)
            .single()

        if (briefError) throw new Error(`[get_brief_context] Brief not found: ${briefError.message}`)

        const { data: beliefs } = await supabase
            .from('belief')
            .select('id, statement, angle, lane, status, confidence_score, allocation_weight')
            .eq('partner_id', ctx.orgId)
            .eq('brief_id', briefId)
            .order('confidence_score', { ascending: false })

        let icpData = null
        if (brief.icp_id) {
            const { data: icp } = await supabase
                .from('icp')
                .select('id, name, criteria, status')
                .eq('partner_id', ctx.orgId)
                .eq('id', brief.icp_id)
                .single()
            icpData = icp
        }

        let offerData = null
        if (brief.offer_id) {
            const { data: offer } = await supabase
                .from('offer')
                .select('id, name, category, primary_promise, status')
                .eq('partner_id', ctx.orgId)
                .eq('id', brief.offer_id)
                .single()
            offerData = offer
        }

        return {
            brief: {
                id:            brief.id,
                title:         brief.title,
                hypothesis:    brief.hypothesis,
                locked_fields: brief.locked_fields,
                status:        brief.status,
            },
            icp:     icpData,
            offer:   offerData,
            beliefs: beliefs ?? [],
            belief_count: (beliefs ?? []).length,
        }
    }

    /**
     * Suggest the best angle for an ICP based on signal performance.
     * RS:OS table: `signal_event` uses `partner_id` (= org_id).
     */
    private async executeSuggestAngle(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const icpId = String(args.icp_id ?? '')
        if (!icpId) throw new Error('[suggest_angle] icp_id is required')

        const supabase = createClient()
        const cutoff   = new Date(Date.now() - 30 * 86400_000).toISOString()

        const { data } = await supabase
            .from('signal_event')
            .select('belief_id, event_type')
            .eq('partner_id', ctx.orgId)
            .eq('icp_id', icpId)
            .in('event_type', ['booking', 'reply'])
            .gte('occurred_at', cutoff)

        const beliefScores: Record<string, number> = {}
        for (const row of data ?? []) {
            if (row.belief_id) {
                const weight = row.event_type === 'booking' ? 3 : 1
                beliefScores[row.belief_id] = (beliefScores[row.belief_id] ?? 0) + weight
            }
        }

        const sortedBeliefs = Object.entries(beliefScores).sort((a, b) => b[1] - a[1])
        const topBeliefId = sortedBeliefs[0]?.[0]

        let recommendedAngle = 'problem_reframe'
        let basis = 'default'

        if (topBeliefId) {
            const { data: belief } = await supabase
                .from('belief')
                .select('angle')
                .eq('id', topBeliefId)
                .single()
            
            if (belief?.angle) {
                recommendedAngle = belief.angle
                basis = 'signal_performance'
            }
        }

        return {
            icp_id:      icpId,
            recommended: recommendedAngle,
            basis,
            signal_data: beliefScores,
            top_belief:  topBeliefId ?? null,
        }
    }

    /**
     * Search leads for an ICP.
     * Uses `leads` table which is org-scoped via `org_id`.
     */
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

    /**
     * Update the domain prompt for the brain agent.
     * Uses `brain_agents` table which is org-scoped via `org_id`.
     */
    private async executeUpdateDomainPrompt(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const content = String(args.content ?? '')
        const section = String(args.section ?? 'general')
        if (!content) throw new Error('[update_domain_prompt] content is required')
        if (!ctx.agentId) throw new Error('[update_domain_prompt] agentId is required')

        const supabase = createClient()

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
            .eq('org_id', ctx.orgId)

        if (error) throw new Error(`[update_domain_prompt] Update failed: ${error.message}`)

        return { updated: true, section, length: updated.length }
    }

    /**
     * Get ICP context including criteria and associated offers.
     * RS:OS table: `icp` uses `partner_id` (= org_id).
     */
    private async executeGetIcpContext(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const icpId = String(args.icp_id ?? '')
        if (!icpId) throw new Error('[get_icp_context] icp_id is required')

        const supabase = createClient()
        
        const { data: icp, error } = await supabase
            .from('icp')
            .select('id, name, criteria, status, offer_id')
            .eq('partner_id', ctx.orgId)
            .eq('id', icpId)
            .single()

        if (error) throw new Error(`[get_icp_context] ICP not found: ${error.message}`)

        let offerData = null
        if (icp.offer_id) {
            const { data: offer } = await supabase
                .from('offer')
                .select('id, name, category, primary_promise')
                .eq('partner_id', ctx.orgId)
                .eq('id', icp.offer_id)
                .single()
            offerData = offer
        }

        const { data: beliefs } = await supabase
            .from('belief')
            .select('id, statement, angle, status, confidence_score')
            .eq('partner_id', ctx.orgId)
            .eq('icp_id', icpId)
            .in('status', ['TEST', 'SW', 'IW', 'RW', 'GW'])
            .order('confidence_score', { ascending: false })
            .limit(5)

        return {
            icp: {
                id:       icp.id,
                name:     icp.name,
                criteria: icp.criteria,
                status:   icp.status,
            },
            offer:        offerData,
            top_beliefs:  beliefs ?? [],
        }
    }

    /**
     * List active beliefs for the organization.
     * RS:OS table: `belief` uses `partner_id` (= org_id).
     */
    private async executeListActiveBeliefs(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const limit = Number(args.limit ?? 10)
        const icpId = args.icp_id ? String(args.icp_id) : null
        const status = args.status ? String(args.status) : null

        const supabase = createClient()
        
        let query = supabase
            .from('belief')
            .select('id, statement, angle, lane, status, confidence_score, allocation_weight, icp_id, offer_id, brief_id')
            .eq('partner_id', ctx.orgId)
            .order('confidence_score', { ascending: false })
            .limit(limit)

        if (icpId) {
            query = query.eq('icp_id', icpId)
        }

        if (status) {
            query = query.eq('status', status)
        } else {
            query = query.in('status', ['TEST', 'SW', 'IW', 'RW', 'GW'])
        }

        const { data, error } = await query

        if (error) throw new Error(`[list_active_beliefs] Supabase error: ${error.message}`)

        return {
            beliefs: data ?? [],
            count: (data ?? []).length,
        }
    }

    /**
     * Generate email using the workflow engine.
     * Resolves belief context from RS:OS tables using `partner_id`.
     */
    private async executeGenerateEmail(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const beliefId   = String(args.belief_id ?? '')
        const angleClass = String(args.angle_class ?? '')
        const emailCount = Math.max(1, Math.min(10, Number(args.email_count ?? 5)))
        const flowGoal   = String(args.flow_goal ?? 'MEANINGFUL_REPLY')
        let icpId        = String(args.icp_id ?? '')
        let offerId      = String(args.offer_id ?? '')

        if (!beliefId) throw new Error('[generate_email] belief_id is required')
        if (!angleClass) throw new Error('[generate_email] angle_class is required')

        if (!icpId || !offerId) {
            const beliefContext = await this.resolveBeliefContext(beliefId, ctx.orgId)
            icpId = icpId || beliefContext.icpId || ''
            offerId = offerId || beliefContext.offerId || ''
        }

        if (!icpId || !offerId) {
            throw new Error(
                '[generate_email] Could not resolve icp_id/offer_id. Provide them explicitly or ensure belief has both fields.'
            )
        }

        const supabase = createClient()
        const WRITER_TEMPLATE_NAME = 'Email Nurture Flow'

        let { data: template } = await supabase
            .from('workflow_templates')
            .select('id, name, nodes, edges, status')
            .eq('status', 'active')
            .ilike('name', `%${WRITER_TEMPLATE_NAME}%`)
            .limit(1)
            .maybeSingle()

        if (!template) {
            const { data: fallback } = await supabase
                .from('workflow_templates')
                .select('id, name, nodes, edges, status')
                .eq('status', 'active')
                .limit(1)
                .maybeSingle()
            template = fallback
        }
        if (!template) {
            throw new Error('[generate_email] No active email workflow template found. Contact admin.')
        }

        const templateId = template.id

        let { data: engine } = await supabase
            .from('engine_instances')
            .select('id, name, config, status')
            .eq('org_id', ctx.orgId)
            .eq('template_id', templateId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!engine) {
            const { data: createdEngine, error: createEngineError } = await supabase
                .from('engine_instances')
                .insert({
                    name: `Email Flow Generator - ${ctx.orgId.slice(0, 8)}`,
                    template_id: templateId,
                    org_id: ctx.orgId,
                    status: 'active',
                    config: {
                        flowConfig: {
                            nodes: template.nodes,
                            edges: template.edges
                        }
                    }
                })
                .select('id, name, config, status')
                .single()

            if (createEngineError || !createdEngine) {
                throw new Error(`[generate_email] Failed to create engine: ${createEngineError?.message ?? 'unknown'}`)
            }
            engine = createdEngine
        }

        const executionId = randomUUID()
        const inputPayload = {
            trigger: 'brain_tool',
            prompt: String(args.user_instruction ?? ''),
            writer_input: {
                belief_id: beliefId,
                angle_class: angleClass,
                icp_id: icpId,
                offer_id: offerId,
                email_count: emailCount,
                flow_goal: flowGoal,
            },
            belief_id: beliefId,
            angle_class: angleClass,
            icp_id: icpId,
            offer_id: offerId,
            email_count: emailCount,
            flow_goal: flowGoal,
            user_instruction: String(args.user_instruction ?? ''),
        }

        const { error: runLogError } = await supabase
            .from('engine_run_logs')
            .insert({
                id: executionId,
                engine_id: engine.id,
                org_id: ctx.orgId,
                input_data: inputPayload,
                status: 'started',
                started_at: new Date().toISOString(),
            })

        if (runLogError) {
            throw new Error(`[generate_email] Failed to create run log: ${runLogError.message}`)
        }

        const job = await queues.engineExecution.add(
            'engine-execution',
            {
                executionId,
                engineId: engine.id,
                engine: {
                    id: engine.id,
                    name: engine.name,
                    config: engine.config,
                    status: engine.status,
                },
                userId: ctx.agentId || 'brain-agent',
                orgId: ctx.orgId,
                input: inputPayload,
                options: {
                    tier: 'pro',
                    timeout: 300000,
                },
            },
            {
                jobId: `brain-email-${executionId}`
            }
        )

        return {
            status: 'queued',
            message: 'Email generation job queued to engine-execution worker.',
            execution_id: executionId,
            queue_job_id: job.id,
            engine_id: engine.id,
            template_id: templateId,
            belief_id: beliefId,
            angle_class: angleClass,
            icp_id: icpId,
            offer_id: offerId,
            email_count: emailCount,
            flow_goal: flowGoal,
        }
    }

    /**
     * Resolve ICP and Offer IDs from a belief record.
     * RS:OS table: `belief` uses `partner_id` (= org_id).
     */
    private async resolveBeliefContext(
        beliefId: string,
        orgId: string
    ): Promise<{ icpId: string | null; offerId: string | null }> {
        const supabase = createClient()

        const { data } = await supabase
            .from('belief')
            .select('icp_id, offer_id')
            .eq('partner_id', orgId)
            .eq('id', beliefId)
            .limit(1)
            .maybeSingle()

        if (data) {
            return {
                icpId: data.icp_id ?? null,
                offerId: data.offer_id ?? null,
            }
        }

        return { icpId: null, offerId: null }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NEW: CAMPAIGN INSIGHTS — user asks "how are my emails doing?"
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Aggregate signal_event for last N days, compute rates, surface top beliefs.
     * User can ask Brain: "How are my campaigns performing?" and get real data.
     */
    private async executeGetCampaignInsights(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const days      = Number(args.days ?? 30)
        const supabase  = createClient()
        const cutoff    = new Date(Date.now() - days * 86400_000).toISOString()

        const { data, error } = await supabase
            .from('signal_event')
            .select('event_type, belief_id, occurred_at, source')
            .eq('partner_id', ctx.orgId)
            .gte('occurred_at', cutoff)
            .order('occurred_at', { ascending: false })
            .limit(5000)

        if (error) throw new Error(`[get_campaign_insights] ${error.message}`)

        const events = data ?? []
        const counts: Record<string, number> = {}
        const byBelief: Record<string, Record<string, number>> = {}
        const byProvider: Record<string, number> = {}

        for (const e of events) {
            counts[e.event_type] = (counts[e.event_type] || 0) + 1
            if (e.belief_id) {
                if (!byBelief[e.belief_id]) byBelief[e.belief_id] = {}
                byBelief[e.belief_id][e.event_type] = (byBelief[e.belief_id][e.event_type] || 0) + 1
            }
            if (e.source) byProvider[e.source] = (byProvider[e.source] || 0) + 1
        }

        const sent       = counts['send']      || 0
        const opens      = counts['open']       || 0
        const clicks     = counts['click']      || 0
        const replies    = counts['reply']      || 0
        const bounces    = counts['bounce']     || 0
        const complaints = counts['complaint']  || 0

        // Top performing beliefs by reply rate
        const beliefScores = Object.entries(byBelief).map(([id, c]) => {
            const s = c['send'] || 0
            return { beliefId: id, sent: s, replies: c['reply'] || 0, clicks: c['click'] || 0, replyRate: s ? (c['reply'] || 0) / s : 0 }
        }).sort((a, b) => b.replyRate - a.replyRate).slice(0, 5)

        return {
            period:   `Last ${days} days`,
            totalEvents: events.length,
            metrics: {
                sent, opens, clicks, replies, bounces, complaints,
                openRate:    sent ? opens   / sent : 0,
                clickRate:   sent ? clicks  / sent : 0,
                replyRate:   sent ? replies / sent : 0,
                bounceRate:  sent ? bounces / sent : 0,
            },
            topBeliefs: beliefScores,
            providerBreakdown: byProvider,
            summary: sent === 0
                ? 'No email activity found for this period. Make sure your email provider is connected and campaigns are tagged with tracking IDs.'
                : `Sent ${sent} emails. Open rate: ${((opens / sent) * 100).toFixed(1)}%, Click rate: ${((clicks / sent) * 100).toFixed(1)}%, Reply rate: ${((replies / sent) * 100).toFixed(1)}%.`,
        }
    }

    /**
     * Fetch latest brain self-reflections.
     * User can ask: "What has the Brain been learning recently?" or "How confident are you?"
     */
    private async executeGetSelfReflection(
        args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const limit    = Number(args.limit ?? 3)
        const supabase = createClient()

        const { data: reflections, error: rErr } = await supabase
            .from('brain_reflections')
            .select('reflection_type, quality_score, what_went_well, what_could_improve, knowledge_gaps_identified, angle_insights, created_at')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .limit(limit)

        const { data: dreamLogs, error: dErr } = await supabase
            .from('brain_dream_logs')
            .select('memories_created, patterns_discovered, gaps_identified, beliefs_reweighted, narrative, created_at')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .limit(2)

        if (rErr) throw new Error(`[get_self_reflection] ${rErr.message}`)

        return {
            reflections: (reflections ?? []).map(r => ({
                type:             r.reflection_type,
                qualityScore:     r.quality_score,
                wentWell:         r.what_went_well,
                couldImprove:     r.what_could_improve,
                knowledgeGaps:    r.knowledge_gaps_identified ?? [],
                angleInsights:    r.angle_insights ?? {},
                date:             r.created_at,
            })),
            dreamLogs: (dreamLogs ?? []).map(d => ({
                memoriesCreated:   d.memories_created,
                patternsDiscovered: d.patterns_discovered,
                gapsIdentified:    d.gaps_identified,
                beliefsReweighted: d.beliefs_reweighted,
                narrative:         d.narrative,
                date:              d.created_at,
            })),
            hasFeedback: (reflections ?? []).length > 0,
        }
    }

    /**
     * Fetch open knowledge gaps.
     * User can ask: "What don't you know about my business?" or "What should I add to my KB?"
     */
    private async executeGetKnowledgeGaps(
        _args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('knowledge_gaps')
            .select('domain, description, occurrence_count, impact_level, status, failed_queries, created_at')
            .eq('org_id', ctx.orgId)
            .in('status', ['identified', 'learning'])
            .order('impact_level', { ascending: false })
            .order('occurrence_count', { ascending: false })
            .limit(10)

        if (error) throw new Error(`[get_knowledge_gaps] ${error.message}`)

        const gaps = data ?? []
        const critical = gaps.filter(g => g.impact_level === 'critical')
        const high     = gaps.filter(g => g.impact_level === 'high')

        return {
            totalGaps: gaps.length,
            critical: critical.length,
            high: high.length,
            gaps: gaps.map(g => ({
                domain:       g.domain,
                description:  g.description,
                occurrences:  g.occurrence_count,
                impact:       g.impact_level,
                status:       g.status,
                exampleQueries: (g.failed_queries ?? []).slice(0, 3),
            })),
            recommendation: gaps.length === 0
                ? 'No knowledge gaps detected. Brain is well-informed.'
                : `${gaps.length} gap(s) found. Top priority: "${gaps[0]?.description}" (${gaps[0]?.impact_level} impact, ${gaps[0]?.occurrence_count} occurrences). Add this to your KB to improve response quality.`,
        }
    }

    /**
     * Overall brain health summary — memories, beliefs, activity.
     * User can ask: "How healthy is my Brain?" or "Give me a Brain status report."
     */
    private async executeGetBrainHealth(
        _args: Record<string, unknown>,
        ctx: ExecutorContext
    ): Promise<unknown> {
        const supabase = createClient()

        const [memoriesRes, beliefsRes, gapsRes, logsRes] = await Promise.all([
            supabase.from('brain_memories').select('memory_type, importance', { count: 'exact' }).eq('org_id', ctx.orgId).limit(1),
            supabase.from('brain_beliefs').select('confidence_score', { count: 'exact' }).eq('org_id', ctx.orgId).limit(100),
            supabase.from('knowledge_gaps').select('id', { count: 'exact' }).eq('org_id', ctx.orgId).in('status', ['identified', 'learning']).limit(1),
            supabase.from('brain_request_logs').select('created_at').eq('org_id', ctx.orgId).order('created_at', { ascending: false }).limit(1),
        ])

        const beliefScores = (beliefsRes.data ?? []).map(b => b.confidence_score as number)
        const avgBelief = beliefScores.length
            ? beliefScores.reduce((a, b) => a + b, 0) / beliefScores.length
            : 0

        return {
            memories:         memoriesRes.count ?? 0,
            beliefs:          beliefsRes.count  ?? 0,
            avgBeliefScore:   Math.round(avgBelief * 100) / 100,
            openKnowledgeGaps: gapsRes.count    ?? 0,
            lastActivity:     logsRes.data?.[0]?.created_at ?? null,
            healthScore:      Math.round(Math.min(100,
                (Math.min(memoriesRes.count ?? 0, 50) / 50 * 25) +
                (avgBelief * 25) +
                (beliefsRes.count ?? 0 > 5 ? 25 : (beliefsRes.count ?? 0) / 5 * 25) +
                (gapsRes.count ?? 0 === 0 ? 25 : Math.max(0, 25 - (gapsRes.count ?? 0) * 2))
            )),
        }
    }
}

export const marketxToolExecutor = new MarketXToolExecutor()
