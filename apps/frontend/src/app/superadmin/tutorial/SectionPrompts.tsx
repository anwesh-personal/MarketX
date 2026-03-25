'use client'
import { Sparkles, Lightbulb, BookOpen, Shield, Layers } from 'lucide-react'
import { H3, P, StepList, FeatureGrid, DataTable, Tip } from './TutorialPrimitives'

export function PromptsSection({ color }: { color: string }) {
    return (
        <div>
            <P>Prompt Studio is a granular prompt management system. Instead of hardcoded text in agents, prompts are versioned, categorized, reusable blocks that can be assigned to any brain or agent.</P>
            <H3 color={color}>Categories</H3>
            <FeatureGrid color={color} items={[
                { icon: <Layers size={16} />, title: 'Foundation', desc: 'Core identity. Who the agent IS. Locked from clients.' },
                { icon: <Sparkles size={16} />, title: 'Persona', desc: 'Communication style, tone, personality.' },
                { icon: <BookOpen size={16} />, title: 'Instruction', desc: 'How to execute tasks. Email formulas, page structures.' },
                { icon: <Shield size={16} />, title: 'Guardrails', desc: 'Hard rules. Compliance, forbidden claims.' },
            ]} />
            <H3 color={color}>Assignment Flow</H3>
            <StepList color={color} steps={[
                { title: 'Create a prompt block', desc: 'Give it a slug, name, category, tags, and content. System prompts are protected from deletion.' },
                { title: 'Assign to a target', desc: 'Assign to brain_agent, org_agent, or agent_template. Set priority for ordering.' },
                { title: 'Execution-time injection', desc: 'Workflow processor loads blocks by priority, orders by category (foundation→persona→domain→instruction→guardrails→task).' },
            ]} />
            <H3 color={color}>Seed Library (15 Production Prompts)</H3>
            <DataTable color={color} headers={['Agent', 'Blocks', 'What They Cover']} rows={[
                ['Email Writer', '4 blocks', 'Foundation + Persona + Cold Email Formula + CAN-SPAM Guardrails'],
                ['Researcher', '3 blocks', 'Foundation + Methodology + Source Credibility Guardrails'],
                ['Sales Copy', '3 blocks', 'Foundation + Landing Page Structure + FTC Compliance'],
                ['Page Builder', '2 blocks', 'Foundation (conversion) + HTML/SEO/Accessibility Instructions'],
                ['Marketing Coach', '2 blocks', 'Foundation (analytics) + Statistical Rigor Guardrails'],
            ]} />
            <Tip icon={<Lightbulb size={14} />} color="#f59e0b">
                Prompt blocks enable A/B testing of prompts. Swap one instruction block and compare output quality — without touching agent code.
            </Tip>
        </div>
    )
}
