/**
 * MARKETING COACH SERVICE
 *
 * Analyzes campaign metrics from signal_event and generates learnings for the Brain.
 * This is the "Coach Agent" that studies email performance and feeds insights back.
 *
 * Architecture:
 *   - Reads from CampaignMetricsService (provider-agnostic)
 *   - Generates structured learnings and recommendations
 *   - Updates Brain via brain_memories, brain_reflections, and belief weights
 *   - Can be triggered by:
 *     - Learning Loop Worker (daily/scheduled)
 *     - Manual trigger from Superadmin
 *     - Webhook after significant metric changes
 *
 * RS:OS Integration:
 *   - Updates belief.confidence_score based on performance
 *   - Creates belief_promotion_log entries for audit
 *   - Uses partner_id (= org_id) for all queries
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { campaignMetricsService, BeliefMetrics, CampaignMetrics } from './CampaignMetricsService'

// ============================================================
// TYPES
// ============================================================

export interface CoachLearning {
    id: string
    org_id: string
    learning_type: 'pattern' | 'insight' | 'recommendation' | 'warning'
    category: 'angle' | 'subject_line' | 'timing' | 'audience' | 'content' | 'general'
    title: string
    description: string
    evidence: {
        metric: string
        value: number
        comparison?: string
        sample_size: number
    }
    confidence: number
    actionable: boolean
    action_suggestion?: string
    source_beliefs?: string[]
    created_at: string
}

export interface CoachAnalysisResult {
    org_id: string
    analysis_date: string
    period_days: number
    metrics_snapshot: CampaignMetrics
    learnings: CoachLearning[]
    belief_updates: {
        belief_id: string
        old_confidence: number
        new_confidence: number
        reason: string
    }[]
    recommendations: string[]
    warnings: string[]
}

export interface BeliefScoreUpdate {
    belief_id: string
    old_score: number
    new_score: number
    delta: number
    reason: string
}

// ============================================================
// SERVICE
// ============================================================

class MarketingCoachService {
    private getServiceClient() {
        return createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
    }

    /**
     * Run full coach analysis for an organization.
     * This is the main entry point for the learning loop.
     */
    async runAnalysis(
        orgId: string,
        options?: {
            days?: number
            updateBeliefs?: boolean
            saveLearnings?: boolean
        }
    ): Promise<CoachAnalysisResult> {
        const days = options?.days ?? 30
        const updateBeliefs = options?.updateBeliefs ?? true
        const saveLearnings = options?.saveLearnings ?? true

        const insights = await campaignMetricsService.generateLearningInsights(orgId, { days })

        const learnings: CoachLearning[] = []
        const beliefUpdates: BeliefScoreUpdate[] = []
        const warnings: string[] = []

        for (const topBelief of insights.top_performers) {
            const learning = this.createLearningFromTopPerformer(orgId, topBelief)
            learnings.push(learning)
        }

        for (const underperformer of insights.underperformers) {
            const learning = this.createLearningFromUnderperformer(orgId, underperformer)
            learnings.push(learning)
            
            if (underperformer.bounce_rate > 10) {
                warnings.push(`Belief "${underperformer.belief_statement?.slice(0, 50)}..." has high bounce rate (${underperformer.bounce_rate.toFixed(1)}%)`)
            }
        }

        const patternLearnings = await this.extractPatterns(orgId, insights.top_performers, insights.underperformers)
        learnings.push(...patternLearnings)

        if (updateBeliefs) {
            const updates = await this.updateBeliefScores(orgId, insights.top_performers, insights.underperformers)
            beliefUpdates.push(...updates)
        }

        if (saveLearnings && learnings.length > 0) {
            await this.saveLearningsToBrain(orgId, learnings)
        }

        return {
            org_id: orgId,
            analysis_date: new Date().toISOString(),
            period_days: days,
            metrics_snapshot: insights.metrics_snapshot,
            learnings,
            belief_updates: beliefUpdates.map(u => ({
                belief_id: u.belief_id,
                old_confidence: u.old_score,
                new_confidence: u.new_score,
                reason: u.reason,
            })),
            recommendations: insights.recommendations,
            warnings,
        }
    }

    /**
     * Create a learning entry from a top performing belief.
     */
    private createLearningFromTopPerformer(orgId: string, belief: BeliefMetrics): CoachLearning {
        const score = belief.booking_rate * 3 + belief.reply_rate * 2 + belief.click_rate
        
        return {
            id: `learning_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            org_id: orgId,
            learning_type: 'insight',
            category: 'angle',
            title: `High-performing angle: ${belief.belief_angle ?? 'Unknown'}`,
            description: `This belief is outperforming others with ${belief.booking_rate.toFixed(1)}% booking rate and ${belief.reply_rate.toFixed(1)}% reply rate. Consider creating more content with similar messaging.`,
            evidence: {
                metric: 'composite_score',
                value: score,
                comparison: 'above average',
                sample_size: belief.sends,
            },
            confidence: Math.min(0.95, 0.5 + (belief.sends / 100) * 0.1),
            actionable: true,
            action_suggestion: `Create more beliefs using the "${belief.belief_angle}" angle approach.`,
            source_beliefs: [belief.belief_id],
            created_at: new Date().toISOString(),
        }
    }

    /**
     * Create a learning entry from an underperforming belief.
     */
    private createLearningFromUnderperformer(orgId: string, belief: BeliefMetrics): CoachLearning {
        return {
            id: `learning_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            org_id: orgId,
            learning_type: 'warning',
            category: 'angle',
            title: `Underperforming angle: ${belief.belief_angle ?? 'Unknown'}`,
            description: `This belief has low engagement with only ${belief.booking_rate.toFixed(1)}% booking rate. Consider pausing or revising.`,
            evidence: {
                metric: 'booking_rate',
                value: belief.booking_rate,
                comparison: 'below threshold',
                sample_size: belief.sends,
            },
            confidence: Math.min(0.9, 0.5 + (belief.sends / 100) * 0.1),
            actionable: true,
            action_suggestion: `Review and revise this belief or reduce its allocation weight.`,
            source_beliefs: [belief.belief_id],
            created_at: new Date().toISOString(),
        }
    }

    /**
     * Extract patterns from top performers and underperformers.
     */
    private async extractPatterns(
        orgId: string,
        topPerformers: BeliefMetrics[],
        underperformers: BeliefMetrics[]
    ): Promise<CoachLearning[]> {
        const learnings: CoachLearning[] = []

        const topAngles = topPerformers
            .filter(b => b.belief_angle)
            .map(b => b.belief_angle!)
        
        const angleCounts: Record<string, number> = {}
        for (const angle of topAngles) {
            angleCounts[angle] = (angleCounts[angle] ?? 0) + 1
        }

        const dominantAngle = Object.entries(angleCounts)
            .sort((a, b) => b[1] - a[1])[0]

        if (dominantAngle && dominantAngle[1] >= 2) {
            learnings.push({
                id: `learning_${Date.now()}_pattern`,
                org_id: orgId,
                learning_type: 'pattern',
                category: 'angle',
                title: `Dominant winning angle: ${dominantAngle[0]}`,
                description: `The "${dominantAngle[0]}" angle appears in ${dominantAngle[1]} of your top performing beliefs. This messaging resonates with your audience.`,
                evidence: {
                    metric: 'angle_frequency',
                    value: dominantAngle[1],
                    comparison: 'most common in top performers',
                    sample_size: topPerformers.length,
                },
                confidence: 0.8,
                actionable: true,
                action_suggestion: `Prioritize the "${dominantAngle[0]}" angle in new content creation.`,
                created_at: new Date().toISOString(),
            })
        }

        const avgTopOpenRate = topPerformers.reduce((sum, b) => sum + b.open_rate, 0) / (topPerformers.length || 1)
        const avgBottomOpenRate = underperformers.reduce((sum, b) => sum + b.open_rate, 0) / (underperformers.length || 1)

        if (avgTopOpenRate > avgBottomOpenRate * 1.5) {
            learnings.push({
                id: `learning_${Date.now()}_subject`,
                org_id: orgId,
                learning_type: 'insight',
                category: 'subject_line',
                title: 'Subject line impact detected',
                description: `Top performers have ${avgTopOpenRate.toFixed(1)}% open rate vs ${avgBottomOpenRate.toFixed(1)}% for underperformers. Subject lines are a key differentiator.`,
                evidence: {
                    metric: 'open_rate_delta',
                    value: avgTopOpenRate - avgBottomOpenRate,
                    comparison: 'top vs bottom',
                    sample_size: topPerformers.length + underperformers.length,
                },
                confidence: 0.75,
                actionable: true,
                action_suggestion: 'Analyze subject lines of top performers and apply patterns to underperformers.',
                created_at: new Date().toISOString(),
            })
        }

        return learnings
    }

    /**
     * Update belief confidence scores based on performance.
     */
    private async updateBeliefScores(
        orgId: string,
        topPerformers: BeliefMetrics[],
        underperformers: BeliefMetrics[]
    ): Promise<BeliefScoreUpdate[]> {
        const supabase = this.getServiceClient()
        const updates: BeliefScoreUpdate[] = []

        for (const belief of topPerformers) {
            if (belief.sends < 20) continue

            const currentScore = belief.confidence_score ?? 0
            const performanceBoost = Math.min(0.1, (belief.booking_rate / 100) * 0.5)
            const newScore = Math.min(1, currentScore + performanceBoost)

            if (newScore > currentScore) {
                const { error } = await supabase
                    .from('belief')
                    .update({ 
                        confidence_score: newScore,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', belief.belief_id)
                    .eq('partner_id', orgId)

                if (!error) {
                    updates.push({
                        belief_id: belief.belief_id,
                        old_score: currentScore,
                        new_score: newScore,
                        delta: newScore - currentScore,
                        reason: `High performance: ${belief.booking_rate.toFixed(1)}% booking rate`,
                    })

                    await supabase.from('belief_promotion_log').insert({
                        belief_id: belief.belief_id,
                        from_status: 'current',
                        to_status: 'boosted',
                        reason: `Coach analysis: confidence boosted from ${currentScore.toFixed(3)} to ${newScore.toFixed(3)}`,
                        meta: {
                            booking_rate: belief.booking_rate,
                            reply_rate: belief.reply_rate,
                            sends: belief.sends,
                        }
                    })
                }
            }
        }

        for (const belief of underperformers) {
            if (belief.sends < 20) continue

            const currentScore = belief.confidence_score ?? 0.5
            const performancePenalty = Math.min(0.1, (1 - belief.booking_rate / 100) * 0.1)
            const newScore = Math.max(0, currentScore - performancePenalty)

            if (newScore < currentScore) {
                const { error } = await supabase
                    .from('belief')
                    .update({ 
                        confidence_score: newScore,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', belief.belief_id)
                    .eq('partner_id', orgId)

                if (!error) {
                    updates.push({
                        belief_id: belief.belief_id,
                        old_score: currentScore,
                        new_score: newScore,
                        delta: newScore - currentScore,
                        reason: `Low performance: ${belief.booking_rate.toFixed(1)}% booking rate`,
                    })

                    await supabase.from('belief_promotion_log').insert({
                        belief_id: belief.belief_id,
                        from_status: 'current',
                        to_status: 'demoted',
                        reason: `Coach analysis: confidence reduced from ${currentScore.toFixed(3)} to ${newScore.toFixed(3)}`,
                        meta: {
                            booking_rate: belief.booking_rate,
                            reply_rate: belief.reply_rate,
                            sends: belief.sends,
                        }
                    })
                }
            }
        }

        return updates
    }

    /**
     * Save learnings to Brain memory.
     */
    private async saveLearningsToBrain(orgId: string, learnings: CoachLearning[]): Promise<void> {
        const supabase = this.getServiceClient()

        const { data: brainAgent } = await supabase
            .from('brain_agents')
            .select('id')
            .eq('org_id', orgId)
            .is('user_id', null)
            .in('status', ['active', 'configuring'])
            .limit(1)
            .maybeSingle()

        if (!brainAgent) {
            console.warn(`[MarketingCoachService] No active brain agent for org ${orgId}`)
            return
        }

        for (const learning of learnings) {
            await supabase.from('brain_memories').insert({
                org_id: orgId,
                agent_id: brainAgent.id,
                memory_type: 'learning',
                content: JSON.stringify({
                    title: learning.title,
                    description: learning.description,
                    category: learning.category,
                    evidence: learning.evidence,
                    action_suggestion: learning.action_suggestion,
                }),
                source: 'coach_analysis',
                importance: learning.confidence,
                metadata: {
                    learning_type: learning.learning_type,
                    source_beliefs: learning.source_beliefs,
                    actionable: learning.actionable,
                },
            })
        }

        const reflectionContent = learnings
            .filter(l => l.learning_type === 'pattern' || l.learning_type === 'insight')
            .map(l => `- ${l.title}: ${l.description}`)
            .join('\n')

        if (reflectionContent) {
            await supabase.from('brain_reflections').insert({
                org_id: orgId,
                agent_id: brainAgent.id,
                reflection_type: 'performance_analysis',
                content: `## Campaign Performance Analysis\n\n${reflectionContent}`,
                trigger: 'coach_analysis',
                metadata: {
                    learning_count: learnings.length,
                    analysis_date: new Date().toISOString(),
                },
            })
        }
    }

    /**
     * Get recent learnings for an organization.
     */
    async getRecentLearnings(
        orgId: string,
        options?: {
            limit?: number
            category?: string
        }
    ): Promise<any[]> {
        const supabase = createClient()
        const limit = options?.limit ?? 20

        let query = supabase
            .from('brain_memories')
            .select('*')
            .eq('org_id', orgId)
            .eq('memory_type', 'learning')
            .eq('source', 'coach_analysis')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (options?.category) {
            query = query.contains('metadata', { category: options.category })
        }

        const { data, error } = await query

        if (error) {
            throw new Error(`[MarketingCoachService.getRecentLearnings] Failed: ${error.message}`)
        }

        return (data ?? []).map(row => ({
            ...row,
            content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        }))
    }
}

export const marketingCoachService = new MarketingCoachService()
