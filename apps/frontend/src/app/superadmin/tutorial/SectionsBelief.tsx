'use client'
import { Target, Lightbulb, AlertTriangle, Trophy, BarChart3, TrendingUp } from 'lucide-react'
import { H3, P, StepList, DataTable, Tip, CodeBlock } from './TutorialPrimitives'

export function BeliefsSection({ color }: { color: string }) {
    return (
        <div>
            <P>The Belief System is a champion/challenger A/B testing framework. Every marketing hypothesis becomes a "belief" that competes for allocation based on real performance data.</P>
            <H3 color={color}>Belief Lifecycle</H3>
            <DataTable color={color} headers={['Status', 'Meaning', 'Transition']} rows={[
                ['HYP', 'Hypothesis — untested idea', 'Created from a brief. Needs minimum sample.'],
                ['TEST', 'In test — collecting data', 'Allocated traffic, gathering signal events.'],
                ['SW', 'Small Win — early positive signal', 'Passed min sample + positive reply rate above baseline.'],
                ['IW', 'Intermediate Win', 'Sustained performance over 7-day window.'],
                ['RW', 'Reliable Win', 'Consistent over 14 days. Eligible for champion status.'],
                ['GW', 'Global Win', 'Top performer. Gets maximum allocation.'],
                ['PAUSED', 'Auto-paused', 'Guardrail breach (bounce > 15%, complaint > 0.1%).'],
            ]} />
            <H3 color={color}>Competition Pairs</H3>
            <P>Beliefs compete in pairs: champion vs challenger. Traffic allocation shifts based on a confidence formula with weighted signals:</P>
            <CodeBlock title="Confidence Formula (config_table)">{`{
  "weights": {
    "booked_call_rate": 0.4,   // Primary signal — this is MONEY
    "positive_reply_rate": 0.3, // Strong engagement signal
    "reply_quality": 0.2,       // Sentiment analysis
    "negative_reply_rate": 0.1  // Penalty for bad reactions
  }
}`}</CodeBlock>
            <Tip icon={<AlertTriangle size={14} />} color="#ef4444">
                Minimum sample size: 50 sends before any promotion check. This prevents false positives from small datasets.
            </Tip>
        </div>
    )
}

export function MasterySection({ color }: { color: string }) {
    return (
        <div>
            <P>Mastery Agents are the learning layer. They observe patterns across campaigns and build Knowledge Objects — structured insights that improve over time.</P>
            <H3 color={color}>Knowledge Object (30-field model)</H3>
            <DataTable color={color} headers={['Field Group', 'Key Fields', 'Purpose']} rows={[
                ['Identity', 'object_type, title, description', '10 types: contact_pattern, timing_pattern, angle_performance, pacing_rule, etc.'],
                ['Evidence', 'evidence_count, confidence, sample_size', 'How much data supports this insight.'],
                ['Temporal', 'first_observed_at, stability_score, observation_window_days', 'How long has this pattern held?'],
                ['Scope', 'applicable_industries, applicable_seniorities', 'Where does this insight apply?'],
                ['Governance', 'promotion_status, reviewed_by, review_notes', '7 statuses: active → candidate → promoted → demoted.'],
            ]} />
            <H3 color={color}>Three-Scope Promotion</H3>
            <StepList color={color} steps={[
                { title: 'Local (per-partner)', desc: 'Insight observed for one organization. e.g., "Risk angles work 2x better for this client\'s enterprise ICP."' },
                { title: 'Candidate Global', desc: 'Pattern observed across 3+ partners. Under review for global promotion.' },
                { title: 'Global', desc: 'Universally true. Applied to all new partners. e.g., "Tuesdays at 9 AM have highest open rates."' },
            ]} />
        </div>
    )
}

export function MeasurementSection({ color }: { color: string }) {
    return (
        <div>
            <P>The Measurement System provides 12-section analytics with pre-computed rollups. Every belief gets daily metrics across deliverability, engagement, reply quality, and conversion.</P>
            <H3 color={color}>belief_daily_rollup — 4 Sections</H3>
            <DataTable color={color} headers={['Section', 'Metrics', 'Computed Rates']} rows={[
                ['1. Deliverability', 'sends, deliveries, bounces, complaints', 'bounce_rate, complaint_rate (GENERATED ALWAYS)'],
                ['2. Engagement', 'opens, clicks, replies', 'open_rate, click_rate, reply_rate'],
                ['3. Reply Quality', '7 sentiment buckets: interested, clarification, objection, timing, referral, negative, noise', 'positive_reply_rate = (interested + referral) / total'],
                ['4. Conversion', 'bookings, shows, revenue_cents', 'booking_rate, show_rate, revenue_per_1k_sends'],
            ]} />
            <H3 color={color}>Partner-Level Aggregation</H3>
            <P>partner_daily_rollup aggregates all beliefs for org-level health monitoring. Includes active_beliefs count and active_satellites count.</P>
            <Tip icon={<Lightbulb size={14} />} color="#f59e0b">
                All rates are GENERATED ALWAYS AS STORED columns in Postgres. Zero compute at read time — the database pre-calculates them on every insert/update.
            </Tip>
        </div>
    )
}
