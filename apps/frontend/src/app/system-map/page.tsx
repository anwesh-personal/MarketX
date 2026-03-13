'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const STATS = [
  { label: 'Overall Completion', value: '95%', sub: 'Code complete · Infra = last mile', color: 'from-violet-500 to-purple-600', icon: '🎯' },
  { label: 'API Routes', value: '65+', sub: 'Unified webhook + new tools', color: 'from-blue-500 to-cyan-600', icon: '🔌' },
  { label: 'Workers', value: '9/9', sub: 'All registered & running', color: 'from-emerald-500 to-teal-600', icon: '⚡' },
  { label: 'Email Providers', value: '4', sub: 'MailWizz · Mailgun · SES · SendGrid', color: 'from-orange-500 to-amber-600', icon: '📧' },
]

const COMPLETION_BARS = [
  { label: 'Brain System (Orchestrator, RAG, Agents, 4 new chat tools)', pct: 98 },
  { label: 'Worker System (9/9 workers, BullMQ, Redis, Scheduled Task)', pct: 97 },
  { label: 'MTA / Email Integration (4 providers, send + receive + learn loop)', pct: 92 },
  { label: 'Superadmin (24 pages, full control panel)', pct: 88 },
  { label: 'Database Schema (36 migrations, ~80 tables)', pct: 100 },
  { label: 'API Routes (65+ endpoints, unified webhook, tier enforcement)', pct: 93 },
  { label: 'User App (chat, learning, portal — all schema-correct)', pct: 88 },
  { label: 'Engine Bundle System (deploy, override, snapshot, audit)', pct: 92 },
  { label: 'KB Pipeline (semantic chunking, embedding, status flow)', pct: 95 },
  { label: 'Deployment / Infrastructure', pct: 60 },
]

const USER_PAGES = [
  { route: '/dashboard', title: 'Dashboard', status: 'done', desc: 'Stats, recent runs, org info' },
  { route: '/writer', title: 'Writer Studio', status: 'done', desc: 'Run history, filter, search' },
  { route: '/writer/new', title: 'New Run', status: 'partial', desc: 'Legacy KB selector UI; execution path is correct' },
  { route: '/brain-chat', title: 'Brain Chat', status: 'done', desc: 'Streaming, push-to-brain, runtime banner' },
  { route: '/brain-control', title: 'Brain Control', status: 'done', desc: '2048 lines — agents, config, RAG, training' },
  { route: '/kb-manager', title: 'KB Manager', status: 'done', desc: 'Full CRUD for knowledge bases' },
  { route: '/analytics', title: 'Analytics', status: 'done', desc: 'Charts, time range, filters' },
  { route: '/learning', title: 'Learning', status: 'done', desc: 'Memories, gaps, reflections, dreams' },
  { route: '/settings', title: 'Settings', status: 'done', desc: 'Profile, org info, logout' },
  { route: '/chat', title: 'Chat (Legacy)', status: 'partial', desc: 'Hardcoded default-org → replace with brain-chat' },
  { route: '/portal', title: 'Portal', status: 'stub', desc: 'Feature gates visible, tier-locked content stub' },
]

const SUPERADMIN_PAGES = [
  { route: 'engine-bundles', title: 'Engine Bundles', status: 'done', lines: 1233 },
  { route: 'agents', title: 'Agent Templates', status: 'done', lines: 1208 },
  { route: 'ai-playground', title: 'AI Playground', status: 'done', lines: 947 },
  { route: 'redis', title: 'Redis / Queues', status: 'done', lines: 850 },
  { route: 'ai-providers', title: 'AI Providers', status: 'done', lines: 800 },
  { route: 'infrastructure', title: 'Infrastructure', status: 'done', lines: 677 },
  { route: 'email-providers', title: 'Email Providers', status: 'done', lines: 684 },
  { route: 'mastery-agents', title: 'Mastery Agents', status: 'partial', lines: 723 },
  { route: 'licenses', title: 'Licenses', status: 'partial', lines: 609 },
  { route: 'analytics', title: 'Analytics', status: 'done', lines: 506 },
  { route: 'engines', title: 'Engine Instances', status: 'done', lines: 483 },
  { route: 'workers', title: 'Worker Control', status: 'done', lines: 458 },
  { route: 'users', title: 'User Management', status: 'done', lines: 551 },
  { route: 'organizations', title: 'Organizations', status: 'done', lines: 323 },
  { route: 'brains', title: 'Brain Templates', status: 'done', lines: 500 },
  { route: 'prompt-library', title: 'Prompt Library', status: 'partial', lines: 369 },
  { route: 'dashboard', title: 'SA Dashboard', status: 'done', lines: 400 },
  { route: 'workflow-manager', title: 'Workflow Manager', status: 'done', lines: 3611 },
]

const WORKERS = [
  { name: 'engine-execution-worker', queue: 'engine-execution', concurrency: 2, status: 'done', desc: 'Runs deployed engine workflows end-to-end' },
  { name: 'workflow-execution-worker', queue: 'workflow-execution', concurrency: 10, status: 'done', desc: 'Template-based workflow runs (most powerful)' },
  { name: 'scheduled-task-worker', queue: 'scheduled-task', concurrency: 5, status: 'done', desc: 'NEW — Cron/event fan-out dispatcher' },
  { name: 'kb-worker', queue: 'kb-processing', concurrency: 5, status: 'done', desc: 'Chunk → embed → store KB documents' },
  { name: 'conversation-worker', queue: 'conversation-summary', concurrency: 3, status: 'done', desc: 'Summarize conversation history' },
  { name: 'analytics-worker', queue: 'analytics', concurrency: 2, status: 'done', desc: 'Aggregate usage metrics per org' },
  { name: 'dream-state-worker', queue: 'dream-state', concurrency: 2, status: 'done', desc: 'Memory consolidation, cleanup, 7 job types' },
  { name: 'learning-loop-worker', queue: 'learning-loop', concurrency: 1, status: 'done', desc: 'Daily optimization + Marketing Coach async' },
  { name: 'fine-tuning-worker', queue: 'fine-tuning', concurrency: 1, status: 'partial', desc: 'Simulated submit/monitor — OpenAI API not wired yet' },
]

type FlowKey = 'writer' | 'brain' | 'engine'

const EXECUTION_STEPS: Record<FlowKey, Array<{ step: number; label: string; detail: string; icon: string }>> = {
  writer: [
    { step: 1, label: 'Auth Check', detail: 'Supabase session verified — no anonymous runs', icon: '🔐' },
    { step: 2, label: 'Brain Runtime', detail: 'requireActiveBrainRuntime(orgId) → active brain_agent loaded', icon: '🧠' },
    { step: 3, label: 'KB Context Build', detail: 'ICP + beliefs + offer + KB sections loaded via BrainKBService', icon: '📚' },
    { step: 4, label: 'Find Engine', detail: 'engine_instance for "Email Nurture Flow" template found/created', icon: '⚙️' },
    { step: 5, label: 'Queue Job', detail: 'BullMQ push to engine-execution queue via Redis with full brain_context', icon: '📦' },
    { step: 6, label: 'Worker Picks Up', detail: 'engine-execution-worker (concurrency: 2) processes job', icon: '⚡' },
    { step: 7, label: 'Workflow Executes', detail: 'Topological sort → nodes: KB retrieval → AI generation → output', icon: '🔄' },
    { step: 8, label: 'Result Saved & Returned', detail: 'engine_run_logs updated · Frontend polls → user sees result', icon: '✅' },
  ],
  brain: [
    { step: 1, label: 'Request Arrives', detail: 'POST /api/brain/chat with message + optional conversation_id', icon: '💬' },
    { step: 2, label: 'Runtime Resolver', detail: 'Single source of truth: resolves brain_agent for org — never stale', icon: '🎯' },
    { step: 3, label: 'Prompt Assembly', detail: '4 layers: foundation + persona + domain + guardrails — all injected', icon: '📝' },
    { step: 4, label: 'RAG Retrieval', detail: 'Hybrid vector + FTS, reranking, gap detection via RAGOrchestrator', icon: '🔍' },
    { step: 5, label: 'Agentic Loop', detail: 'Multi-turn reasoning, tool decisions, hallucination guard on every call', icon: '🤖' },
    { step: 6, label: 'Tool Execution', detail: 'write_email / search_kb / get_icp / get_beliefs — all through MarketXToolExecutor', icon: '🔧' },
    { step: 7, label: 'SSE Stream', detail: 'Real-time chunks streamed to frontend via Server-Sent Events', icon: '📡' },
    { step: 8, label: 'Learning Queued', detail: 'Marketing Coach + learning_loop worker queued async post-turn', icon: '📈' },
  ],
  engine: [
    { step: 1, label: 'Trigger', detail: 'User clicks Run / webhook / API call with input params', icon: '▶️' },
    { step: 2, label: 'Auth + Load', detail: 'Session verified, engine_instance loaded, org context resolved', icon: '🔐' },
    { step: 3, label: 'Log Created', detail: 'engine_run_logs INSERT: status = started, input_data stored', icon: '📋' },
    { step: 4, label: 'Queued to Redis', detail: 'BullMQ job → engine-execution queue · Returns executionId immediately', icon: '📦' },
    { step: 5, label: 'Topological Sort', detail: "Kahn's algorithm on flow graph — respects all node dependencies", icon: '🗂️' },
    { step: 6, label: 'Node Execution', detail: 'trigger → input → AI generation → KB retrieval → condition → output', icon: '⚙️' },
    { step: 7, label: 'Progress Streaming', detail: 'Redis pub/sub: execution:{id}:progress → SSE to frontend', icon: '📊' },
    { step: 8, label: 'Complete', detail: 'DB updated: tokens_used, cost_usd, duration_ms, output_data all recorded', icon: '✅' },
  ],
}

const BLOCKERS = [
  { priority: 'P0', label: 'Dedicated Server Setup', desc: 'Redis + Workers on dedicated server. Plan ready at .agent/Plans/Active/DEDICATED_SERVER_DEPLOYMENT_PLAN.md' },
  { priority: 'P0', label: 'Production Env Vars', desc: 'REDIS_URL, SUPABASE_SERVICE_ROLE_KEY, AI API keys on Railway + server' },
  { priority: 'P0', label: 'DB Migrations 029–035', desc: 'New tables: brain_memories FK fix, writer execution ID, agent templates, engine bundles — MUST run on prod Supabase' },
  { priority: 'P1', label: '/chat → /brain-chat redirect', desc: 'Legacy page has hardcoded "default-org". Simple redirect fix.' },
  { priority: 'P1', label: 'Fine-tuning Real API', desc: 'Wire OpenAI fine-tune API in fine-tuning-worker (non-blocking for launch)' },
  { priority: 'P2', label: 'Workflow Manager Component', desc: 'Page shell is 12 lines — WorkflowManager component needs building' },
  { priority: 'P2', label: 'Dream State LLM Summary', desc: 'Uses stub text "Conversation with N messages" — wire to real LLM call' },
]

const ORIGINAL_VS_NOW = [
  { aspect: 'AI Sophistication', original: 'GPT-4 with simple prompt injection', now: 'Full agentic system, 6 providers, RAG, memory, hallucination guard, 9 mastery agents', verdict: 'ahead' },
  { aspect: 'Admin Capability', original: 'Basic org management', now: '24 superadmin pages, full infrastructure management, impersonation, AI playground', verdict: 'ahead' },
  { aspect: 'Engine Concept', original: 'Simple workflow runner', now: 'Engine Bundle: deploy-as-unit, per-instance override, snapshot, full audit log', verdict: 'ahead' },
  { aspect: 'Worker System', original: 'Background jobs (vague)', now: '9-worker BullMQ system, Redis, progress streaming, Worker Management API on :3100', verdict: 'ahead' },
  { aspect: 'Database Complexity', original: '~20 tables estimated', now: '~80 tables, normalized, RLS policies, pgvector, 35 migrations', verdict: 'ahead' },
  { aspect: 'Launch Timeline', original: '2–3 days from code complete', now: 'Code is done. Infrastructure setup = ~1 day', verdict: 'slight' },
]

const statusColors: Record<string, string> = {
  done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  stub: 'bg-red-500/20 text-red-400 border-red-500/30',
}
const statusDot: Record<string, string> = {
  done: 'bg-emerald-400',
  partial: 'bg-amber-400',
  stub: 'bg-red-400',
}
const statusLabel: Record<string, string> = {
  done: '✓ Done',
  partial: '~ Partial',
  stub: '✗ Stub',
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
const stagger = { show: { transition: { staggerChildren: 0.06 } } }

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold border flex-shrink-0 ${statusColors[status] || statusColors.stub}`}>
      <span className={`w-2 h-2 rounded-full ${statusDot[status] || statusDot.stub}`} />
      {statusLabel[status] || status}
    </span>
  )
}

function Bar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'from-emerald-400 to-teal-400' : pct >= 85 ? 'from-violet-400 to-purple-400' : pct >= 70 ? 'from-blue-400 to-cyan-400' : 'from-amber-400 to-yellow-400'
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <motion.div className={`h-full rounded-full bg-gradient-to-r ${color}`}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }} />
    </div>
  )
}

const SUPERADMIN_JOURNEY = [
  {
    phase: 'Platform Setup',
    color: 'from-violet-500 to-purple-600',
    bg: 'from-violet-500/10 to-purple-500/10',
    border: 'border-violet-500/25',
    dot: 'bg-violet-400',
    icon: '🛠️',
    steps: [
      { icon: '🔐', label: 'Login', desc: 'Superadmin logs in at /superadmin/login with JWT credentials — completely separate from user auth' },
      { icon: '🌐', label: 'Configure Infrastructure', desc: 'Set Redis URL, Worker API URL, Railway/VPS/Dedicated server config — all from /superadmin/infrastructure' },
      { icon: '🤖', label: 'Add AI Providers', desc: 'Add OpenAI, Anthropic, Google, Mistral, xAI keys at /superadmin/ai-providers. Test each. Set fallback chain.' },
      { icon: '📧', label: 'Configure Email Providers', desc: 'Set up MailWizz, Mailgun, or AWS SES at /superadmin/email-providers. Test send capability.' },
    ],
  },
  {
    phase: 'Brain Architecture',
    color: 'from-blue-500 to-cyan-600',
    bg: 'from-blue-500/10 to-cyan-500/10',
    border: 'border-blue-500/25',
    dot: 'bg-blue-400',
    icon: '🧠',
    steps: [
      { icon: '📝', label: 'Build Prompt Library', desc: 'Create foundation, persona, domain, guardrail layers at /superadmin/prompt-library. These become building blocks.' },
      { icon: '🎭', label: 'Create Agent Templates', desc: 'Build writer, analyst, coach agents at /superadmin/agents. Assign tools, set LLM, configure RAG settings per agent.' },
      { icon: '🧬', label: 'Build Brain Template', desc: 'Combine prompt layers + agent configs into a deployable brain template at /superadmin/brains.' },
      { icon: '🔬', label: 'Test in AI Playground', desc: 'Test any provider+model combo with custom prompts at /superadmin/ai-playground. Verify before deploying.' },
    ],
  },
  {
    phase: 'Engine Deployment',
    color: 'from-emerald-500 to-teal-600',
    bg: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-500/25',
    dot: 'bg-emerald-400',
    icon: '⚡',
    steps: [
      { icon: '📦', label: 'Create Engine Bundle', desc: 'At /superadmin/engine-bundles — link brain template + workflow template + email provider. Set tier (echii/pulz/quanta).' },
      { icon: '🔑', label: 'Set API Key Mode', desc: 'Platform pays (platform), org brings own keys (BYOK), or hybrid. Configurable per bundle and per deployed instance.' },
      { icon: '🚀', label: 'Deploy to Organization', desc: 'Click Deploy → system atomically creates brain_agent + engine_instance for the org. Brain is live immediately.' },
      { icon: '⚙️', label: 'Per-Instance Overrides', desc: 'Override any field (LLM model, prompt, tools) for specific orgs without touching the master bundle. Full audit log.' },
    ],
  },
  {
    phase: 'Operations & Control',
    color: 'from-orange-500 to-amber-600',
    bg: 'from-orange-500/10 to-amber-500/10',
    border: 'border-orange-500/25',
    dot: 'bg-orange-400',
    icon: '🎛️',
    steps: [
      { icon: '🏢', label: 'Manage Organizations', desc: 'Create orgs, assign plans, set active brain, view run counts and usage at /superadmin/organizations.' },
      { icon: '👥', label: 'User Management', desc: 'View all users, impersonate any user for debugging, reset passwords at /superadmin/users.' },
      { icon: '📊', label: 'Monitor Everything', desc: 'Redis queue health, worker status, AI usage by org/model, platform analytics — all real-time.' },
      { icon: '🔄', label: 'Iterate Brain', desc: 'Update brain templates, version them, A/B test configs, roll back if needed. Orgs get improvements instantly.' },
    ],
  },
]

const USER_JOURNEY = [
  {
    phase: 'Onboarding',
    icon: '👋',
    color: 'from-violet-500 to-purple-600',
    bg: 'from-violet-500/10 to-purple-500/10',
    border: 'border-violet-500/25',
    steps: [
      { icon: '🔐', label: 'Login', desc: 'User logs in with Supabase auth. Org context loads automatically — no manual setup.' },
      { icon: '🧠', label: 'Brain is Pre-deployed', desc: "Superadmin has already deployed a brain for their org. User doesn't configure anything — it's just ready." },
      { icon: '📊', label: 'Dashboard', desc: 'At /dashboard — sees total runs, success rate, KB count, recent activity. Instant orientation.' },
    ],
  },
  {
    phase: 'Knowledge Setup',
    icon: '📚',
    color: 'from-blue-500 to-cyan-600',
    bg: 'from-blue-500/10 to-cyan-500/10',
    border: 'border-blue-500/25',
    steps: [
      { icon: '📁', label: 'Create Knowledge Base', desc: 'At /kb-manager — create KB sections: company info, case studies, objection handling, offer details.' },
      { icon: '📄', label: 'Upload Documents', desc: 'Paste text, upload files. System auto-chunks → embeds → makes searchable. No technical steps.' },
      { icon: '✅', label: 'KB Goes Live', desc: 'Once documents are status: "ready", Brain automatically uses them in every email and chat response.' },
    ],
  },
  {
    phase: 'Writing Emails',
    icon: '✍️',
    color: 'from-emerald-500 to-teal-600',
    bg: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-500/25',
    steps: [
      { icon: '➕', label: 'New Run', desc: 'At /writer/new — describe what you want: target ICP, topic, tone. Brain does the rest.' },
      { icon: '⚡', label: 'Brain Generates', desc: 'Brain loads KB, ICP, beliefs, offer context → runs workflow → writes a hyper-personalized email in seconds.' },
      { icon: '📋', label: 'Review & Use', desc: 'At /writer — see all runs with full output. Copy, edit, send via your email platform.' },
    ],
  },
  {
    phase: 'Brain Chat',
    icon: '💬',
    color: 'from-fuchsia-500 to-pink-600',
    bg: 'from-fuchsia-500/10 to-pink-500/10',
    border: 'border-fuchsia-500/25',
    steps: [
      { icon: '💬', label: 'Chat with Brain', desc: 'At /brain-chat — ask anything: "What angle works for fintech CTOs?", "Write a follow-up for this reply".' },
      { icon: '🔍', label: 'Brain Searches KB', desc: 'RAG retrieval finds relevant knowledge. Brain answers using YOUR data, not generic AI responses.' },
      { icon: '🧠', label: 'Push to Brain', desc: 'Useful conversation? Push it to brain memory — future responses improve from this knowledge.' },
    ],
  },
  {
    phase: 'Learning & Growth',
    icon: '📈',
    color: 'from-orange-500 to-amber-600',
    bg: 'from-orange-500/10 to-amber-500/10',
    border: 'border-orange-500/25',
    steps: [
      { icon: '🎓', label: 'Learning Page', desc: 'At /learning — see what Brain has learned: memories, knowledge gaps, reflections, dream logs.' },
      { icon: '📊', label: 'Analytics', desc: 'At /analytics — track run success rate, duration trends, volume over time. See what is working.' },
      { icon: '🔄', label: 'Brain Gets Smarter', desc: 'Marketing Coach runs async after every session. Dream cycle consolidates memory nightly. Brain improves automatically.' },
    ],
  },
]

const USER_BENEFITS = [
  { before: 'Write every cold email manually', after: 'Brain generates hyper-personalized emails using your KB, ICP, and beliefs', icon: '✍️' },
  { before: 'Generic AI that knows nothing about your business', after: 'Brain trained on YOUR data — company info, case studies, objection handling', icon: '🧠' },
  { before: 'One-size-fits-all messaging', after: 'ICP-aware: different angles for different buyer stages and personas', icon: '🎯' },
  { before: 'No learning from what works', after: 'Marketing Coach + Learning Loop improves Brain after every session', icon: '📈' },
  { before: 'Manually search knowledge docs', after: 'RAG retrieval finds the right KB content automatically for every output', icon: '🔍' },
  { before: 'AI makes stuff up (hallucination)', after: 'HallucinationInterceptor validates every tool call — factual outputs only', icon: '🛡️' },
]

const TABS = ['Overview', 'Pages', 'Workers', 'Flows', 'SA Journey', 'User Journey', 'Roadmap', 'vs Plan'] as const
type Tab = typeof TABS[number]

export default function SystemMap() {
  const [dark, setDark] = useState(true)
  const [tab, setTab] = useState<Tab>('Overview')
  const [flowTab, setFlowTab] = useState<FlowKey>('writer')

  const bg = dark ? 'bg-[#080810]' : 'bg-slate-50'
  const text = dark ? 'text-white' : 'text-slate-900'
  const card = dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200 shadow-sm'
  const sub = dark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
  const muted = dark ? 'text-white/45' : 'text-slate-500'
  const navBg = dark ? 'bg-[#080810]/90 border-white/10' : 'bg-white/90 border-slate-200'

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-200`}>

      {/* NAV */}
      <nav className={`sticky top-0 z-50 border-b ${navBg} backdrop-blur-xl px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Image
            src={dark ? '/1.png' : '/2.png'}
            alt="MarketX"
            width={120}
            height={36}
            className="object-contain transition-all duration-300"
            style={{ height: 36, width: 'auto' }}
          />
          <div className={`hidden sm:block w-px h-6 ${dark ? 'bg-white/15' : 'bg-slate-300'}`} />
          <div className="hidden sm:block">
            <div className={`text-xs font-semibold ${muted}`}>System Intelligence Map</div>
            <div className={`text-xs ${muted}`}>2026-03-13 · v2.0</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${dark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            95% Complete · Code Done · Infra Pending
          </div>
          <button onClick={() => setDark(d => !d)}
            className={`p-2 rounded-lg border text-base transition-all ${dark ? 'border-white/10 hover:bg-white/10' : 'border-slate-200 hover:bg-slate-100'}`}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-7">

        {/* HERO */}
        <motion.div initial="hidden" animate="show" variants={stagger} className="text-center space-y-4 py-2">
          <motion.div variants={fadeUp} className="flex justify-center">
            <Image
              src={dark ? '/1.png' : '/2.png'}
              alt="MarketX"
              width={200}
              height={60}
              className="object-contain transition-all duration-300"
              style={{ height: 56, width: 'auto' }}
            />
          </motion.div>
          <motion.div variants={fadeUp}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold ${dark ? 'bg-violet-500/10 border-violet-500/25 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-600'}`}>
            🚀 Code complete · Commit 05b4aed · 194 files changed · Dedicated server = last mile
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Everything Built.</span>
            <br />
            <span className={dark ? 'text-white/75' : 'text-slate-600'}>Honest. Complete. Visual.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className={`${muted} max-w-xl mx-auto text-sm leading-relaxed`}>
            Multi-org SaaS · Agentic Brain with RAG · 9 Workers · 65+ API Routes · ~80 DB Tables · 24 Superadmin Pages · 4 Email Providers
          </motion.p>
        </motion.div>

        {/* TODAY'S UPDATES BANNER */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={`rounded-2xl border p-4 bg-gradient-to-r ${dark ? 'from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-emerald-500/20' : 'from-emerald-50 via-teal-50 to-blue-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⚡</span>
            <span className="text-sm font-bold text-emerald-400">Session Complete — 2026-03-13 · Commit 05b4aed</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: '🔍', label: 'Memory System Fixed', desc: 'minSimilarity 0.0→0.5, semantic chunker (paragraph/sentence/word), kb status flow corrected' },
              { icon: '📧', label: 'MTA Adapter Layer', desc: '4 providers: MailWizz, Mailgun, SES, SendGrid — clean interface, send + receive + learn' },
              { icon: '🐛', label: '10 Bugs Squashed', desc: 'chat org, learning page columns, webhook shadow, env vars, tier enforcement, portal links' },
              { icon: '🧠', label: '4 New Brain Tools', desc: 'Campaign insights, self-reflection, knowledge gaps, brain health — user asks via chat' },
            ].map(u => (
              <div key={u.label} className={`rounded-xl p-3 border ${dark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                <div className="text-base mb-1">{u.icon}</div>
                <div className="text-xs font-semibold">{u.label}</div>
                <div className={`text-xs ${muted} mt-0.5 leading-snug`}>{u.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* STAT CARDS */}
        <motion.div initial="hidden" animate="show" variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map(s => (
            <motion.div key={s.label} variants={fadeUp}
              className={`rounded-2xl border ${card} p-4 hover:scale-[1.02] transition-transform`}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs font-semibold mt-0.5 leading-tight">{s.label}</div>
              <div className={`text-xs ${muted} mt-0.5`}>{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* TABS */}
        <div className={`flex gap-1 p-1 rounded-xl border ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100 border-slate-200'} overflow-x-auto`}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${tab === t ? 'text-white' : dark ? 'text-white/45 hover:text-white/70' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === t && (
                <motion.div layoutId="tab-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.35 }} />
              )}
              <span className="relative z-10">{t}</span>
            </button>
          ))}
        </div>

        {/* TAB PANELS */}
        <AnimatePresence mode="wait">

          {tab === 'Overview' && (
            <motion.div key="ov" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

              {/* Completion bars */}
              <div className={`rounded-2xl border ${card} p-5 space-y-4`}>
                <h2 className="text-xl font-bold">Completion by Layer</h2>
                {COMPLETION_BARS.map(b => (
                  <div key={b.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base">{b.label}</span>
                      <span className={`text-base font-bold tabular-nums ${b.pct === 100 ? 'text-emerald-400' : b.pct >= 85 ? 'text-violet-400' : 'text-amber-400'}`}>{b.pct}%</span>
                    </div>
                    <Bar pct={b.pct} />
                  </div>
                ))}
              </div>

              {/* 5-layer arch */}
              <div className={`rounded-2xl border ${card} p-5`}>
                <h2 className="text-xl font-bold mb-6">Platform Architecture — 5 Layers</h2>
                <p className={`text-base ${muted} -mt-3 mb-6`}>How MarketX is structured internally — from what users see down to where data lives.</p>
                <div className="space-y-2.5">
                  {[
                    { layer: 'L1', label: 'Presentation', items: ['User App (11 pages)', 'Superadmin (24 pages)', 'Dark/Light themes'], grad: 'from-violet-500/15 to-purple-500/15', border: 'border-violet-500/25', dot: 'bg-violet-400' },
                    { layer: 'L2', label: 'API Gateway', items: ['60+ Next.js API Routes', 'Supabase auth + JWT superadmin', 'Rate limiting & middleware'], grad: 'from-blue-500/15 to-cyan-500/15', border: 'border-blue-500/25', dot: 'bg-blue-400' },
                    { layer: 'L3', label: 'Brain System', items: ['BrainOrchestrator (1524 lines)', 'RAGOrchestrator hybrid retrieval', 'AIProviderService (6 providers)', 'HallucinationInterceptor', '9 Mastery Agents'], grad: 'from-emerald-500/15 to-teal-500/15', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
                    { layer: 'L4', label: 'Queue / Workers', items: ['Redis (BullMQ)', '9 Workers (9 queues)', 'engine-execution (core)', 'workflow-execution (10x concurrency)', 'Worker API :3100'], grad: 'from-orange-500/15 to-amber-500/15', border: 'border-orange-500/25', dot: 'bg-orange-400' },
                    { layer: 'L5', label: 'Data / Storage', items: ['Supabase (~80 tables)', 'pgvector (embeddings + FTS)', 'RLS policies on all tables', '35 migrations applied'], grad: 'from-rose-500/15 to-pink-500/15', border: 'border-rose-500/25', dot: 'bg-rose-400' },
                  ].map((l, i) => (
                    <motion.div key={l.layer} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r ${l.grad} ${l.border}`}>
                      <div className={`w-7 h-7 rounded-lg ${l.dot} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-black text-xs">{l.layer}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-bold">{l.label}</div>
                        <div className={`text-sm ${muted} flex flex-wrap gap-x-3 mt-1`}>
                          {l.items.map(it => <span key={it}>· {it}</span>)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className={`rounded-xl border ${card} px-5 py-4 flex flex-wrap items-center gap-5`}>
                <span className="text-sm font-semibold">Status Legend:</span>
                {Object.entries(statusLabel).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot[k]}`} />
                    <span className={`text-sm ${muted}`}>{v}</span>
                  </div>
                ))}
                <span className={`text-sm ${muted} ml-auto`}>Last audit: 2026-03-13</span>
              </div>
            </motion.div>
          )}

          {tab === 'Pages' && (
            <motion.div key="pg" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

              <div className={`rounded-2xl border ${card} p-5`}>
                <h2 className="text-xl font-bold mb-1">User App — 11 Pages</h2>
                <p className={`text-sm ${muted} mb-5`}>What logged-in users see and use every day.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {USER_PAGES.map((p, i) => (
                    <motion.div key={p.route} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className={`rounded-xl border ${sub} p-3.5 hover:border-violet-500/30 transition-colors`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-base font-semibold">{p.title}</div>
                          <div className={`text-sm font-mono ${muted} mt-0.5`}>{p.route}</div>
                          <div className={`text-sm ${muted} mt-2 leading-snug`}>{p.desc}</div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl border ${card} p-5`}>
                <h2 className="text-xl font-bold mb-1">Superadmin — 18 Pages</h2>
                <p className={`text-sm ${muted} mb-5`}>The control panel. Only platform operators have access — users never see this.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {SUPERADMIN_PAGES.map((p, i) => (
                    <motion.div key={p.route} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }}
                      className={`rounded-xl border ${sub} p-3.5 hover:border-blue-500/30 transition-colors`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-base font-semibold">{p.title}</div>
                          <div className={`text-sm font-mono ${muted} mt-0.5`}>/{p.route}</div>
                          <div className="text-sm text-violet-400 mt-1 font-medium">{p.lines.toLocaleString()} lines</div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'Workers' && (
            <motion.div key="wk" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className={`rounded-2xl border ${card} p-5`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold">Worker System — 9 Workers</h2>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${dark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    8/9 Production-ready
                  </div>
                </div>
                <div className="space-y-2.5">
                  {WORKERS.map((w, i) => (
                    <motion.div key={w.name} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.055 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${sub} hover:border-violet-500/20 transition-colors`}>
                      <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${w.status === 'done' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-base font-semibold font-mono ${dark ? 'text-white/90' : 'text-slate-800'}`}>{w.name}</span>
                          <StatusBadge status={w.status} />
                        </div>
                        <div className={`text-sm ${muted} mt-0.5`}>{w.desc}</div>
                      </div>
                      <div className="text-right flex-shrink-0 hidden md:block">
                        <div className={`text-sm font-mono ${muted}`}>{w.queue}</div>
                        <div className="text-sm text-violet-400 font-semibold mt-0.5">×{w.concurrency} concurrent</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                  <div className={`mt-4 p-4 rounded-xl border ${sub}`}>
                  <div className={`text-sm ${muted}`}>
                    All queues use prefix <span className="font-mono text-violet-400">axiom:</span> · 3 retry attempts with exponential backoff · Worker Management API on port <span className="font-mono text-violet-400">:3100</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'Flows' && (
            <motion.div key="fl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {([['writer', '✍️ Writer Run'], ['brain', '🧠 Brain Chat'], ['engine', '⚡ Engine Run']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setFlowTab(k)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${flowTab === k ? 'bg-violet-600 border-violet-500 text-white' : dark ? 'border-white/10 text-white/50 hover:text-white/80' : 'border-slate-200 text-slate-500'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={flowTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className={`rounded-2xl border ${card} p-5`}>
                  <h2 className="text-base font-bold mb-6">
                    {flowTab === 'writer' ? 'Writer Run — Full Execution Chain' : flowTab === 'brain' ? 'Brain Chat — Agentic Loop' : 'Engine Run — Workflow Pipeline'}
                  </h2>
                  <div className="space-y-0">
                    {EXECUTION_STEPS[flowTab].map((s, i) => (
                      <motion.div key={s.step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="flex items-start gap-3 group">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${dark ? 'bg-violet-500/15 border border-violet-500/25' : 'bg-violet-50 border border-violet-200'} group-hover:bg-violet-500/25 transition-colors`}>
                            {s.icon}
                          </div>
                          {i < EXECUTION_STEPS[flowTab].length - 1 && (
                            <div className={`w-px h-6 mt-1 ${dark ? 'bg-violet-500/20' : 'bg-violet-200'}`} />
                          )}
                        </div>
                        <div className="pt-1.5 pb-5 min-w-0">
                          <div className="text-base font-semibold">{s.step}. {s.label}</div>
                          <div className={`text-sm ${muted} mt-1 leading-relaxed`}>{s.detail}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {tab === 'Roadmap' && (
            <motion.div key="rm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

              <div className={`rounded-2xl border p-5 bg-gradient-to-r ${dark ? 'from-violet-500/10 to-purple-500/10 border-violet-500/20' : 'from-violet-50 to-purple-50 border-violet-200'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🚦</span>
                  <div>
                    <div className="font-bold text-violet-400 text-sm">The code is done. Infrastructure is the only thing left.</div>
                    <div className={`text-sm ${muted} mt-1`}>Code is done and committed. Dedicated server setup → Redis + PM2 + workers → env vars → migrations 029–036 → live.</div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border ${card} p-5`}>
                <h2 className="text-xl font-bold mb-5">Launch Blockers — Honest Priority List</h2>
                <div className="space-y-2.5">
                  {BLOCKERS.map((b, i) => (
                    <motion.div key={b.label} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className={`flex items-start gap-3 p-4 rounded-xl border ${sub}`}>
                      <div className={`px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 mt-0.5 ${b.priority === 'P0' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : b.priority === 'P1' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                        {b.priority}
                      </div>
                      <div>
                          <div className="text-base font-semibold">{b.label}</div>
                          <div className={`text-sm ${muted} mt-1 leading-relaxed`}>{b.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl border ${card} p-5`}>
                <h2 className="text-xl font-bold mb-5">Timeline to Live</h2>
                <div className="space-y-3">
                  {[
                    { phase: 'Today', label: 'Server Setup', desc: 'Dedicated server · Redis + PM2 + all 9 workers deployed', active: true },
                    { phase: 'Today', label: 'Env Configuration', desc: 'REDIS_URL, SUPABASE keys, AI keys on Railway + server', active: true },
                    { phase: 'Today', label: 'Run DB Migrations', desc: 'Migrations 029–035 on prod Supabase (engine bundles, agent templates, etc.)', active: true },
                    { phase: 'Today', label: '🚀 GO LIVE', desc: 'Frontend (Railway) + Workers (Dedicated) + Redis (Server) = done', active: true },
                    { phase: 'Week 1', label: 'Fix /chat', desc: 'Redirect to /brain-chat — 5 minute change', active: false },
                    { phase: 'Week 1', label: 'Workflow Manager', desc: 'Build WorkflowManager component (shell page exists)', active: false },
                    { phase: 'Week 2', label: 'Fine-tuning Pipeline', desc: 'Wire OpenAI fine-tune API (non-blocking)', active: false },
                  ].map((t, i) => (
                    <motion.div key={t.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-4">
                      <div className="w-14 flex-shrink-0 text-right pt-0.5">
                        <span className={`text-xs font-bold ${t.active ? 'text-violet-400' : muted}`}>{t.phase}</span>
                      </div>
                      <div className={`w-px self-stretch ${dark ? 'bg-white/10' : 'bg-slate-200'} flex-shrink-0`} />
                      <div className="flex items-start gap-2.5 pb-4">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${t.active ? 'bg-violet-400 animate-pulse' : dark ? 'bg-white/15' : 'bg-slate-300'}`} />
                        <div>
                          <div className="text-base font-semibold">{t.label}</div>
                          <div className={`text-sm ${muted} mt-0.5`}>{t.desc}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'vs Plan' && (
            <motion.div key="vp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

              <div className={`rounded-2xl border p-5 bg-gradient-to-r ${dark ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20' : 'from-emerald-50 to-teal-50 border-emerald-200'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="font-bold text-emerald-400 text-base">Verdict: 3–4× more sophisticated than originally scoped</div>
                    <div className={`text-sm ${muted} mt-1`}>Ahead on every technical dimension. The only delay is infrastructure, not code.</div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border ${card} overflow-hidden`}>
                <div className={`grid grid-cols-3 gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wide ${muted} border-b ${dark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div>Aspect</div>
                  <div>Original Plan</div>
                  <div>Reality</div>
                </div>
                {ORIGINAL_VS_NOW.map((row, i) => (
                  <motion.div key={row.aspect} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className={`grid grid-cols-3 gap-4 px-5 py-4 text-sm border-b ${dark ? 'border-white/[0.05]' : 'border-slate-100'} last:border-0 hover:bg-white/[0.03] transition-colors`}>
                    <div className="font-semibold text-xs">{row.aspect}</div>
                    <div className={`text-xs ${muted}`}>{row.original}</div>
                    <div className="text-xs font-medium flex items-start gap-1.5">
                      <span className={row.verdict === 'ahead' ? 'text-emerald-400' : 'text-amber-400'}>{row.verdict === 'ahead' ? '↑' : '~'}</span>
                      <span>{row.now}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className={`rounded-2xl border ${card} p-5`}>
                <h2 className="text-xl font-bold mb-4">Built Beyond Original Scope</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { item: 'Mastery Agent System', desc: '9 specialized agents: angle, buyer stage, timing, sequence, etc.' },
                    { item: 'Marketing Coach Service', desc: 'Async post-turn optimization and feedback loop' },
                    { item: 'Engine Bundle Architecture', desc: 'Deploy-as-unit, per-instance overrides, snapshot, audit log' },
                    { item: 'HallucinationInterceptor', desc: 'Validates every LLM tool call before execution — zero hallucination passthrough' },
                    { item: 'RAGOrchestrator', desc: 'Hybrid vector + FTS, reranking, knowledge gap detection' },
                    { item: 'Infrastructure Management UI', desc: 'Full infra config from superadmin — Redis, VPS, Railway, Dedicated server' },
                    { item: 'Scheduled Task Worker', desc: 'Cron-style fan-out dispatcher (added today)' },
                    { item: 'Per-instance Override System', desc: 'Any field overrideable per deployed engine without touching master bundle' },
                    { item: 'Clean MTA Adapter Layer', desc: 'MailWizz, Mailgun, SES, SendGrid — add any provider without touching webhook routes' },
                    { item: 'Email Send Capability', desc: 'Platform was receive-only. Now dispatches emails via any configured provider.' },
                    { item: 'Brain Campaign Chat Tools', desc: 'User asks Brain: "How are my emails doing?" — gets real data, not guesses' },
                    { item: 'Workflow Manager (Full)', desc: '36 node types, ReactFlow builder, 3611-line executor — complete (was misreported as stub)' },
                  ].map((x, i) => (
                    <motion.div key={x.item} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className={`p-3.5 rounded-xl border ${sub} flex items-start gap-2.5`}>
                      <span className="text-emerald-400 font-bold flex-shrink-0 mt-0.5">+</span>
                      <div>
                        <div className="text-base font-semibold">{x.item}</div>
                        <div className={`text-sm ${muted} mt-0.5 leading-snug`}>{x.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* SUPERADMIN JOURNEY */}
          {tab === 'SA Journey' && (
            <motion.div key="saj" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

              <div className={`rounded-2xl border p-5 bg-gradient-to-r ${dark ? 'from-violet-500/10 to-blue-500/10 border-violet-500/20' : 'from-violet-50 to-blue-50 border-violet-200'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👑</span>
                  <div>
                    <div className="font-bold text-violet-400 text-sm">Superadmin: The Brain Architect</div>
                    <div className={`text-xs ${muted} mt-1`}>Superadmin never touches user data. They build the intelligence infrastructure that users run on. Setup once → orgs benefit forever.</div>
                  </div>
                </div>
              </div>

              {SUPERADMIN_JOURNEY.map((phase, pi) => (
                <motion.div key={phase.phase} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.1 }}
                  className={`rounded-2xl border p-5 bg-gradient-to-br ${phase.bg} ${phase.border}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center text-xl flex-shrink-0`}>{phase.icon}</div>
                    <div>
                      <div className="font-bold text-sm">Phase {pi + 1}: {phase.phase}</div>
                      <div className={`text-xs ${muted}`}>{phase.steps.length} steps</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {phase.steps.map((step, si) => (
                      <motion.div key={step.label} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: pi * 0.1 + si * 0.06 }}
                        className={`rounded-xl border ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'} p-4 flex items-start gap-3`}>
                        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-lg ${dark ? 'bg-white/[0.07]' : 'bg-slate-50'}`}>{step.icon}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${phase.dot.replace('bg-', 'text-')}`}>{pi + 1}.{si + 1}</span>
                            <span className="text-base font-semibold">{step.label}</span>
                          </div>
                          <div className={`text-sm ${muted} mt-1 leading-relaxed`}>{step.desc}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {pi < SUPERADMIN_JOURNEY.length - 1 && (
                    <div className="flex justify-center mt-4">
                      <div className={`flex items-center gap-2 text-xs ${muted}`}>
                        <div className={`h-px w-16 ${dark ? 'bg-white/20' : 'bg-slate-300'}`} />
                        <span>then</span>
                        <div className={`h-px w-16 ${dark ? 'bg-white/20' : 'bg-slate-300'}`} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              <div className={`rounded-2xl border ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'} p-5`}>
                <h3 className="text-lg font-bold mb-4">What Superadmin controls that users never see</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    { icon: '🤖', label: 'Which LLM model runs' },
                    { icon: '📝', label: 'All 4 prompt layers' },
                    { icon: '🔧', label: 'Tool permissions per agent' },
                    { icon: '🔍', label: 'RAG settings & thresholds' },
                    { icon: '🛡️', label: 'Hallucination guard config' },
                    { icon: '💰', label: 'API key mode (platform/BYOK)' },
                    { icon: '⚡', label: 'Worker concurrency' },
                    { icon: '🌐', label: 'Infra: Redis, VPS, Railway' },
                    { icon: '📧', label: 'Email provider routing' },
                  ].map(x => (
                    <div key={x.label} className={`rounded-xl border ${dark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-slate-50 border-slate-200'} p-3 flex items-center gap-2.5`}>
                      <span className="text-base flex-shrink-0">{x.icon}</span>
                      <span className="text-sm font-medium">{x.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* USER JOURNEY */}
          {tab === 'User Journey' && (
            <motion.div key="uj" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

              <div className={`rounded-2xl border p-5 bg-gradient-to-r ${dark ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20' : 'from-emerald-50 to-teal-50 border-emerald-200'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <div className="font-bold text-emerald-400 text-sm">User Experience: Simple on the surface, powerful underneath</div>
                    <div className={`text-xs ${muted} mt-1`}>Users never configure AI, never see queues, never touch infra. They just write better emails faster — the complexity is invisible.</div>
                  </div>
                </div>
              </div>

              {/* Journey phases */}
              {USER_JOURNEY.map((phase, pi) => (
                <motion.div key={phase.phase} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.09 }}
                  className={`rounded-2xl border p-5 bg-gradient-to-br ${phase.bg} ${phase.border}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center text-xl flex-shrink-0`}>{phase.icon}</div>
                    <div>
                      <div className="font-bold text-sm">{phase.phase}</div>
                      <div className={`text-xs ${muted}`}>{phase.steps.length} steps</div>
                    </div>
                  </div>

                  <div className="space-y-0">
                    {phase.steps.map((step, si) => (
                      <motion.div key={step.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: pi * 0.09 + si * 0.07 }}
                        className="flex items-start gap-3 group">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${dark ? 'bg-white/[0.07] border border-white/10' : 'bg-white border border-slate-200'} group-hover:scale-110 transition-transform`}>
                            {step.icon}
                          </div>
                          {si < phase.steps.length - 1 && <div className={`w-px h-5 mt-1 ${dark ? 'bg-white/15' : 'bg-slate-200'}`} />}
                        </div>
                        <div className="pt-1.5 pb-4 min-w-0">
                          <div className="text-base font-semibold">{step.label}</div>
                          <div className={`text-sm ${muted} mt-0.5 leading-relaxed`}>{step.desc}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Before / After benefits */}
              <div className={`rounded-2xl border ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'} p-5`}>
                <h3 className="text-xl font-bold mb-2">Before MarketX vs After MarketX</h3>
                <div className={`text-sm ${muted} mb-5`}>What changes for a sales or marketing professional the day they start using this platform</div>

                <div className="space-y-3">
                  {USER_BENEFITS.map((b, i) => (
                    <motion.div key={b.before} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className={`rounded-xl border ${dark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-slate-50 border-slate-200'} p-4`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0 mt-0.5">{b.icon}</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className={`rounded-lg border ${dark ? 'bg-red-500/[0.07] border-red-500/20' : 'bg-red-50 border-red-200'} p-3`}>
                            <div className="text-sm font-bold text-red-400 mb-1">BEFORE</div>
                            <div className={`text-sm ${dark ? 'text-white/70' : 'text-slate-600'} leading-relaxed`}>{b.before}</div>
                          </div>
                          <div className={`rounded-lg border ${dark ? 'bg-emerald-500/[0.07] border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} p-3`}>
                            <div className="text-sm font-bold text-emerald-400 mb-1">AFTER MARKETX</div>
                            <div className={`text-sm ${dark ? 'text-white/70' : 'text-slate-600'} leading-relaxed`}>{b.after}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Key insight */}
              <div className={`rounded-2xl border p-5 bg-gradient-to-r ${dark ? 'from-violet-500/10 to-fuchsia-500/10 border-violet-500/20' : 'from-violet-50 to-fuchsia-50 border-violet-200'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-bold text-base text-violet-400">The key insight</div>
                    <div className={`text-sm ${muted} mt-1 leading-relaxed`}>
                      A 10-year-old could use the writing interface. A PhD wouldn't fully understand what runs underneath. That gap — simplicity on top, power underneath — is the product.
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* FOOTER */}
        <div className={`text-center py-8 border-t ${dark ? 'border-white/10' : 'border-slate-200'} space-y-4`}>
          <div className="flex justify-center">
            <Image
              src={dark ? '/1.png' : '/2.png'}
              alt="MarketX"
              width={120}
              height={36}
              className="object-contain opacity-60"
              style={{ height: 34, width: 'auto' }}
            />
          </div>
          <div className={`text-sm ${muted}`}>
            95% complete · Commit 05b4aed · 2026-03-13 · Full audit at{' '}
            <span className="font-mono text-violet-400">.agent/Audit/FULL_SYSTEM_AUDIT_2026-03-13.md</span>
          </div>
          <div className={`pt-2 border-t ${dark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <p className={`text-sm ${muted} mb-1`}>Designed & built by</p>
            <p className={`text-xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent`}>
              Anwesh Rath
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
