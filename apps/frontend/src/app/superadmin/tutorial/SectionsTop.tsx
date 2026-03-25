'use client'
import React from 'react'
import { Shield, Brain, Bot, Sparkles, Lightbulb, AlertTriangle, Database, Layers, Cpu, Workflow, BarChart3, Target, Mail, Lock } from 'lucide-react'
import { H3, P, StepList, FeatureGrid, Tip, CodeBlock, DataTable } from './TutorialPrimitives'
import { ArchitectureDiagram } from './TutorialNodes'

export function OverviewSection({ color }: { color: string }) {
    return (
        <div>
            <P>MarketX is a 3-in-1 multi-tenant marketing intelligence platform. It combines a Revenue System OS, an AI-powered Content Writer, and a Self-Healing Measurement Dashboard — all sharing a unified Brain that learns from every campaign.</P>

            <H3 color={color}>Live Architecture — Interactive Diagram</H3>
            <P>Drag to pan, scroll to zoom. Animated edges show data flow direction. Dashed lines = the feedback learning loop.</P>
            <ArchitectureDiagram />

            <H3 color={color}>The Three Pillars</H3>
            <FeatureGrid color={color} items={[
                { icon: <Layers size={16} />, title: 'Refinery Nexus (Data)', desc: 'Ingests raw contact data, verifies emails (9-check engine), segments by quality tiers (Gold→Silver→Bronze), and pushes verified leads to Axiom.' },
                { icon: <Brain size={16} />, title: 'Axiom / MarketWriter (Intelligence)', desc: 'AI Brain + Agent swarm writes emails, builds pages, researches prospects. Prompt Studio provides granular control over every prompt.' },
                { icon: <Mail size={16} />, title: 'MailWizz Satellites (Delivery)', desc: '50-server SMTP constellation with domain rotation, warmup pacing, and webhook feedback that feeds the learning loop.' },
            ]} />

            <H3 color={color}>How Data Flows</H3>
            <StepList color={color} steps={[
                { title: 'Raw leads enter Refinery Nexus', desc: 'S3/CSV upload → ClickHouse ingestion → 9-check email verification → quality segmentation (Gold/Silver/Bronze/Quarantine).' },
                { title: 'Verified leads flow to Axiom KB', desc: 'Gold-tier leads are pushed into the Knowledge Base with ICP data, offer context, and brand rules.' },
                { title: 'Brain loads context, Agent executes', desc: 'The Brain provides persona, guardrails, and learnings. Agents (Email Writer, Researcher, Page Builder) execute specific tasks with Prompt Studio blocks.' },
                { title: 'Workflows orchestrate multi-agent pipelines', desc: 'Visual workflow builder chains agents: Research → Write Email → Build Landing Page → Assign Campaign.' },
                { title: 'MailWizz delivers to inbox', desc: 'Content is dispatched through the 50-server swarm. Each server handles 3,000/day with warmup pacing.' },
                { title: 'Signals feed back to Brain', desc: 'MailWizz webhooks (open, click, reply, bounce, complaint) → signal_event table → Marketing Coach Agent → brain_memories. The system learns what works.' },
                { title: 'Next campaign is smarter', desc: 'Agents inherit updated brain learnings. Winning angles promoted, losing angles demoted. Guardrails auto-pause dangerous patterns.' },
            ]} />

            <Tip icon={<Lightbulb size={14} />} color="#f59e0b">
                This is not a content generator — it's a self-healing marketing infrastructure. The architecture ensures every decision is traceable, every outcome feeds learning, and every campaign gets smarter.
            </Tip>
        </div>
    )
}

export function BrainSection({ color }: { color: string }) {
    return (
        <div>
            <P>The Brain is the org-wide intelligence layer. Every agent inherits from it. It holds the canonical truth about your brand, ICP, offers, and everything learned from campaign data.</P>

            <H3 color={color}>What the Brain Contains</H3>
            <FeatureGrid color={color} items={[
                { icon: <Shield size={16} />, title: 'Foundation Prompt', desc: 'Core identity and capabilities. Defines WHO the brain is and what standards it upholds. Locked from clients.' },
                { icon: <Sparkles size={16} />, title: 'Persona Prompt', desc: 'Communication style, tone, personality traits. How the brain "speaks" through its agents.' },
                { icon: <Database size={16} />, title: 'Domain Knowledge', desc: 'Industry expertise, ICP understanding, offer details, competitive landscape. The brain\'s subject matter expertise.' },
                { icon: <Lock size={16} />, title: 'Guardrails Prompt', desc: 'Hard rules that override everything. CAN-SPAM compliance, forbidden claims, required disclosures. Cannot be bypassed.' },
            ]} />

            <H3 color={color}>Brain Learning System</H3>
            <DataTable color={color} headers={['Table', 'Purpose', 'How It Works']} rows={[
                ['brain_memories', 'Stores learned insights', 'Coach agent writes memories after analyzing campaign data. Tagged by importance (0-10).'],
                ['brain_reflections', 'Performance summaries', 'Periodic analysis: "Reply rate up 23% for risk angles on enterprise ICP"'],
                ['brain_learning_events', 'Audit trail', 'Every learning event logged with source signal, confidence, and recommendation.'],
            ]} />

            <H3 color={color}>Knowledge Base Schema (12 Sections)</H3>
            <StepList color={color} steps={[
                { title: 'Brand Identity', desc: 'Company name (exact spelling!), voice rules, compliance requirements, forbidden claims.' },
                { title: 'ICP Library', desc: 'Segments with industry, firm_size, revenue_band, seniority, pain_points, buying_triggers, decision_criteria.' },
                { title: 'Offer Library', desc: 'Each offer: value_proposition, differentiators, pricing_model, delivery_timeline, proof_points.' },
                { title: 'Angles Library', desc: '6 axes: risk, speed, control, loss, upside, identity. Each angle has a narrative and applicability rules.' },
                { title: 'Email Flow Blueprints', desc: 'Sequence structures: intro → value → proof → ask. Goal-oriented (MEANINGFUL_REPLY, BOOK_CALL).' },
                { title: 'CTA Library', desc: 'REPLY, CLICK, BOOK_CALL, DOWNLOAD. Each with destination and applicability context.' },
            ]} />

            <Tip icon={<Lightbulb size={14} />} color="#f59e0b">
                The Brain is the single source of truth. When an agent writes an email, it doesn't make up brand rules — it reads them from the Brain. When campaign data shows what works, it updates the Brain — not the agent code. This is the "KB learns, Writer executes" principle.
            </Tip>
        </div>
    )
}

export function AgentSection({ color }: { color: string }) {
    return (
        <div>
            <P>Agents are specialized executors. Each agent has a specific skill (writing emails, researching prospects, building pages) but inherits shared context from the Brain.</P>

            <H3 color={color}>Agent Architecture</H3>
            <DataTable color={color} headers={['Layer', 'Table', 'Purpose']} rows={[
                ['Templates', 'agent_templates', 'Platform-level agent blueprints (Email Writer, Researcher, etc). Created by superadmin.'],
                ['Brain Agents', 'brain_agents', 'Brain-scoped specializations. A brain can have multiple agents with different roles.'],
                ['Org Agents', 'org_agents', 'Client-deployed agents. Inherit from brain_agents. Can have own KB, custom overrides.'],
            ]} />

            <H3 color={color}>Built-In Agent Types</H3>
            <FeatureGrid color={color} items={[
                { icon: <Mail size={16} />, title: 'Email Writer', desc: 'Cold outreach specialist. Subject lines, body copy, CTAs. AIDA/PAS/BAB frameworks. CAN-SPAM compliant.' },
                { icon: <Target size={16} />, title: 'Researcher', desc: 'Prospect intelligence. Company analysis, decision-maker identification, pain point mapping.' },
                { icon: <Layers size={16} />, title: 'Page Builder', desc: 'Conversion-optimized HTML pages. Mobile-first, semantic HTML5, structured data, WCAG 2.1 AA.' },
                { icon: <BarChart3 size={16} />, title: 'Marketing Coach', desc: 'Data analyst brain. Evaluates campaign performance, identifies trends, recommends angle adjustments.' },
                { icon: <Sparkles size={16} />, title: 'Sales Copy', desc: 'Landing page copy, ad copy, social proof. FTC compliance, transparent pricing guardrails.' },
            ]} />

            <H3 color={color}>How Prompt Studio Powers Agents</H3>
            <StepList color={color} steps={[
                { title: 'Prompt blocks assigned to agent', desc: 'In Prompt Studio, assign blocks by category: foundation, persona, instruction, guardrails, domain, task.' },
                { title: 'At execution time, blocks loaded', desc: 'Workflow processor queries prompt_assignments → loads blocks in category order → builds system prompt.' },
                { title: 'Brain blocks come first', desc: 'Brain-level blocks (shared persona, org guardrails) are prepended. Agent-specific blocks follow.' },
                { title: 'Fallback to inline prompts', desc: 'If no Prompt Studio blocks assigned, falls back to inline text columns on brain_agents/org_agents.' },
            ]} />

            <H3 color={color}>Agent Decision Audit Trail</H3>
            <CodeBlock title="agent_decision_log — Every decision recorded">{`{
  "agent_type": "angle_selection",
  "decision": "Use 'risk' angle for Enterprise ICP",
  "confidence": 0.87,
  "reasoning": "Risk angle outperformed control by 34% over 7-day window",
  "knowledge_objects_used": ["ko_timing_001", "ko_angle_perf_003"],
  "inputs": { "icp_id": "ent_001", "metric_window_days": 7 },
  "outcome": null  // ← filled after campaign results
}`}</CodeBlock>

            <Tip icon={<AlertTriangle size={14} />} color="#ef4444">
                Every agent decision is logged with full context: what inputs it received, what knowledge objects it consulted, what it decided, and why. This audit trail is critical for debugging and for the learning loop to trace outcomes back to decisions.
            </Tip>
        </div>
    )
}
