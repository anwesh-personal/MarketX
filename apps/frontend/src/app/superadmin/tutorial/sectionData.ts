import { BookOpen, Brain, Bot, Workflow, Mail, Shield, BarChart3, Target, Database, Sparkles, Cpu, Layers } from 'lucide-react'
import React from 'react'

export interface TutorialSection {
    id: string
    icon: React.ReactNode
    title: string
    subtitle: string
    color: string
    route?: string
}

export const SECTIONS: TutorialSection[] = [
    { id: 'overview', icon: React.createElement(Layers, { size: 20 }), color: 'var(--color-accent)', title: '🏗️ System Architecture', subtitle: 'The 3-in-1 multi-tenant platform — how all systems connect' },
    { id: 'brain', icon: React.createElement(Brain, { size: 20 }), color: '#a78bfa', title: '🧠 The Brain', subtitle: 'Org-wide intelligence layer — KB, personas, guardrails, learning memory' },
    { id: 'agents', icon: React.createElement(Bot, { size: 20 }), color: '#60a5fa', title: '🤖 Agent System', subtitle: 'Specialized executors with local KB, tools, and brain access' },
    { id: 'prompts', icon: React.createElement(Sparkles, { size: 20 }), color: '#f59e0b', title: '✨ Prompt Studio', subtitle: 'Versioned, reusable prompt blocks assigned to brains and agents', route: '/superadmin/prompt-library' },
    { id: 'workflows', icon: React.createElement(Workflow, { size: 20 }), color: '#10b981', title: '⚙️ Workflow Engine', subtitle: '36+ node types, visual builder, agent orchestration', route: '/superadmin/workflow-manager' },
    { id: 'beliefs', icon: React.createElement(Target, { size: 20 }), color: '#ec4899', title: '🎯 Belief System', subtitle: 'Champion/Challenger A/B testing with statistical promotion gates', route: '/superadmin/belief-dashboard' },
    { id: 'mastery', icon: React.createElement(Cpu, { size: 20 }), color: '#14b8a6', title: '🏆 Mastery Agents', subtitle: 'Knowledge objects with 3-scope promotion and decision audit trails', route: '/superadmin/mastery-agents' },
    { id: 'measurement', icon: React.createElement(BarChart3, { size: 20 }), color: '#f43f5e', title: '📊 Measurement System', subtitle: '12-section rollups: deliverability, engagement, reply quality, conversion' },
    { id: 'learning', icon: React.createElement(Database, { size: 20 }), color: '#8b5cf6', title: '🔄 Learning Loop', subtitle: 'Self-healing: MailWizz signals → coach analysis → brain memories → agent improvement' },
    { id: 'delivery', icon: React.createElement(Mail, { size: 20 }), color: '#ef4444', title: '📧 Email Delivery', subtitle: '50-server SMTP constellation with pacing, warmup, and reputation monitoring' },
    { id: 'security', icon: React.createElement(Shield, { size: 20 }), color: '#6366f1', title: '🛡️ Security & Multi-Tenancy', subtitle: 'Org-scoped RLS, encrypted provider keys, tier-gated feature access' },
]
