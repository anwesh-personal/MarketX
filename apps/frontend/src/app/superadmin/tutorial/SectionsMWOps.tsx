'use client'
import { Lightbulb, AlertTriangle, RefreshCw, Mail, Shield, Bot, Sparkles, Database, Target, BookOpen } from 'lucide-react'
import { H3, P, StepList, FeatureGrid, DataTable, Tip, CodeBlock } from './TutorialPrimitives'

export function MWContentSection({ color }: { color: string }) {
    return (
        <div>
            <P>Content generation happens when workflows execute agent nodes. Each agent loads its full context chain before calling the LLM.</P>
            <H3 color={color}>What Gets Injected Into Each Agent Call</H3>
            <StepList color={color} steps={[
                { title: 'Prompt blocks from Prompt Studio', desc: 'prompt_assignments table queried → blocks loaded by category order: foundation → persona → domain → instruction → guardrails → task.' },
                { title: 'Brain-level context', desc: 'Brain persona, guardrails, and recent brain_memories (top 5 by importance) + latest brain_reflection.' },
                { title: 'Knowledge Base content', desc: 'RAG query against the org\'s KB — retrieves relevant documents (top K by cosine similarity, filtered by min_confidence).' },
                { title: 'Previous node outputs', desc: 'Workflow pipelineData — outputs from upstream nodes flow into the current agent\'s input.' },
            ]} />
            <H3 color={color}>Agent Types & What They Produce</H3>
            <DataTable color={color} headers={['Agent Role', 'Input', 'Output']} rows={[
                ['Email Writer (writer)', 'ICP profile, offer, angle, KB context', 'Subject line + email body. AIDA/PAS/BAB frameworks. CAN-SPAM footer.'],
                ['Researcher (analyst)', 'Company name, industry, prospect info', 'Research dossier — company analysis, decision-makers, pain points.'],
                ['Page Builder (content)', 'Offer, angle, CTA type, brand rules', 'Full HTML landing page. Mobile-first, semantic, WCAG 2.1 AA.'],
                ['Marketing Coach (coach)', 'Campaign metrics, rollup data', 'Performance analysis + brain_memories written back to Brain.'],
                ['Generalist', 'Any query', 'Fallback for ad-hoc tasks — summaries, rewrites, etc.'],
            ]} />
            <Tip icon={<Lightbulb size={14} />} color="var(--color-warning)">
                Every LLM call logs: tokens used, cost, provider, model, response time, and the full prompt chain. This metadata is stored in workflow execution records for debugging and cost tracking.
            </Tip>
        </div>
    )
}

export function MWDeliverySection({ color }: { color: string }) {
    return (
        <div>
            <P>Email delivery uses a 5-server SMTP satellite swarm managed through MailWizz. Each server has its own domain and IP for complete reputation isolation.</P>
            <H3 color={color}>Satellite Architecture</H3>
            <DataTable color={color} headers={['Component', 'Count', 'Purpose']} rows={[
                ['SMTP Servers', '5', 'Each manages sending with Postfix + OpenDKIM.'],
                ['Sending Domains (TLDs)', '5', 'One per server — reputation isolation between domains.'],
                ['Dedicated IPs', '5', 'One per server — no shared IP risk.'],
                ['Sending Identities', '50', '10 per server. Variations of sender name/email for warmup rotation.'],
            ]} />
            <H3 color={color}>Warmup Strategy</H3>
            <StepList color={color} steps={[
                { title: 'Week 1: 50/day per server (250 total)', desc: 'Start low. Only Gold-tier verified leads from Refinery. Build initial reputation.' },
                { title: 'Week 2: 200/day per server (1,000 total)', desc: 'Increase if bounce rate < 2% and zero complaints.' },
                { title: 'Week 3: 1,000/day per server (5,000 total)', desc: 'Mid-volume. Monitor inbox placement with seed tests.' },
                { title: 'Week 4+: 3,000/day per server (15,000 total)', desc: 'Full capacity. Active monitoring. Any bounce spike = immediate pause.' },
            ]} />
            <H3 color={color}>Safety: What Happens on Bad Signals</H3>
            <FeatureGrid color={color} items={[
                { icon: <AlertTriangle size={16} />, title: 'Bounce Rate > 15%', desc: 'Belief auto-paused. Pattern logged. Agent warned in next execution.' },
                { icon: <AlertTriangle size={16} />, title: 'Complaint Rate > 0.1%', desc: 'Immediate pause + alert. Manual review required before resuming.' },
                { icon: <RefreshCw size={16} />, title: 'Server Health', desc: 'MailWizz monitors per-server reputation. Unhealthy servers get traffic redirected.' },
            ]} />
        </div>
    )
}

export function MWLearningSection({ color }: { color: string }) {
    return (
        <div>
            <P>The learning loop is what makes MarketWriter self-improving. Campaign signals flow back into the Brain, so every future campaign inherits updated knowledge.</P>
            <H3 color={color}>The Feedback Cycle</H3>
            <StepList color={color} steps={[
                { title: 'MailWizz fires webhooks', desc: 'Events: open, click, reply, bounce, complaint, unsubscribe. Each arrives in real-time.' },
                { title: 'signal_event stores raw data', desc: 'Each event tagged with partner_id, belief_id, flow_id, flow_step_id for full attribution.' },
                { title: 'Daily rollup job aggregates', desc: 'belief_daily_rollup: sends, deliveries, bounces, opens, clicks, replies (7 sentiment buckets), bookings, revenue.' },
                { title: 'Marketing Coach analyzes', desc: 'Coach agent queries rollups, identifies trends, compares angle performance by ICP segment.' },
                { title: 'Coach writes to brain_memories', desc: 'e.g., "Risk angle outperformed control by 34% for enterprise ICP over 7-day window. Confidence: 0.87."' },
                { title: 'Next execution inherits learnings', desc: 'Workflow processor loads top brain_memories + latest brain_reflection into every agent\'s system prompt.' },
            ]} />
            <H3 color={color}>What Gets Measured (belief_daily_rollup)</H3>
            <DataTable color={color} headers={['Section', 'Metrics', 'Computed Rates']} rows={[
                ['Deliverability', 'sends, deliveries, bounces, complaints', 'bounce_rate, complaint_rate (GENERATED ALWAYS AS STORED)'],
                ['Engagement', 'opens, clicks, replies', 'open_rate, click_rate, reply_rate'],
                ['Reply Quality', 'interested, clarification, objection, timing, referral, negative, noise', 'positive_reply_rate = (interested + referral) / total_replies'],
                ['Conversion', 'bookings, shows, revenue_cents', 'booking_rate, show_rate, revenue_per_1k_sends'],
            ]} />
            <Tip icon={<Lightbulb size={14} />} color="var(--color-warning)">
                All rates are PostgreSQL GENERATED ALWAYS AS STORED columns — zero compute at read time. The database pre-calculates them on every INSERT/UPDATE.
            </Tip>
        </div>
    )
}
