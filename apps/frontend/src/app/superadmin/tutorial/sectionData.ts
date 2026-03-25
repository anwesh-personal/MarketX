import {
    Layers, Brain, Bot, Sparkles, Workflow, Target, BarChart3,
    Mail, Shield, BookOpen, Database, Cpu, Users, Building2,
    FileText, Settings, Server, Activity, Package
} from 'lucide-react'
import React from 'react'

export interface TutorialSection {
    id: string
    icon: React.ReactNode
    title: string
    subtitle: string
    color: string
    route?: string
    group: 'flow' | 'superadmin' | 'member'
}

export const SECTIONS: TutorialSection[] = [
    // ─── MarketWriter Operational Flow ───
    { id: 'mw-overview', icon: React.createElement(Layers, { size: 20 }), color: 'var(--color-accent)', title: 'How MarketWriter Works', subtitle: 'End-to-end flow with live architecture diagram', group: 'flow' },
    { id: 'mw-onboarding', icon: React.createElement(Building2, { size: 20 }), color: '#10b981', title: 'Client Onboarding', subtitle: 'Create org → deploy engine bundle → configure email → client accesses portal', group: 'flow' },
    { id: 'mw-content', icon: React.createElement(Sparkles, { size: 20 }), color: '#f59e0b', title: 'Content Generation', subtitle: 'How agents build emails & pages using KB + Brain + Prompts', group: 'flow' },
    { id: 'mw-delivery', icon: React.createElement(Mail, { size: 20 }), color: '#ef4444', title: 'Email Delivery', subtitle: '5 SMTP servers · 5 TLDs · 5 IPs · 50 identities — satellite swarm', group: 'flow' },
    { id: 'mw-learning', icon: React.createElement(Database, { size: 20 }), color: '#8b5cf6', title: 'Self-Healing Loop', subtitle: 'MailWizz signals → rollups → coach → brain memories → smarter campaigns', group: 'flow' },

    // ─── Superadmin — one mega-section ───
    { id: 'sa-guide', icon: React.createElement(Shield, { size: 20 }), color: '#f59e0b', title: 'Complete Superadmin Reference', subtitle: 'Every admin page — what it does, key actions, when to use it', group: 'superadmin' },

    // ─── Member Portal — one mega-section ───
    { id: 'mb-guide', icon: React.createElement(Users, { size: 20 }), color: '#10b981', title: 'Member Portal Guide', subtitle: 'What clients see, feature tiers, upgrade wall, each page explained', group: 'member' },
]
