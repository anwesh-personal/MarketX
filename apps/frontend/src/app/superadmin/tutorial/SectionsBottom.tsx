'use client'
import { RefreshCw, Lightbulb, AlertTriangle, Mail, Shield, Lock, Database } from 'lucide-react'
import { H3, P, StepList, FeatureGrid, DataTable, Tip, CodeBlock } from './TutorialPrimitives'

export function LearningSection({ color }: { color: string }) {
    return (
        <div>
            <P>The Learning Loop is the self-healing mechanism. MailWizz campaign data flows back into the Brain, making every subsequent campaign smarter.</P>
            <H3 color={color}>The Feedback Cycle</H3>
            <StepList color={color} steps={[
                { title: 'MailWizz fires webhooks', desc: 'Open, click, reply, bounce, complaint, unsubscribe events arrive in real-time.' },
                { title: 'signal_event table stores raw data', desc: 'Each event tagged with partner_id, belief_id, flow_id, flow_step_id for full attribution.' },
                { title: 'Daily rollup job aggregates', desc: 'belief_daily_rollup computed: sends, opens, replies, bookings, bounce/reply/booking rates.' },
                { title: 'Marketing Coach Agent analyzes', desc: 'Coach queries rollups, identifies trends, compares angles, segments by ICP.' },
                { title: 'Coach writes brain_memories', desc: '"Risk angle outperformed control by 34% for enterprise ICP over 7-day window."' },
                { title: 'Next workflow execution inherits learnings', desc: 'Workflow processor injects top 5 brain_memories + latest brain_reflection into agent system prompt.' },
            ]} />
            <H3 color={color}>Auto-Healing Safety Nets</H3>
            <FeatureGrid color={color} items={[
                { icon: <AlertTriangle size={16} />, title: 'Bounce Rate > 15%', desc: 'Belief auto-paused. Pattern logged in guardrails. Agent warned in next execution.' },
                { icon: <AlertTriangle size={16} />, title: 'Complaint Rate > 0.1%', desc: 'Immediate pause + alert. Never resume without manual review.' },
                { icon: <RefreshCw size={16} />, title: 'Provider Auto-Disable', desc: 'AI providers auto-disabled after 10 consecutive failures. Worker usage tracking.' },
            ]} />
        </div>
    )
}

export function DeliverySection({ color }: { color: string }) {
    return (
        <div>
            <P>Email delivery uses a 50-server SMTP constellation managed through MailWizz. Each server handles dedicated domains with independent IP reputation.</P>
            <H3 color={color}>Satellite Architecture</H3>
            <DataTable color={color} headers={['Component', 'Count', 'Purpose']} rows={[
                ['Delivery Servers', '50', 'Each handles 3,000 sends/day. Total capacity: 150,000/day.'],
                ['Sending Domains', '50+', 'One domain per server for reputation isolation.'],
                ['Dedicated IPs', '50', 'One IP per server. No shared IP risk.'],
                ['DKIM Keys', '50', 'Per-domain DKIM signing for authentication.'],
            ]} />
            <H3 color={color}>Warmup Strategy</H3>
            <StepList color={color} steps={[
                { title: 'Week 1: 50/day per server', desc: 'Start with tiny volume. Build initial reputation. Only Gold-tier leads.' },
                { title: 'Week 2: 200/day per server', desc: 'Increase 4x if bounce rate < 2% and no complaints.' },
                { title: 'Week 3: 1,000/day per server', desc: 'Mid-volume. Monitor inbox placement with seed tests.' },
                { title: 'Week 4+: 3,000/day per server', desc: 'Full capacity. Continue monitoring. Any spike in bounces = immediate pause.' },
            ]} />
        </div>
    )
}

export function SecuritySection({ color }: { color: string }) {
    return (
        <div>
            <P>Every table is protected by Row-Level Security (RLS). Users can only see their organization's data. Workers use service_role for cross-org operations.</P>
            <H3 color={color}>Defense in Depth</H3>
            <FeatureGrid color={color} items={[
                { icon: <Lock size={16} />, title: 'Org-Scoped RLS', desc: 'Every query filtered by org_id. Even if SQL injection occurs, data is isolated.' },
                { icon: <Shield size={16} />, title: 'Encrypted Provider Keys', desc: 'AI provider API keys encrypted at rest with SECRETS_ENCRYPTION_KEY. Decrypted only by workers.' },
                { icon: <Database size={16} />, title: 'Tier-Gated Features', desc: 'member_portal_config: 10 feature flags + 3 limits per tier (basic/medium/enterprise).' },
                { icon: <Mail size={16} />, title: 'Superadmin Auth', desc: 'Separate auth system with server-side token validation. Not tied to Supabase auth.' },
            ]} />
            <H3 color={color}>Feature Tiers</H3>
            <DataTable color={color} headers={['Feature', 'Basic', 'Medium', 'Enterprise']} rows={[
                ['View Metrics', '✅', '✅', '✅'],
                ['Chat with Brain', '❌', '✅', '✅'],
                ['Train Brain', '❌', '✅', '✅'],
                ['Write Emails', '❌', '❌', '✅'],
                ['Flow Builder', '❌', '❌', '✅'],
                ['Manage Satellites', '❌', '❌', '✅'],
                ['View Agent Decisions', '❌', '❌', '✅'],
            ]} />
        </div>
    )
}
