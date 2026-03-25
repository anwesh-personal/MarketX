/**
 * MARKETING COACH PROCESSOR
 *
 * Worker-side implementation of the Marketing Coach analysis.
 * Analyzes campaign metrics from signal_event and updates Brain learnings.
 *
 * This is the "Coach Agent" that:
 *   - Reads from signal_event (provider-agnostic, all MTA events normalized here)
 *   - Calculates belief performance metrics
 *   - Updates belief confidence scores
 *   - Saves learnings to brain_memories and brain_reflections
 *
 * RS:OS Integration:
 *   - Uses partner_id (= org_id) for all queries
 *   - Updates belief.confidence_score based on performance
 *   - Creates belief_promotion_log entries for audit
 */

import { Pool } from 'pg'

// ============================================================
// TYPES
// ============================================================

export interface BeliefPerformance {
    belief_id: string
    statement: string | null
    angle: string | null
    status: string | null
    confidence_score: number
    sends: number
    opens: number
    clicks: number
    replies: number
    bookings: number
    bounces: number
    complaints: number
    open_rate: number
    click_rate: number
    reply_rate: number
    booking_rate: number
    bounce_rate: number
}

export interface CoachAnalysisResult {
    org_id: string
    analysis_date: string
    period_days: number
    total_events: number
    beliefs_analyzed: number
    top_performers: BeliefPerformance[]
    underperformers: BeliefPerformance[]
    belief_updates: {
        belief_id: string
        old_score: number
        new_score: number
        reason: string
    }[]
    learnings_saved: number
}

// ============================================================
// PROCESSOR
// ============================================================

export class MarketingCoachProcessor {
    constructor(private pool: Pool) {}

    /**
     * Run full coach analysis for an organization.
     */
    async runAnalysis(
        orgId: string,
        options?: {
            days?: number
            minSends?: number
            updateBeliefs?: boolean
            saveLearnings?: boolean
        }
    ): Promise<CoachAnalysisResult> {
        const days = options?.days ?? 30
        const minSends = options?.minSends ?? 10
        const updateBeliefs = options?.updateBeliefs ?? true
        const saveLearnings = options?.saveLearnings ?? true

        console.log(`[MarketingCoach] Running analysis for org ${orgId}, last ${days} days`)

        const cutoffDate = new Date(Date.now() - days * 86400_000).toISOString()

        const beliefMetrics = await this.getBeliefMetrics(orgId, cutoffDate)

        const validBeliefs = beliefMetrics.filter(b => b.sends >= minSends)

        validBeliefs.sort((a, b) => {
            const scoreA = a.booking_rate * 3 + a.reply_rate * 2 + a.click_rate
            const scoreB = b.booking_rate * 3 + b.reply_rate * 2 + b.click_rate
            return scoreB - scoreA
        })

        const topPerformers = validBeliefs.slice(0, 5)
        const underperformers = validBeliefs
            .filter(b => b.booking_rate < 1 && b.sends >= minSends)
            .slice(0, 5)

        const beliefUpdates: CoachAnalysisResult['belief_updates'] = []

        if (updateBeliefs) {
            for (const belief of topPerformers) {
                const update = await this.boostBeliefScore(orgId, belief)
                if (update) beliefUpdates.push(update)
            }

            for (const belief of underperformers) {
                const update = await this.reduceBeliefScore(orgId, belief)
                if (update) beliefUpdates.push(update)
            }
        }

        let learningsSaved = 0
        if (saveLearnings) {
            learningsSaved = await this.saveLearnings(orgId, topPerformers, underperformers)
        }

        const totalEvents = beliefMetrics.reduce((sum, b) => sum + b.sends + b.opens + b.clicks + b.replies + b.bookings, 0)

        return {
            org_id: orgId,
            analysis_date: new Date().toISOString(),
            period_days: days,
            total_events: totalEvents,
            beliefs_analyzed: validBeliefs.length,
            top_performers: topPerformers,
            underperformers,
            belief_updates: beliefUpdates,
            learnings_saved: learningsSaved,
        }
    }

    /**
     * Get belief performance metrics from signal_event.
     */
    private async getBeliefMetrics(orgId: string, cutoffDate: string): Promise<BeliefPerformance[]> {
        const result = await this.pool.query(`
            WITH event_counts AS (
                SELECT 
                    se.belief_id,
                    COUNT(*) FILTER (WHERE se.event_type = 'send') as sends,
                    COUNT(*) FILTER (WHERE se.event_type = 'open') as opens,
                    COUNT(*) FILTER (WHERE se.event_type = 'click') as clicks,
                    COUNT(*) FILTER (WHERE se.event_type = 'reply') as replies,
                    COUNT(*) FILTER (WHERE se.event_type = 'booking') as bookings,
                    COUNT(*) FILTER (WHERE se.event_type = 'bounce') as bounces,
                    COUNT(*) FILTER (WHERE se.event_type = 'complaint') as complaints
                FROM signal_event se
                WHERE se.partner_id = $1
                  AND se.belief_id IS NOT NULL
                  AND se.occurred_at >= $2
                GROUP BY se.belief_id
            )
            SELECT 
                ec.*,
                b.statement,
                b.angle,
                b.status,
                b.confidence_score
            FROM event_counts ec
            LEFT JOIN belief b ON b.id = ec.belief_id AND b.partner_id = $1
            ORDER BY ec.sends DESC
        `, [orgId, cutoffDate])

        return result.rows.map(row => {
            const sends = parseInt(row.sends) || 0
            const opens = parseInt(row.opens) || 0
            const clicks = parseInt(row.clicks) || 0
            const replies = parseInt(row.replies) || 0
            const bookings = parseInt(row.bookings) || 0
            const bounces = parseInt(row.bounces) || 0
            const complaints = parseInt(row.complaints) || 0

            return {
                belief_id: row.belief_id,
                statement: row.statement,
                angle: row.angle,
                status: row.status,
                confidence_score: parseFloat(row.confidence_score) || 0,
                sends,
                opens,
                clicks,
                replies,
                bookings,
                bounces,
                complaints,
                open_rate: sends > 0 ? (opens / sends) * 100 : 0,
                click_rate: sends > 0 ? (clicks / sends) * 100 : 0,
                reply_rate: sends > 0 ? (replies / sends) * 100 : 0,
                booking_rate: sends > 0 ? (bookings / sends) * 100 : 0,
                bounce_rate: sends > 0 ? (bounces / sends) * 100 : 0,
            }
        })
    }

    /**
     * Boost confidence score for a high-performing belief.
     */
    private async boostBeliefScore(
        orgId: string,
        belief: BeliefPerformance
    ): Promise<CoachAnalysisResult['belief_updates'][0] | null> {
        const currentScore = belief.confidence_score
        const boost = Math.min(0.1, (belief.booking_rate / 100) * 0.5)
        const newScore = Math.min(1, currentScore + boost)

        if (newScore <= currentScore) return null

        await this.pool.query(`
            UPDATE belief
            SET confidence_score = $1, updated_at = NOW()
            WHERE id = $2 AND partner_id = $3
        `, [newScore, belief.belief_id, orgId])

        await this.pool.query(`
            INSERT INTO belief_promotion_log (belief_id, from_status, to_status, reason, meta)
            VALUES ($1, 'current', 'boosted', $2, $3)
        `, [
            belief.belief_id,
            `Coach analysis: confidence boosted from ${currentScore.toFixed(3)} to ${newScore.toFixed(3)}`,
            JSON.stringify({
                booking_rate: belief.booking_rate,
                reply_rate: belief.reply_rate,
                sends: belief.sends,
            })
        ])

        console.log(`[MarketingCoach] Boosted belief ${belief.belief_id}: ${currentScore.toFixed(3)} → ${newScore.toFixed(3)}`)

        return {
            belief_id: belief.belief_id,
            old_score: currentScore,
            new_score: newScore,
            reason: `High performance: ${belief.booking_rate.toFixed(1)}% booking rate`,
        }
    }

    /**
     * Reduce confidence score for an underperforming belief.
     */
    private async reduceBeliefScore(
        orgId: string,
        belief: BeliefPerformance
    ): Promise<CoachAnalysisResult['belief_updates'][0] | null> {
        const currentScore = belief.confidence_score
        const penalty = Math.min(0.1, (1 - belief.booking_rate / 100) * 0.1)
        const newScore = Math.max(0, currentScore - penalty)

        if (newScore >= currentScore) return null

        await this.pool.query(`
            UPDATE belief
            SET confidence_score = $1, updated_at = NOW()
            WHERE id = $2 AND partner_id = $3
        `, [newScore, belief.belief_id, orgId])

        await this.pool.query(`
            INSERT INTO belief_promotion_log (belief_id, from_status, to_status, reason, meta)
            VALUES ($1, 'current', 'demoted', $2, $3)
        `, [
            belief.belief_id,
            `Coach analysis: confidence reduced from ${currentScore.toFixed(3)} to ${newScore.toFixed(3)}`,
            JSON.stringify({
                booking_rate: belief.booking_rate,
                reply_rate: belief.reply_rate,
                sends: belief.sends,
            })
        ])

        console.log(`[MarketingCoach] Reduced belief ${belief.belief_id}: ${currentScore.toFixed(3)} → ${newScore.toFixed(3)}`)

        return {
            belief_id: belief.belief_id,
            old_score: currentScore,
            new_score: newScore,
            reason: `Low performance: ${belief.booking_rate.toFixed(1)}% booking rate`,
        }
    }

    /**
     * Save learnings to brain_memories, brain_reflections, AND brain_learning_events.
     */
    private async saveLearnings(
        orgId: string,
        topPerformers: BeliefPerformance[],
        underperformers: BeliefPerformance[]
    ): Promise<number> {
        const brainResult = await this.pool.query(`
            SELECT id FROM brain_agents
            WHERE org_id = $1 AND user_id IS NULL AND status IN ('active', 'configuring')
            LIMIT 1
        `, [orgId])

        if (brainResult.rows.length === 0) {
            console.warn(`[MarketingCoach] No active brain agent for org ${orgId}`)
            return 0
        }

        const brainAgentId = brainResult.rows[0].id
        let savedCount = 0

        for (const belief of topPerformers) {
            // brain_memories (for agent prompt context)
            await this.pool.query(`
                INSERT INTO brain_memories (org_id, agent_id, memory_type, content, source, importance, metadata)
                VALUES ($1, $2, 'learning', $3, 'coach_analysis', $4, $5)
            `, [
                orgId,
                brainAgentId,
                JSON.stringify({
                    title: `High-performing angle: ${belief.angle ?? 'Unknown'}`,
                    description: `This belief achieved ${belief.booking_rate.toFixed(1)}% booking rate with ${belief.sends} sends.`,
                    category: 'angle',
                    action_suggestion: `Create more content using the "${belief.angle}" angle.`,
                }),
                Math.min(0.95, 0.5 + (belief.sends / 100) * 0.1),
                JSON.stringify({
                    learning_type: 'insight',
                    source_beliefs: [belief.belief_id],
                    booking_rate: belief.booking_rate,
                    reply_rate: belief.reply_rate,
                })
            ])

            // brain_learning_events (for audit trail + dashboards)
            await this.pool.query(`
                INSERT INTO brain_learning_events (org_id, brain_agent_id, event_type, title, description, source, belief_id, metrics, importance)
                VALUES ($1, $2, 'insight', $3, $4, 'coach_analysis', $5, $6, $7)
            `, [
                orgId,
                brainAgentId,
                `High-performing angle: ${belief.angle ?? 'Unknown'}`,
                `Achieved ${belief.booking_rate.toFixed(1)}% booking rate with ${belief.sends} sends. Recommend more content using this angle.`,
                belief.belief_id,
                JSON.stringify({
                    booking_rate: belief.booking_rate,
                    reply_rate: belief.reply_rate,
                    click_rate: belief.click_rate,
                    open_rate: belief.open_rate,
                    sends: belief.sends,
                }),
                Math.min(0.95, 0.5 + (belief.sends / 100) * 0.1),
            ])

            savedCount++
        }

        for (const belief of underperformers) {
            // brain_memories (for agent prompt context)
            await this.pool.query(`
                INSERT INTO brain_memories (org_id, agent_id, memory_type, content, source, importance, metadata)
                VALUES ($1, $2, 'learning', $3, 'coach_analysis', $4, $5)
            `, [
                orgId,
                brainAgentId,
                JSON.stringify({
                    title: `Underperforming angle: ${belief.angle ?? 'Unknown'}`,
                    description: `This belief has only ${belief.booking_rate.toFixed(1)}% booking rate. Consider revising.`,
                    category: 'angle',
                    action_suggestion: `Review and revise this belief or reduce its allocation.`,
                }),
                0.6,
                JSON.stringify({
                    learning_type: 'warning',
                    source_beliefs: [belief.belief_id],
                    booking_rate: belief.booking_rate,
                    reply_rate: belief.reply_rate,
                })
            ])

            // brain_learning_events (for audit trail + dashboards)
            await this.pool.query(`
                INSERT INTO brain_learning_events (org_id, brain_agent_id, event_type, title, description, source, belief_id, metrics, importance)
                VALUES ($1, $2, 'warning', $3, $4, 'coach_analysis', $5, $6, $7)
            `, [
                orgId,
                brainAgentId,
                `Underperforming angle: ${belief.angle ?? 'Unknown'}`,
                `Only ${belief.booking_rate.toFixed(1)}% booking rate with ${belief.sends} sends. Consider revising or reducing allocation.`,
                belief.belief_id,
                JSON.stringify({
                    booking_rate: belief.booking_rate,
                    reply_rate: belief.reply_rate,
                    click_rate: belief.click_rate,
                    open_rate: belief.open_rate,
                    sends: belief.sends,
                }),
                0.6,
            ])

            savedCount++
        }

        if (topPerformers.length > 0 || underperformers.length > 0) {
            const reflectionContent = [
                '## Campaign Performance Analysis',
                '',
                '### Top Performers',
                ...topPerformers.map(b => `- ${b.angle ?? 'Unknown'}: ${b.booking_rate.toFixed(1)}% booking rate (${b.sends} sends)`),
                '',
                '### Underperformers',
                ...underperformers.map(b => `- ${b.angle ?? 'Unknown'}: ${b.booking_rate.toFixed(1)}% booking rate (${b.sends} sends)`),
            ].join('\n')

            await this.pool.query(`
                INSERT INTO brain_reflections (org_id, agent_id, reflection_type, content, trigger, metadata)
                VALUES ($1, $2, 'performance_analysis', $3, 'coach_analysis', $4)
            `, [
                orgId,
                brainAgentId,
                reflectionContent,
                JSON.stringify({
                    top_count: topPerformers.length,
                    under_count: underperformers.length,
                    analysis_date: new Date().toISOString(),
                })
            ])

            // brain_learning_events: reflection record
            await this.pool.query(`
                INSERT INTO brain_learning_events (org_id, brain_agent_id, event_type, title, description, source, metrics, importance)
                VALUES ($1, $2, 'reflection', $3, $4, 'coach_analysis', $5, $6)
            `, [
                orgId,
                brainAgentId,
                `Campaign Performance Summary`,
                reflectionContent,
                JSON.stringify({
                    top_count: topPerformers.length,
                    under_count: underperformers.length,
                    analysis_date: new Date().toISOString(),
                }),
                0.8,
            ])

            savedCount++
        }

        console.log(`[MarketingCoach] Saved ${savedCount} learnings + events for org ${orgId}`)

        return savedCount
    }

    /**
     * Run analysis for all active organizations.
     */
    async runAnalysisForAllOrgs(options?: {
        days?: number
        minSends?: number
    }): Promise<CoachAnalysisResult[]> {
        const orgsResult = await this.pool.query(`
            SELECT DISTINCT partner_id as org_id
            FROM signal_event
            WHERE occurred_at >= NOW() - INTERVAL '${options?.days ?? 30} days'
        `)

        const results: CoachAnalysisResult[] = []

        for (const row of orgsResult.rows) {
            try {
                const result = await this.runAnalysis(row.org_id, options)
                results.push(result)
            } catch (error: any) {
                console.error(`[MarketingCoach] Failed for org ${row.org_id}:`, error.message)
            }
        }

        return results
    }
}
