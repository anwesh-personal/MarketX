export interface MemberSlide {
    id: string
    title: string
    narration: string
    icon: string
    color: string
    features?: { icon: string; label: string; desc: string }[]
    route?: string
    duration: number
}

export const MEMBER_SLIDES: MemberSlide[] = [
    {
        id: 'welcome', title: 'Welcome to MarketWriter',
        narration: 'Your AI-powered marketing engine. We write emails, build landing pages, and learn from every campaign to get smarter over time.',
        icon: '🚀', color: 'var(--color-accent)', duration: 5,
    },
    {
        id: 'dashboard', title: 'Your Dashboard',
        narration: 'See all your campaign stats at a glance — total runs, success rate, knowledge bases, and recent activity.',
        icon: '📊', color: '#6366f1', route: '/dashboard', duration: 6,
        features: [
            { icon: '⚡', label: 'Total Runs', desc: 'Track how many campaigns have been generated' },
            { icon: '✅', label: 'Success Rate', desc: 'Percentage of campaigns that completed successfully' },
            { icon: '📚', label: 'Knowledge Bases', desc: 'Your uploaded brand docs, ICP specs, and offer details' },
        ],
    },
    {
        id: 'kb', title: 'Knowledge Base',
        narration: 'Upload your brand guidelines, ICP profiles, and offer specs. The Brain reads these to write content that sounds like YOU.',
        icon: '📚', color: '#10b981', route: '/kb-manager', duration: 7,
        features: [
            { icon: '📄', label: 'Upload Docs', desc: 'Brand guide, ICP spec, offer details, competitor analysis' },
            { icon: '🔍', label: 'AI-Indexed', desc: 'Documents are chunked, embedded, and searchable by your agents' },
            { icon: '📝', label: 'Version Tracked', desc: 'Every update is versioned — roll back anytime' },
        ],
    },
    {
        id: 'brain', title: 'Chat with Your Brain',
        narration: 'Ask your AI Brain anything — "What\'s working for enterprise ICP?" "Draft a follow-up for cold leads." It knows your brand, your data, your results.',
        icon: '🧠', color: '#8b5cf6', route: '/brain-chat', duration: 7,
        features: [
            { icon: '💬', label: 'Natural Conversation', desc: 'Ask questions in plain English' },
            { icon: '📊', label: 'Data-Informed', desc: 'Brain knows your campaign results and what\'s working' },
            { icon: '🎯', label: 'Brand-Aware', desc: 'Responses follow your voice, tone, and guardrails' },
        ],
    },
    {
        id: 'writer', title: 'Writer Studio',
        narration: 'Generate campaigns on demand. Select a knowledge base, pick your approach, and let the agents craft emails and pages — all reviewed before sending.',
        icon: '✍️', color: '#f59e0b', route: '/writer', duration: 7,
        features: [
            { icon: '📧', label: 'Email Campaigns', desc: 'Cold outreach, nurture sequences, follow-ups' },
            { icon: '🌐', label: 'Landing Pages', desc: 'Conversion-optimized HTML pages, mobile-first' },
            { icon: '👀', label: 'Review & Approve', desc: 'Nothing sends without your approval' },
        ],
    },
    {
        id: 'learning', title: 'Learning Loop',
        narration: 'Every campaign teaches the Brain something new. Opens, clicks, replies — all analyzed. Your next campaign automatically improves.',
        icon: '🔄', color: '#ec4899', route: '/learning', duration: 6,
        features: [
            { icon: '📈', label: 'Memories', desc: '"Risk angle works 2x better for enterprise" — learned from data' },
            { icon: '🎯', label: 'Reflections', desc: 'Weekly summaries of what\'s improving and what needs attention' },
            { icon: '💡', label: 'Auto-Applied', desc: 'Next campaign inherits all learnings automatically' },
        ],
    },
    {
        id: 'portal', title: 'Campaign Portal',
        narration: 'See the big picture — total sends, reply rates, booked calls, revenue per 1K sends, satellite health, and belief performance across all your campaigns.',
        icon: '🏆', color: '#14b8a6', route: '/portal', duration: 6,
        features: [
            { icon: '💰', label: 'Revenue Tracking', desc: 'Booked calls, show rate, revenue attribution' },
            { icon: '📊', label: 'Belief Competition', desc: 'See which marketing angles are winning' },
            { icon: '🛡️', label: 'Delivery Health', desc: 'Satellite reputation and deliverability monitoring' },
        ],
    },
    {
        id: 'outro', title: 'Let\'s Get Started',
        narration: 'Upload your brand docs to the Knowledge Base. Chat with your Brain. Launch your first campaign. The system handles the rest.',
        icon: '✨', color: 'var(--color-accent)', duration: 5,
    },
]
