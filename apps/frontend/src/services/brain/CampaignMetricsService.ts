/**
 * CAMPAIGN METRICS SERVICE
 *
 * Provider-agnostic service for aggregating email campaign metrics from signal_event table.
 * Works with ANY MTA (Mailwizz, Mailgun, SES, SendGrid, etc.) - all events are normalized
 * into signal_event by their respective webhook handlers.
 *
 * Architecture:
 *   - Reads from `signal_event` table (RS:OS canonical)
 *   - Uses `partner_id` for org scoping (partner.id = organizations.id)
 *   - Aggregates by belief, brief, icp, offer, flow
 *   - Calculates key metrics: open rate, click rate, reply rate, booking rate, bounce rate
 *
 * Usage:
 *   - Coach Agent uses this to analyze campaign performance
 *   - Learning Loop Worker uses this for daily optimization
 *   - Dashboard/Analytics uses this for reporting
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ============================================================
// TYPES
// ============================================================

export interface CampaignMetrics {
    period_start: string
    period_end: string
    total_events: number
    sends: number
    opens: number
    clicks: number
    replies: number
    bookings: number
    bounces: number
    complaints: number
    revenue: number
    open_rate: number
    click_rate: number
    reply_rate: number
    booking_rate: number
    bounce_rate: number
    complaint_rate: number
}

export interface BeliefMetrics extends CampaignMetrics {
    belief_id: string
    belief_statement?: string
    belief_angle?: string
    belief_status?: string
    confidence_score?: number
}

export interface BriefMetrics extends CampaignMetrics {
    brief_id: string
    brief_title?: string
    belief_count: number
    top_belief_id?: string
}

export interface ICPMetrics extends CampaignMetrics {
    icp_id: string
    icp_name?: string
    brief_count: number
    belief_count: number
}

export interface SignalEventRow {
    id: string
    partner_id: string
    offer_id: string | null
    icp_id: string | null
    brief_id: string | null
    belief_id: string | null
    flow_id: string | null
    flow_step_id: string | null
    event_type: string
    event_value: number | null
    meta: Record<string, unknown>
    occurred_at: string
    created_at: string
}

// ============================================================
// SERVICE
// ============================================================

class CampaignMetricsService {
    private getServiceClient() {
        return createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
    }

    /**
     * Get raw signal events for an organization within a time period.
     */
    async getSignalEvents(
        orgId: string,
        options?: {
            startDate?: string
            endDate?: string
            beliefId?: string
            briefId?: string
            icpId?: string
            eventTypes?: string[]
            limit?: number
        }
    ): Promise<SignalEventRow[]> {
        const supabase = createClient()
        
        let query = supabase
            .from('signal_event')
            .select('*')
            .eq('partner_id', orgId)
            .order('occurred_at', { ascending: false })

        if (options?.startDate) {
            query = query.gte('occurred_at', options.startDate)
        }

        if (options?.endDate) {
            query = query.lte('occurred_at', options.endDate)
        }

        if (options?.beliefId) {
            query = query.eq('belief_id', options.beliefId)
        }

        if (options?.briefId) {
            query = query.eq('brief_id', options.briefId)
        }

        if (options?.icpId) {
            query = query.eq('icp_id', options.icpId)
        }

        if (options?.eventTypes && options.eventTypes.length > 0) {
            query = query.in('event_type', options.eventTypes)
        }

        if (options?.limit) {
            query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) {
            throw new Error(`[CampaignMetricsService.getSignalEvents] Failed: ${error.message}`)
        }

        return data ?? []
    }

    /**
     * Calculate metrics from a set of signal events.
     */
    private calculateMetrics(events: SignalEventRow[], periodStart: string, periodEnd: string): CampaignMetrics {
        const counts: Record<string, number> = {}
        let totalRevenue = 0

        for (const event of events) {
            counts[event.event_type] = (counts[event.event_type] ?? 0) + 1
            if (event.event_type === 'revenue' && event.event_value) {
                totalRevenue += event.event_value
            }
        }

        const sends = counts['send'] ?? 0
        const opens = counts['open'] ?? 0
        const clicks = counts['click'] ?? 0
        const replies = counts['reply'] ?? 0
        const bookings = counts['booking'] ?? 0
        const bounces = counts['bounce'] ?? 0
        const complaints = counts['complaint'] ?? 0

        return {
            period_start: periodStart,
            period_end: periodEnd,
            total_events: events.length,
            sends,
            opens,
            clicks,
            replies,
            bookings,
            bounces,
            complaints,
            revenue: totalRevenue,
            open_rate: sends > 0 ? (opens / sends) * 100 : 0,
            click_rate: sends > 0 ? (clicks / sends) * 100 : 0,
            reply_rate: sends > 0 ? (replies / sends) * 100 : 0,
            booking_rate: sends > 0 ? (bookings / sends) * 100 : 0,
            bounce_rate: sends > 0 ? (bounces / sends) * 100 : 0,
            complaint_rate: sends > 0 ? (complaints / sends) * 100 : 0,
        }
    }

    /**
     * Get aggregated metrics for an organization over a time period.
     */
    async getOrgMetrics(
        orgId: string,
        options?: {
            startDate?: string
            endDate?: string
        }
    ): Promise<CampaignMetrics> {
        const endDate = options?.endDate ?? new Date().toISOString()
        const startDate = options?.startDate ?? new Date(Date.now() - 30 * 86400_000).toISOString()

        const events = await this.getSignalEvents(orgId, { startDate, endDate })
        return this.calculateMetrics(events, startDate, endDate)
    }

    /**
     * Get metrics grouped by belief for an organization.
     */
    async getMetricsByBelief(
        orgId: string,
        options?: {
            startDate?: string
            endDate?: string
            limit?: number
        }
    ): Promise<BeliefMetrics[]> {
        const supabase = createClient()
        const endDate = options?.endDate ?? new Date().toISOString()
        const startDate = options?.startDate ?? new Date(Date.now() - 30 * 86400_000).toISOString()

        const events = await this.getSignalEvents(orgId, { startDate, endDate })

        const beliefMap: Record<string, SignalEventRow[]> = {}
        for (const event of events) {
            if (event.belief_id) {
                if (!beliefMap[event.belief_id]) {
                    beliefMap[event.belief_id] = []
                }
                beliefMap[event.belief_id].push(event)
            }
        }

        const beliefIds = Object.keys(beliefMap)
        let beliefData: Record<string, { statement: string; angle: string; status: string; confidence_score: number }> = {}

        if (beliefIds.length > 0) {
            const { data: beliefs } = await supabase
                .from('belief')
                .select('id, statement, angle, status, confidence_score')
                .eq('partner_id', orgId)
                .in('id', beliefIds)

            for (const belief of beliefs ?? []) {
                beliefData[belief.id] = {
                    statement: belief.statement,
                    angle: belief.angle,
                    status: belief.status,
                    confidence_score: belief.confidence_score,
                }
            }
        }

        const results: BeliefMetrics[] = []
        for (const [beliefId, beliefEvents] of Object.entries(beliefMap)) {
            const metrics = this.calculateMetrics(beliefEvents, startDate, endDate)
            const belief = beliefData[beliefId]
            
            results.push({
                ...metrics,
                belief_id: beliefId,
                belief_statement: belief?.statement,
                belief_angle: belief?.angle,
                belief_status: belief?.status,
                confidence_score: belief?.confidence_score,
            })
        }

        results.sort((a, b) => b.booking_rate - a.booking_rate || b.reply_rate - a.reply_rate)

        if (options?.limit) {
            return results.slice(0, options.limit)
        }

        return results
    }

    /**
     * Get metrics grouped by ICP for an organization.
     */
    async getMetricsByICP(
        orgId: string,
        options?: {
            startDate?: string
            endDate?: string
        }
    ): Promise<ICPMetrics[]> {
        const supabase = createClient()
        const endDate = options?.endDate ?? new Date().toISOString()
        const startDate = options?.startDate ?? new Date(Date.now() - 30 * 86400_000).toISOString()

        const events = await this.getSignalEvents(orgId, { startDate, endDate })

        const icpMap: Record<string, SignalEventRow[]> = {}
        const icpBeliefs: Record<string, Set<string>> = {}
        const icpBriefs: Record<string, Set<string>> = {}

        for (const event of events) {
            if (event.icp_id) {
                if (!icpMap[event.icp_id]) {
                    icpMap[event.icp_id] = []
                    icpBeliefs[event.icp_id] = new Set()
                    icpBriefs[event.icp_id] = new Set()
                }
                icpMap[event.icp_id].push(event)
                if (event.belief_id) icpBeliefs[event.icp_id].add(event.belief_id)
                if (event.brief_id) icpBriefs[event.icp_id].add(event.brief_id)
            }
        }

        const icpIds = Object.keys(icpMap)
        let icpData: Record<string, { name: string }> = {}

        if (icpIds.length > 0) {
            const { data: icps } = await supabase
                .from('icp')
                .select('id, name')
                .eq('partner_id', orgId)
                .in('id', icpIds)

            for (const icp of icps ?? []) {
                icpData[icp.id] = { name: icp.name }
            }
        }

        const results: ICPMetrics[] = []
        for (const [icpId, icpEvents] of Object.entries(icpMap)) {
            const metrics = this.calculateMetrics(icpEvents, startDate, endDate)
            const icp = icpData[icpId]
            
            results.push({
                ...metrics,
                icp_id: icpId,
                icp_name: icp?.name,
                brief_count: icpBriefs[icpId]?.size ?? 0,
                belief_count: icpBeliefs[icpId]?.size ?? 0,
            })
        }

        results.sort((a, b) => b.booking_rate - a.booking_rate || b.reply_rate - a.reply_rate)

        return results
    }

    /**
     * Get top performing beliefs for Coach Agent analysis.
     */
    async getTopPerformingBeliefs(
        orgId: string,
        options?: {
            days?: number
            limit?: number
            minSends?: number
        }
    ): Promise<BeliefMetrics[]> {
        const days = options?.days ?? 30
        const limit = options?.limit ?? 10
        const minSends = options?.minSends ?? 10

        const startDate = new Date(Date.now() - days * 86400_000).toISOString()
        const endDate = new Date().toISOString()

        const allMetrics = await this.getMetricsByBelief(orgId, { startDate, endDate })

        return allMetrics
            .filter(m => m.sends >= minSends)
            .sort((a, b) => {
                const scoreA = a.booking_rate * 3 + a.reply_rate * 2 + a.click_rate
                const scoreB = b.booking_rate * 3 + b.reply_rate * 2 + b.click_rate
                return scoreB - scoreA
            })
            .slice(0, limit)
    }

    /**
     * Get underperforming beliefs for Coach Agent analysis.
     */
    async getUnderperformingBeliefs(
        orgId: string,
        options?: {
            days?: number
            limit?: number
            minSends?: number
            maxBookingRate?: number
        }
    ): Promise<BeliefMetrics[]> {
        const days = options?.days ?? 30
        const limit = options?.limit ?? 10
        const minSends = options?.minSends ?? 10
        const maxBookingRate = options?.maxBookingRate ?? 1

        const startDate = new Date(Date.now() - days * 86400_000).toISOString()
        const endDate = new Date().toISOString()

        const allMetrics = await this.getMetricsByBelief(orgId, { startDate, endDate })

        return allMetrics
            .filter(m => m.sends >= minSends && m.booking_rate <= maxBookingRate)
            .sort((a, b) => a.booking_rate - b.booking_rate || a.reply_rate - b.reply_rate)
            .slice(0, limit)
    }

    /**
     * Generate learning insights from campaign metrics for Coach Agent.
     */
    async generateLearningInsights(
        orgId: string,
        options?: {
            days?: number
        }
    ): Promise<{
        summary: string
        top_performers: BeliefMetrics[]
        underperformers: BeliefMetrics[]
        recommendations: string[]
        metrics_snapshot: CampaignMetrics
    }> {
        const days = options?.days ?? 30

        const [orgMetrics, topPerformers, underperformers] = await Promise.all([
            this.getOrgMetrics(orgId, {
                startDate: new Date(Date.now() - days * 86400_000).toISOString(),
            }),
            this.getTopPerformingBeliefs(orgId, { days, limit: 5 }),
            this.getUnderperformingBeliefs(orgId, { days, limit: 5 }),
        ])

        const recommendations: string[] = []

        if (orgMetrics.bounce_rate > 5) {
            recommendations.push(`High bounce rate (${orgMetrics.bounce_rate.toFixed(1)}%) - Review email list hygiene and sender reputation.`)
        }

        if (orgMetrics.open_rate < 20) {
            recommendations.push(`Low open rate (${orgMetrics.open_rate.toFixed(1)}%) - Test different subject lines and send times.`)
        }

        if (topPerformers.length > 0) {
            const topAngle = topPerformers[0].belief_angle
            if (topAngle) {
                recommendations.push(`Top performing angle: "${topAngle}" - Consider creating more beliefs with similar messaging.`)
            }
        }

        if (underperformers.length > 0) {
            recommendations.push(`${underperformers.length} beliefs underperforming - Consider pausing or revising these angles.`)
        }

        const summary = `
Over the last ${days} days:
- ${orgMetrics.sends} emails sent
- ${orgMetrics.open_rate.toFixed(1)}% open rate
- ${orgMetrics.click_rate.toFixed(1)}% click rate
- ${orgMetrics.reply_rate.toFixed(1)}% reply rate
- ${orgMetrics.booking_rate.toFixed(1)}% booking rate
- ${topPerformers.length} top performing beliefs identified
- ${underperformers.length} underperforming beliefs identified
        `.trim()

        return {
            summary,
            top_performers: topPerformers,
            underperformers,
            recommendations,
            metrics_snapshot: orgMetrics,
        }
    }
}

export const campaignMetricsService = new CampaignMetricsService()
