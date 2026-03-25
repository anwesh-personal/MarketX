'use client'
import { Workflow, Lightbulb, Zap, Bot, Mail, Database } from 'lucide-react'
import { H3, P, StepList, FeatureGrid, Tip, CodeBlock } from './TutorialPrimitives'

export function WorkflowSection({ color }: { color: string }) {
    return (
        <div>
            <P>The Workflow Engine is a visual, node-based pipeline builder. Chain agents, conditionals, and integrations into complex automation flows — all executed by BullMQ workers.</P>
            <H3 color={color}>Node Types (36+)</H3>
            <FeatureGrid color={color} items={[
                { icon: <Bot size={16} />, title: 'Agent Nodes', desc: 'Any agent-* node invokes an org_agent. Loads prompt blocks, KB, brain context automatically.' },
                { icon: <Zap size={16} />, title: 'Logic Nodes', desc: 'Conditional branching, loops, delays, variable transforms, JSON parsers.' },
                { icon: <Mail size={16} />, title: 'Integration Nodes', desc: 'MailWizz campaign dispatch, webhook triggers, HTTP calls, email sending.' },
                { icon: <Database size={16} />, title: 'Data Nodes', desc: 'KB lookup, brain memory query, Supabase reads/writes, context injection.' },
            ]} />
            <H3 color={color}>Execution Flow</H3>
            <StepList color={color} steps={[
                { title: 'Trigger fires', desc: 'Manual, scheduled (cron), webhook, or signal_event trigger starts the workflow.' },
                { title: 'Topological sort', desc: 'Nodes are sorted by dependency. Independent branches can run in parallel.' },
                { title: 'Node-by-node execution', desc: 'Each node runs, outputs feed into the next node\'s inputs via pipelineData.' },
                { title: 'Agent nodes load full context', desc: 'org_agent → brain_agents join → prompt_blocks → agent KB → brain KB → brain learnings → brain reflections. All injected into system prompt.' },
                { title: 'Results stored', desc: 'Each node\'s output + AI metadata (tokens, cost, provider, model, duration) saved to execution log.' },
            ]} />
            <CodeBlock title="Example: Email Campaign Workflow">{`Start → Research ICP
  → Write Cold Email (Email Writer Agent)
  → Build Landing Page (Page Builder Agent)
  → Review & Approve (Human-in-loop)
  → Push to MailWizz
  → Wait for Signals
  → Coach Analyzes Results
  → Update Brain Memories`}</CodeBlock>
            <Tip icon={<Lightbulb size={14} />} color="#f59e0b">
                Workflows are versioned. You can duplicate, modify, and A/B test entire pipeline configurations without affecting live campaigns.
            </Tip>
        </div>
    )
}
