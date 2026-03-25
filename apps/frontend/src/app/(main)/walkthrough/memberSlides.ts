export interface MemberSlide {
    id: string
    title: string
    narration: string
    icon: string
    color: string
    features?: { icon: string; label: string; desc: string }[]
    route?: string
    duration: number
    /** Optional "why" explanation for ADHD-friendly context */
    why?: string
    /** Step number in the overall workflow (0 = bookend) */
    step?: number
}

export const MEMBER_SLIDES: MemberSlide[] = [
    {
        id: 'welcome', title: 'Welcome to MarketWriter',
        narration: 'MarketWriter is your AI marketing system. It writes emails, builds landing pages, sends them through a swarm of email servers, tracks what works, and gets SMARTER over time — automatically.',
        icon: '🚀', color: 'var(--color-accent)', duration: 6,
        why: 'Think of it as a full marketing team in a box: a researcher, a copywriter, a strategist, and a data analyst — all powered by AI and trained on YOUR brand.',
    },

    // ─── STEP 1: Onboarding ───
    {
        id: 'onboarding', title: 'Step 1: Complete Onboarding',
        narration: 'When you first log in, you\'ll see an onboarding wizard. Fill in your company info, who your ideal customers are (ICPs), what you\'re selling (your Offer), and how you want to sound (your Voice).',
        icon: '📋', color: '#6366f1', route: '/dashboard', duration: 8, step: 1,
        why: 'This is how the Brain learns about YOUR business. Skip this and the AI writes generic emails. Complete it and every email sounds like it was written by someone who deeply understands your product.',
        features: [
            { icon: '🏢', label: 'Company Info', desc: 'Your company name, industry, what makes you different' },
            { icon: '🎯', label: 'ICPs (Ideal Customers)', desc: 'WHO you\'re selling to — their job title, industry, pain points, buying triggers' },
            { icon: '💎', label: 'Your Offer', desc: 'WHAT you\'re selling — your product/service, unique promise, pricing tier' },
            { icon: '🗣️', label: 'Your Voice', desc: 'HOW you want to sound — formal vs casual, technical vs simple, brand personality' },
        ],
    },

    // ─── STEP 2: Knowledge Base ───
    {
        id: 'kb', title: 'Step 2: Feed the Knowledge Base',
        narration: 'Upload documents that teach the Brain about your world. Brand guidelines, case studies, competitor analysis, product sheets — anything that helps the AI write like an insider.',
        icon: '📚', color: '#10b981', route: '/kb-manager', duration: 8, step: 2,
        why: 'The Knowledge Base is the Brain\'s memory. Without it, the AI guesses. WITH it, the AI pulls real facts, stats, and language from YOUR documents into every email and page it writes.',
        features: [
            { icon: '📄', label: 'Upload Any Doc', desc: 'PDF, DOCX, TXT — brand guide, case studies, whitepapers, competitor intel' },
            { icon: '🧠', label: 'AI Reads & Indexes', desc: 'Documents are split into chunks, embedded as vectors, and searchable by the Brain' },
            { icon: '📝', label: 'Version History', desc: 'Update docs anytime — old versions are preserved for rollback' },
            { icon: '🔗', label: 'Auto-Connected', desc: 'The Writer and Brain Chat automatically pull from your KB — no manual linking needed' },
        ],
    },

    // ─── STEP 3: Brain Chat ───
    {
        id: 'brain', title: 'Step 3: Talk to Your Brain',
        narration: 'Your Brain is a custom AI trained on your brand, your data, and your campaign results. Ask it anything — "What angle works best for enterprise?" "Draft a subject line for CTOs." "What did we learn from last month?"',
        icon: '🧠', color: '#8b5cf6', route: '/brain-chat', duration: 8, step: 3,
        why: 'Unlike ChatGPT, your Brain already KNOWS your business. It\'s read your KB, seen your campaign results, and built "memories" about what works. You\'re not starting from zero — you\'re having a conversation with an AI that understands your market.',
        features: [
            { icon: '💬', label: 'Natural Chat', desc: 'Talk in plain English — "What subject lines got the most replies last week?"' },
            { icon: '📊', label: 'Data-Backed Answers', desc: 'Brain cites campaign metrics, KB content, and learned patterns in its responses' },
            { icon: '🎨', label: 'Rich Formatting', desc: 'Markdown, tables, code blocks — Brain can output structured content' },
            { icon: '📜', label: 'Chat History', desc: 'Previous conversations are saved — pick up where you left off' },
        ],
    },

    // ─── STEP 4: Writer Studio ───
    {
        id: 'writer', title: 'Step 4: Generate Campaigns',
        narration: 'Hit "New Campaign" in Writer Studio. Tell it what you want — a cold outreach sequence, a nurture series, a follow-up sequence. The AI agents collaborate to write every email, subject line, and landing page.',
        icon: '✍️', color: '#f59e0b', route: '/writer', duration: 8, step: 4,
        why: 'This is where content gets CREATED. Behind the scenes, multiple AI agents work together: a Researcher analyzes your ICP, a Copywriter drafts the emails, a Coach reviews quality. You just describe what you need and review the output.',
        features: [
            { icon: '📧', label: 'Email Sequences', desc: 'Multi-step campaigns — cold outreach, nurture, re-engagement, follow-ups' },
            { icon: '🌐', label: 'Landing Pages', desc: 'Conversion-optimized HTML pages generated from your offer + ICP context' },
            { icon: '👀', label: 'Review Before Send', desc: 'NOTHING sends without your approval — preview and edit anything' },
            { icon: '🔄', label: 'Regenerate', desc: 'Don\'t like an email? Click regenerate for a fresh version with new angle' },
        ],
    },

    // ─── STEP 5: Brain Control ───
    {
        id: 'brain-control', title: 'Step 5: Fine-Tune the Brain',
        narration: 'Brain Control shows you everything happening under the hood: which agents are active, how many documents are indexed, what the Brain has learned, and its decision history. You can tune settings here.',
        icon: '🎛️', color: '#0ea5e9', route: '/brain-control', duration: 7, step: 5,
        why: 'You don\'t HAVE to touch this — the Brain self-improves. But if you want to see WHY it chose a specific angle, or adjust how creative vs. conservative it is, this is where you do it.',
        features: [
            { icon: '🤖', label: 'Active Agents', desc: 'See which AI agents are deployed for your org and their roles' },
            { icon: '📊', label: 'Brain Analytics', desc: 'Messages processed, tokens used, response quality over time' },
            { icon: '💡', label: 'Decision Log', desc: 'Why the Brain chose a specific angle, template, or approach — audit trail' },
            { icon: '⚙️', label: 'Settings', desc: 'RAG configuration, temperature, grounding strictness, model selection' },
        ],
    },

    // ─── STEP 6: Learning Loop ───
    {
        id: 'learning', title: 'Step 6: Watch It Learn',
        narration: 'The Learning Loop is the magic sauce. Every email sent generates data — opens, clicks, replies, bookings. The system analyzes ALL of it and creates "memories" and "reflections" that make future campaigns better.',
        icon: '🔄', color: '#ec4899', route: '/learning', duration: 8, step: 6,
        why: 'This is WHY campaigns get better over time without you doing anything. The Brain literally remembers "Risk-angle emails for enterprise CTOs have 3x the reply rate" and applies that to every future campaign automatically.',
        features: [
            { icon: '🧠', label: 'Memories', desc: 'Learned facts: "Pain-point emails outperform feature emails for Series A startups"' },
            { icon: '🔍', label: 'Knowledge Gaps', desc: 'What the Brain doesn\'t know yet — areas where it needs more training data' },
            { icon: '📝', label: 'Reflections', desc: 'Weekly summaries: "This week, subject lines with numbers had 2x higher open rates"' },
            { icon: '💭', label: 'Dreams', desc: 'The Brain\'s self-generated hypotheses about what might work — tested in next campaigns' },
        ],
    },

    // ─── STEP 7: Dashboard & Portal ───
    {
        id: 'dashboard', title: 'Step 7: Track Everything',
        narration: 'Your Dashboard shows quick stats — total runs, success rate, recent activity. The Portal goes deeper — total sends, reply rates, booked calls, revenue per 1K sends, and which marketing "beliefs" are winning.',
        icon: '📊', color: '#14b8a6', route: '/portal', duration: 7, step: 7,
        why: 'The Dashboard is your daily check-in. The Portal is your weekly strategy review — see which approaches are actually driving revenue and double down on winners.',
        features: [
            { icon: '⚡', label: 'Dashboard', desc: 'Total runs, success rate, KBs, recent activity — your daily snapshot' },
            { icon: '💰', label: 'Revenue Tracking', desc: 'Booked calls, show rate, revenue — tied to specific campaigns and beliefs' },
            { icon: '🏆', label: 'Belief Competition', desc: '"Which marketing angle is winning?" — champion vs challenger A/B testing' },
            { icon: '🛡️', label: 'Delivery Health', desc: 'Email reputation scores, bounce rates, complaint rates across your sending servers' },
        ],
    },

    // ─── Outro ───
    {
        id: 'outro', title: 'You\'re Ready!',
        narration: 'Complete onboarding → Upload brand docs → Chat with your Brain → Launch your first campaign → Watch the Learning Loop kick in. The system handles the rest. Each campaign makes the next one smarter.',
        icon: '✨', color: 'var(--color-accent)', duration: 6,
        why: 'Most teams see measurable improvement by campaign #3. By campaign #10, the Brain knows your market better than most human marketers. It compounds.',
    },
]
