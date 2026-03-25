'use client'
import { Lightbulb } from 'lucide-react'
import { H3, P, DataTable, Tip } from './TutorialPrimitives'

export function SuperadminGuide({ color }: { color: string }) {
    return (
        <div>
            <P>Every superadmin page with what it does, what data it reads/writes, and when you'll use it.</P>

            <H3 color={color}>Platform Management</H3>
            <DataTable color={color} headers={['Page', 'What It Does', 'Key Actions']} rows={[
                ['Dashboard', 'Platform overview: active orgs, total users, knowledge bases, total runs, runs last 30d, MRR.', 'Quick links to create org, view users, licenses, analytics.'],
                ['Organizations', 'List all client orgs with plan, status, team size, KB count, run count. Search + filter by plan.', 'Create new org (name, slug, plan, limits). Click to edit/view details.'],
                ['Users', 'All platform users across orgs. Role, status, org membership, last active.', 'Create user, assign to org, change role (admin/member), suspend.'],
                ['Licenses', 'License keys tied to orgs. Tier, expiry, usage limits, activation status.', 'Generate license, assign tier, set expiry, track activations.'],
            ]} />

            <H3 color={color}>MarketX OS (Campaign Intelligence)</H3>
            <DataTable color={color} headers={['Page', 'What It Does', 'Key Actions']} rows={[
                ['Briefs', 'Marketing briefs = ICP×Offer hypotheses. Each brief becomes beliefs to test.', 'Create brief, lock for testing, view belief spawn status.'],
                ['Belief Dashboard', 'All beliefs across orgs with status (HYP→TEST→SW→IW→RW→GW→PAUSED). Competition pairs.', 'View confidence scores, pause/resume beliefs, see daily rollup metrics.'],
                ['ICP Manager', 'Ideal Customer Profiles: industry, seniority, firm size, pain points, buying triggers.', 'Create/edit ICPs, link to org/offer, view which campaigns use each ICP.'],
                ['Mastery Agents', 'Knowledge objects (30-field model) with 3-scope promotion: local → candidate → global.', 'Review KOs, promote/demote, see decision audit trail. 10 object types.'],
            ]} />

            <H3 color={color}>Automation</H3>
            <DataTable color={color} headers={['Page', 'What It Does', 'Key Actions']} rows={[
                ['Workflow Manager', 'Visual ReactFlow canvas. 36+ node types. Drag/drop. Agent nodes, logic nodes, integration nodes.', 'Build pipelines: Research → Write → Build Page → Send. Save as template.'],
                ['Engine Bundles', 'Master blueprints: Brain + Agents (with LLM/prompts/tools/RAG config) + Workflow + API key strategy.', 'Create bundle (3-tab: Basics + LLM + Agents). Deploy to org. View instances.'],
                ['Deployed Engines', 'Live engine instances per org. Shows status, run count, API key preview, overrides.', 'View/customize deployed instances. Track runs, check health.'],
            ]} />

            <H3 color={color}>AI & Brain</H3>
            <DataTable color={color} headers={['Page', 'What It Does', 'Key Actions']} rows={[
                ['AI Providers', 'API keys for OpenAI, Anthropic, Google, xAI, Mistral. Encrypted at rest.', 'Add/edit provider keys. Enable/disable. Usage tracking per provider.'],
                ['AI Models', 'Model registry: which models are available, pricing tier, capabilities, context window.', 'Enable/disable models. Set default model per tier.'],
                ['AI Playground', 'Test prompts against any model. Compare outputs side-by-side. Token counting.', 'Select model, enter prompt, run. Compare responses. No client data affected.'],
                ['Brain Templates', 'Blueprint brains with persona, guardrails, pricing tier. Each becomes org-specific when deployed.', 'Create brain template (name, tier). Deploy to org via Engine Bundle.'],
                ['Agent Templates', 'Blueprint agents: Email Writer, Researcher, Page Builder, Marketing Coach, Sales Copy.', 'Create agent with role, system prompt, LLM config, tools, RAG settings.'],
                ['Prompt Library', 'Versioned prompt blocks: foundation, persona, instruction, guardrails, domain, task.', 'Create blocks, assign to brain_agents or org_agents. Priority ordering.'],
                ['Tool Registry', 'Available tools agents can call: write_email, search_kb, get_icp, fetch_metrics, etc.', 'View all tools, enable/disable. See which agents have access.'],
            ]} />

            <H3 color={color}>Infrastructure</H3>
            <DataTable color={color} headers={['Page', 'What It Does', 'Key Actions']} rows={[
                ['Infrastructure', 'System-level settings: DB connection, Redis, worker pool, email domain config.', 'View system health, connection status, configuration.'],
                ['Email Providers', 'SMTP satellites: server address, port, auth, sending domains, DKIM keys.', 'Add SMTP server, test connection, enable/disable, view send stats.'],
                ['Background Jobs', 'Redis/BullMQ queue monitor: pending, active, completed, failed jobs per queue.', 'View queue depths, retry failed jobs, clear dead letters.'],
                ['Workers', 'Worker process status: uptime, memory, jobs processed, error rate.', 'Monitor worker health, restart stalled workers.'],
                ['Platform Config', 'Global config: belief promotion thresholds, warmup pacing, AI fallback rules.', 'Edit config_table values. Changes apply globally.'],
                ['Portal Tiers', 'Feature flags per tier (basic/medium/enterprise): 10 toggles + 3 limits.', 'Configure which features each tier unlocks for members.'],
                ['Analytics', 'Platform-wide analytics: runs by day, success rate, provider usage, cost breakdown.', 'View trends, filter by date range, export data.'],
                ['Settings', 'System settings: sending domains, DNS config, notification preferences.', 'Configure domains, verify DNS, set notification rules.'],
            ]} />

            <Tip icon={<Lightbulb size={14} />} color="#f59e0b">
                The core workflow is: create org → create brain/agent/workflow templates → package into Engine Bundle → deploy to org. Engine Bundles are the primary deployment mechanism.
            </Tip>
        </div>
    )
}
