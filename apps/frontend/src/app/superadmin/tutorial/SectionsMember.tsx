'use client'
import { Lightbulb, Lock } from 'lucide-react'
import { H3, P, DataTable, Tip, FeatureGrid } from './TutorialPrimitives'

export function MemberGuide({ color }: { color: string }) {
    return (
        <div>
            <P>This is what your clients see after logging in. Access depends on their org's portal tier (basic/medium/enterprise). Gated features show an upgrade wall.</P>

            <H3 color={color}>Member Pages</H3>
            <DataTable color={color} headers={['Page', 'What Clients See', 'Feature Gate']} rows={[
                ['Dashboard', 'Total runs, successful/failed, KBs created, runs this week. Onboarding checklist (completion %). Quick actions.', 'Always visible'],
                ['Brain Chat', 'Chat with their org\'s AI brain. Ask about ICP, strategy, campaign results. Full markdown + code rendering. Chat history.', 'Requires chat_with_brain feature flag'],
                ['Brain Control', 'View brain\'s active agents, knowledge base stats, learning metrics, decision history. Control panel for brain settings.', 'Requires train_brain feature flag'],
                ['KB Manager', 'Create/manage knowledge bases. Upload docs (brand guide, ICP spec, offers). Version tracking.', 'Always visible'],
                ['Writer', 'View all workflow runs: status (pending/running/completed/failed), output preview, timestamps. Launch new runs.', 'Requires write_emails feature flag'],
                ['Learning', 'View brain memories, knowledge gaps, reflections, dreams. Tabs: Memories | Gaps | Reflections | Dreams.', 'Always visible'],
                ['Portal', 'Campaign dashboard: sends, reply rate, booked calls, show rate, revenue, revenue/1k sends. Satellite health. Belief status distribution.', 'Always visible'],
                ['Analytics', 'Run analytics: total runs, success/fail breakdown, avg duration, runs-by-day chart, success rate trend.', 'Always visible'],
                ['Settings', 'User profile: name, email, org info, plan. Logout.', 'Always visible'],
            ]} />

            <H3 color={color}>Feature Tiers (Portal Config)</H3>
            <P>Configured in Superadmin → Portal Tiers. Each tier unlocks specific capabilities:</P>
            <DataTable color={color} headers={['Feature Flag', 'Basic', 'Medium', 'Enterprise']} rows={[
                ['view_metrics', '✅', '✅', '✅'],
                ['chat_with_brain', '❌', '✅', '✅'],
                ['train_brain', '❌', '✅', '✅'],
                ['write_emails', '❌', '❌', '✅'],
                ['flow_builder', '❌', '❌', '✅'],
                ['manage_satellites', '❌', '❌', '✅'],
                ['view_agent_decisions', '❌', '❌', '✅'],
                ['advanced_analytics', '❌', '❌', '✅'],
                ['export_data', '❌', '❌', '✅'],
                ['custom_prompt_library', '❌', '❌', '✅'],
            ]} />

            <H3 color={color}>How Gating Works</H3>
            <P>Every member page calls <code className="text-xs bg-surfaceHover px-1 rounded">useFeatureGate('feature_name')</code>. If the feature is disabled for their tier, they see an <code className="text-xs bg-surfaceHover px-1 rounded">{'<UpgradeWall />'}</code> component instead of the page content — showing what tier they need to unlock the feature.</P>

            <Tip icon={<Lightbulb size={14} />} color="var(--color-warning)">
                Clients start on basic (view-only metrics), upgrade to medium (brain chat + training), then enterprise (full AI writing + flow building + satellite management). This is the upsell path.
            </Tip>
        </div>
    )
}
