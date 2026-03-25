export interface WalkthroughSlide {
    id: string
    title: string
    narration: string
    visual: 'architecture' | 'flow-step' | 'highlight'
    icon: string
    color: string
    highlights?: string[]  // node IDs to pulse in diagram
    steps?: { label: string; desc: string }[]
    duration: number  // seconds
}

export const WALKTHROUGH_SLIDES: WalkthroughSlide[] = [
    {
        id: 'intro',
        title: 'Welcome to MarketWriter',
        narration: 'MarketWriter is a 3-in-1 AI marketing platform. It combines data verification, intelligent content generation, and self-improving email delivery into one system.',
        visual: 'highlight',
        icon: '🚀',
        color: 'var(--color-accent)',
        duration: 6,
    },
    {
        id: 'data-in',
        title: 'Step 1 — Data Enters via Refinery',
        narration: 'Raw leads are uploaded to Refinery Nexus. A 9-check email verification pipeline scores each contact. Only Gold-tier leads proceed to MarketWriter.',
        visual: 'flow-step',
        icon: '🏭',
        color: '#10b981',
        highlights: ['refinery', 'kb'],
        steps: [
            { label: 'Upload', desc: 'CSV or S3 batch upload into ClickHouse' },
            { label: 'Verify', desc: '9-check pipeline: syntax, MX, SMTP, catch-all, disposable...' },
            { label: 'Segment', desc: 'Gold → Silver → Bronze → Quarantine by quality score' },
            { label: 'Push', desc: 'Gold leads flow to Axiom Knowledge Base' },
        ],
        duration: 8,
    },
    {
        id: 'brain-loads',
        title: 'Step 2 — Brain Loads Intelligence',
        narration: 'The Brain is the org-wide intelligence layer. It holds your brand identity, ICP profiles, offer details, guardrails, and everything learned from past campaigns.',
        visual: 'flow-step',
        icon: '🧠',
        color: '#8b5cf6',
        highlights: ['kb', 'brain'],
        steps: [
            { label: 'KB indexed', desc: 'Brand docs, ICP specs, offers chunked + embedded' },
            { label: 'Brain configured', desc: 'Persona, guardrails, domain knowledge loaded' },
            { label: 'Memories loaded', desc: 'Past learnings: "Risk angle works 2x for enterprise"' },
        ],
        duration: 7,
    },
    {
        id: 'agents-write',
        title: 'Step 3 — Agents Write Content',
        narration: 'Specialized agents execute tasks. The Email Writer crafts cold emails. The Researcher builds prospect dossiers. The Page Builder creates landing pages. Each inherits Brain context + Prompt Studio blocks.',
        visual: 'flow-step',
        icon: '🤖',
        color: '#60a5fa',
        highlights: ['prompts', 'agents', 'brain'],
        steps: [
            { label: 'Prompt Assembly', desc: 'Foundation → Persona → Domain → Instruction → Guardrails → Task' },
            { label: 'Agent Executes', desc: 'LLM call with full context: KB + Brain + Prompts + Pipeline data' },
            { label: 'Output Logged', desc: 'Tokens, cost, model, duration — all tracked per execution' },
        ],
        duration: 8,
    },
    {
        id: 'workflow-runs',
        title: 'Step 4 — Workflows Orchestrate',
        narration: 'The visual workflow engine chains agents into pipelines. Research → Write Email → Build Landing Page → Review → Dispatch. 36+ node types with conditional branching and loops.',
        visual: 'flow-step',
        icon: '⚙️',
        color: '#14b8a6',
        highlights: ['workflow', 'content'],
        steps: [
            { label: 'Trigger', desc: 'Manual, cron schedule, webhook, or signal event' },
            { label: 'Pipeline', desc: 'Nodes execute in dependency order, passing data forward' },
            { label: 'Content out', desc: 'Emails and pages ready for dispatch' },
        ],
        duration: 7,
    },
    {
        id: 'delivery',
        title: 'Step 5 — Email Delivery',
        narration: '5 SMTP servers with 5 dedicated IPs, 5 domains, and 50 sending identities. Warmup pacing from 50/day to 3,000/day per server. Total capacity: 15,000 emails/day.',
        visual: 'flow-step',
        icon: '📧',
        color: '#ef4444',
        highlights: ['mailwizz'],
        steps: [
            { label: 'Route', desc: 'Content dispatched through satellite swarm' },
            { label: 'Send', desc: 'Domain rotation, DKIM signing, per-server pacing' },
            { label: 'Deliver', desc: 'Inbox placement with reputation monitoring' },
        ],
        duration: 7,
    },
    {
        id: 'feedback',
        title: 'Step 6 — The Learning Loop',
        narration: 'MailWizz fires webhooks for every event: opens, clicks, replies, bounces. These signals aggregate into daily rollups. The Marketing Coach analyzes trends and writes learnings back to the Brain. Next campaign is smarter.',
        visual: 'flow-step',
        icon: '🔄',
        color: '#6366f1',
        highlights: ['signals', 'coach', 'brain'],
        steps: [
            { label: 'Signals arrive', desc: 'Open, click, reply, bounce, complaint webhooks' },
            { label: 'Rollups computed', desc: 'Daily aggregation: rates auto-calculated by Postgres' },
            { label: 'Coach analyzes', desc: 'Identifies winning angles, failing patterns, ICP trends' },
            { label: 'Brain updates', desc: 'New memories + reflections → all agents inherit learnings' },
        ],
        duration: 9,
    },
    {
        id: 'outro',
        title: 'Self-Improving AI Marketing',
        narration: 'Every campaign makes the next one better. Beliefs compete. Winners get more traffic. Losers get paused. The Brain remembers what works. That\'s MarketWriter.',
        visual: 'highlight',
        icon: '✨',
        color: 'var(--color-accent)',
        duration: 5,
    },
]
