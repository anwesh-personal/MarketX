'use client'
import { Lightbulb, Building2, Brain, Bot, Workflow, Mail, Shield, Key, Package, Users, Database, Sparkles } from 'lucide-react'
import { H3, P, StepList, FeatureGrid, Tip, DataTable } from './TutorialPrimitives'
import { ArchitectureDiagram } from './TutorialNodes'

export function MWOverviewSection({ color }: { color: string }) {
    return (
        <div>
            <P>MarketWriter is an AI-powered campaign engine. You create client organizations, assign them a Brain (with knowledge + prompts), deploy agents that write content, wire it through MailWizz satellites for delivery, and the system learns from every campaign's results.</P>
            <H3 color={color}>Live Architecture</H3>
            <P>Drag to pan, scroll to zoom. Animated edges = live data flow. Dashed lines = the feedback loop where MailWizz signals feed back into Brain.</P>
            <ArchitectureDiagram />
            <H3 color={color}>The Operational Flow</H3>
            <StepList color={color} steps={[
                { title: '1. Create Organization', desc: 'Superadmin → Organizations → Create. Sets up the client with name, slug, plan (free/starter/pro/enterprise), team limits, KB limits, run limits.' },
                { title: '2. Create Brain Template', desc: 'Superadmin → Brain Templates. Define persona, guardrails, pricing tier. This is the intelligence blueprint.' },
                { title: '3. Create Agent Templates', desc: 'Superadmin → Agent Templates. Email Writer, Researcher, Page Builder, Marketing Coach. Each with role, system prompt, tools, LLM config.' },
                { title: '4. Build Workflow', desc: 'Superadmin → Workflow Manager. Visual drag-and-drop pipeline: Research → Write → Build Page → Send. 36+ node types.' },
                { title: '5. Package into Engine Bundle', desc: 'Superadmin → Engine Bundles. Bundle = Brain Template + Agent Config + Workflow + LLM Config + API Key Strategy. One-click packaging.' },
                { title: '6. Deploy Bundle to Client Org', desc: 'Click Deploy on a bundle → select org. Creates brain_agents, org_agents, assigns workflow, generates API key. Full isolation.' },
                { title: '7. Client uploads KB', desc: 'Member portal → KB Manager. Client uploads brand docs, ICP info, offers. Brain ingests and indexes.' },
                { title: '8. Run campaigns', desc: 'Workflows fire (manual/scheduled). Agents write emails/pages using KB + Brain + Prompts. Content dispatched via MailWizz.' },
                { title: '9. Signals feed back', desc: 'MailWizz webhooks (open/click/reply/bounce/complaint) → signal_event → daily rollups → Coach analyzes → Brain learns.' },
            ]} />
            <Tip icon={<Lightbulb size={14} />} color="#f59e0b">
                The key insight: you build templates ONCE, then deploy to unlimited clients. Each client gets isolated copies. Changes to templates don't affect deployed instances — they're snapshots.
            </Tip>
        </div>
    )
}

export function MWOnboardingSection({ color }: { color: string }) {
    return (
        <div>
            <P>Onboarding a new client is a multi-step process in superadmin. Here's the exact steps with what each one does.</P>
            <H3 color={color}>Step 1: Create the Organization</H3>
            <P>Go to Superadmin → Organizations → Create Organization. The modal asks for:</P>
            <DataTable color={color} headers={['Field', 'What It Does']} rows={[
                ['Name', 'Client company name (e.g., "Acme Corp")'],
                ['Slug', 'URL-safe identifier (auto-generated from name)'],
                ['Plan', 'free / starter / pro / enterprise — controls feature limits'],
                ['Max Team Members', 'How many users can join this org'],
                ['Max KBs', 'How many knowledge bases the client can create'],
                ['Max Runs/Month', 'Monthly cap on workflow executions'],
            ]} />
            <P>This creates a row in <code className="text-xs bg-surfaceHover px-1 rounded">organizations</code> and auto-creates a <code className="text-xs bg-surfaceHover px-1 rounded">partner</code> row (1:1 mapping for RS:OS).</P>

            <H3 color={color}>Step 2: Deploy an Engine Bundle</H3>
            <P>Go to Superadmin → Engine Bundles → pick a bundle → click Deploy.</P>
            <StepList color={color} steps={[
                { title: 'Select target organization', desc: 'Pick which client org receives this deployment.' },
                { title: 'Bundle gets cloned', desc: 'Brain template → creates brain_agents. Agent configs → creates org_agents. Workflow → assigns. API key → generated.' },
                { title: 'Instance is live', desc: 'The deployed engine shows up in Superadmin → Deployed Engines with status, runs count, and API key preview.' },
            ]} />

            <H3 color={color}>Step 3: Configure Email Sending</H3>
            <P>Go to Superadmin → Email Providers. Add SMTP satellites for this client or assign shared satellite pools.</P>
            <FeatureGrid color={color} items={[
                { icon: <Mail size={16} />, title: '5 SMTP Servers', desc: 'Each server handles sending with independent IP reputation.' },
                { icon: <Key size={16} />, title: '5 TLDs / Sending Domains', desc: 'One domain per server for reputation isolation.' },
                { icon: <Shield size={16} />, title: '5 Dedicated IPs', desc: 'One IP per server — no shared sending risk.' },
                { icon: <Users size={16} />, title: '50 Sending Identities', desc: '10 identities per server (variations of from-name/from-email) for warmup and rotation.' },
            ]} />

            <H3 color={color}>Step 4: Client Accesses Member Portal</H3>
            <P>Create a user for the client with role='member'. They log in and see the member portal — dashboard, brain chat, KB manager, writer, analytics. Feature access depends on their org's tier.</P>
        </div>
    )
}
