'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const STATS = [
  { label: 'Overall Completion', value: '96%', sub: 'Code complete · Infra = last mile', color: 'from-violet-500 to-purple-600', icon: '🎯' },
  { label: 'Workers', value: '10/10', sub: '9 core + Mastery Agent Worker (new)', color: 'from-emerald-500 to-teal-600', icon: '⚡' },
  { label: 'Mastery Agents', value: '9', sub: 'Angle · BuyerStage · Timing · Reply + 5 more', color: 'from-blue-500 to-cyan-600', icon: '🎯' },
  { label: 'Email Integration', value: '2 layers', sub: 'Autoresponder (MailWizz) + SMTP Relay (SES/Mailgun/SendGrid)', color: 'from-orange-500 to-amber-600', icon: '📧' },
]

const COMPLETION_BARS = [
  { label: 'Brain System (Orchestrator, RAG, Agents, 4 new chat tools)', pct: 98 },
  { label: 'Worker System (10/10 workers — incl. Mastery Agent Worker, async)', pct: 99 },
  { label: 'MTA / Email Integration (4 providers, send + receive + learn loop)', pct: 92 },
  { label: 'Superadmin (24 pages, full control panel)', pct: 88 },
  { label: 'Database Schema (36 migrations, ~80 tables)', pct: 100 },
  { label: 'API Routes (65+ endpoints, unified webhook, tier enforcement)', pct: 93 },
  { label: 'User App (chat, learning, portal — all schema-correct)', pct: 88 },
  { label: 'Engine Bundle System (deploy, override, snapshot, audit)', pct: 92 },
  { label: 'KB Pipeline (semantic chunking, embedding, status flow)', pct: 95 },
  { label: 'Deployment / Infrastructure', pct: 60 },
]

// ─── Modal types ─────────────────────────────────────────────────────────────

interface ModalInfo {
  title: string
  badge?: string
  status?: string
  what: string
  how: string
  tech: string[]
  note?: string
}

// ─── Page Data with rich modal info ──────────────────────────────────────────

const USER_PAGES: Array<{ route: string; title: string; status: string; desc: string; modal: ModalInfo }> = [
  {
    route: '/dashboard', title: 'Dashboard', status: 'done', desc: 'Home screen — live stats, recent runs, org overview',
    modal: {
      title: 'Dashboard', status: 'done',
      what: 'The first page a user sees after login. Shows at-a-glance stats: total email runs, success rate, KB documents indexed, and a live feed of the most recent runs.',
      how: 'Pulls from engine_run_logs (run counts, status), kb_documents (KB size), and brain_agents (active brain status). All queries are org-scoped via the user\'s org_id.',
      tech: ['engine_run_logs', 'kb_documents', 'brain_agents', 'Supabase RLS'],
    },
  },
  {
    route: '/writer', title: 'Writer Studio', status: 'done', desc: 'Browse all past email runs with filters',
    modal: {
      title: 'Writer Studio', status: 'done',
      what: 'A searchable, filterable list of every email generation run. Users can filter by status (success/failed), date range, and see token usage and cost per run.',
      how: 'Queries engine_run_logs ordered by created_at. Clicking a run shows the full output, input used, and Brain context snapshot.',
      tech: ['engine_run_logs', 'runs table', 'output_data JSONB'],
    },
  },
  {
    route: '/writer/new', title: 'New Run', status: 'partial', desc: 'Start a new AI email generation run',
    modal: {
      title: 'New Run', status: 'partial',
      what: 'Where users kick off a new email generation. They describe their target (ICP, topic, tone) and Brain generates a hyper-personalized email using their KB, beliefs, and offer context.',
      how: 'Calls POST /api/writer/execute → BullMQ → engine-execution-worker → workflowExecutionService. Returns executionId for polling.',
      tech: ['/api/writer/execute', 'BrainKBService', 'engine-execution queue', 'workflow-execution-processor.ts'],
      note: 'UI partial — legacy KB selector visible. Execution path itself is 100% correct and production-ready.',
    },
  },
  {
    route: '/brain-chat', title: 'Brain Chat', status: 'done', desc: 'Talk to your AI Brain in real-time',
    modal: {
      title: 'Brain Chat', status: 'done',
      what: 'A full streaming chat interface where users converse with their deployed Brain agent. The Brain has access to the KB, ICP data, beliefs, and all 15 tools. Responses stream word-by-word.',
      how: 'SSE stream from POST /api/brain/chat → BrainOrchestrator → RAGOrchestrator (hybrid retrieval) → AIProviderService → stream chunks back. Push-to-brain saves the conversation as a memory.',
      tech: ['BrainOrchestrator', 'RAGOrchestrator', 'Server-Sent Events', 'MarketXToolExecutor', 'brain_memories'],
    },
  },
  {
    route: '/brain-control', title: 'Brain Control', status: 'done', desc: 'Full Brain configuration panel',
    modal: {
      title: 'Brain Control', status: 'done',
      what: 'The most powerful user-facing page — 2048 lines. Lets users view and manage their deployed Brain: agents, performance metrics, RAG configuration, training feedback, intent patterns, and knowledge gap tracking.',
      how: 'Communicates with /api/brain/agents, /api/brain/config, /api/brain/config/rag, /api/brain/training/*. Changes write directly to brain_agents and brain_config tables.',
      tech: ['brain_agents', 'brain_config', 'brain_reflections', 'RAG settings', 'intent_patterns'],
    },
  },
  {
    route: '/kb-manager', title: 'KB Manager', status: 'done', desc: 'Manage your Knowledge Base',
    modal: {
      title: 'KB Manager', status: 'done',
      what: 'Full CRUD for the Brain\'s Knowledge Base. Users create KB sections (e.g. "Case Studies", "Objection Handling"), upload documents, and track embedding status per document.',
      how: 'Documents go: upload → kb_documents INSERT (status: pending) → BullMQ kb-processing queue → semantic chunker → text-embedding-3-large → embeddings table (status: ready).',
      tech: ['kb_sections', 'kb_documents', 'embeddings (pgvector)', 'kb-processing worker', 'semantic chunker'],
    },
  },
  {
    route: '/analytics', title: 'Analytics', status: 'done', desc: 'Email run performance charts',
    modal: {
      title: 'Analytics', status: 'done',
      what: 'Time-series charts showing email run volume, success rates, average duration, and cost per run. Filterable by time range (7d, 30d, 90d).',
      how: 'Aggregates engine_run_logs by time bucket. All charts are client-rendered with real data — no mock data.',
      tech: ['engine_run_logs', 'time-series aggregation', 'Chart components'],
    },
  },
  {
    route: '/learning', title: 'Learning Loop', status: 'done', desc: 'See how the Brain learns over time',
    modal: {
      title: 'Learning Loop', status: 'done',
      what: 'Shows the Brain\'s internal learning state: long-term memories it has formed, knowledge gaps it has identified, self-reflections (what went well / what to improve), and dream cycle logs (nightly memory consolidation).',
      how: 'Queries brain_memories, knowledge_gaps, brain_reflections, brain_dream_logs — all org-scoped. Schema-correct column names: description (not question), narrative (not summary), first_identified (not created_at).',
      tech: ['brain_memories', 'knowledge_gaps', 'brain_reflections', 'brain_dream_logs', 'dream-state-worker'],
    },
  },
  {
    route: '/settings', title: 'Settings', status: 'done', desc: 'Profile and organization settings',
    modal: {
      title: 'Settings', status: 'done',
      what: 'User profile management, organization info display, and logout. Shows current plan tier and org details.',
      how: 'Reads from users and organizations tables. Updates write back via Supabase client.',
      tech: ['users table', 'organizations table', 'Supabase auth'],
    },
  },
  {
    route: '/chat', title: 'Chat (Legacy)', status: 'partial', desc: 'Old chat interface — superseded by Brain Chat',
    modal: {
      title: 'Chat (Legacy)', status: 'partial',
      what: 'An older chat interface that lets users select a brain template and chat. Now superseded by /brain-chat which uses the full Brain runtime.',
      how: 'Fixed: org_id now comes from real Supabase auth (was hardcoded "default-org"). Should eventually redirect to /brain-chat.',
      tech: ['ChatInterface component', 'Supabase auth', 'brain_templates'],
      note: 'Recommend: add a redirect from /chat → /brain-chat post-launch.',
    },
  },
  {
    route: '/portal', title: 'Portal', status: 'stub', desc: 'Client-facing tier portal — in progress',
    modal: {
      title: 'Portal', status: 'stub',
      what: 'A client-facing dashboard showing platform metrics and feature access based on tier (echii/pulz/quanta). Feature tiles link to the correct working pages.',
      how: 'Calls /api/portal/config and /api/dashboard/partner. Dead links fixed to point to real routes. Tier-locked features show lock icon.',
      tech: ['/api/portal/config', 'feature flags', 'tier system'],
      note: 'Portal config and metrics APIs exist. Full tier-gating UI needs completion post-launch.',
    },
  },
]

const SUPERADMIN_PAGES: Array<{ route: string; title: string; status: string; lines: number; desc: string; modal: ModalInfo }> = [
  {
    route: 'engine-bundles', title: 'Engine Bundles', status: 'done', lines: 1233,
    desc: 'Create and deploy packaged AI engines to orgs',
    modal: {
      title: 'Engine Bundles', badge: 'Core Feature', status: 'done',
      what: 'The main deployment unit. Superadmin creates a bundle (Brain Template + Workflow Template + Email Provider + API key mode), then deploys it to an organization in one click.',
      how: 'Deploy atomically creates: (1) brain_agents record for the org, (2) engine_instances record (deployed clone). Per-instance overrides let you customize any field without touching the master bundle.',
      tech: ['engine_bundles', 'engine_instances', 'engine_bundle_deployments', 'brain_agents', 'agents_config JSONB', 'override audit log'],
    },
  },
  {
    route: 'agents', title: 'Agent Templates', status: 'done', lines: 1208,
    desc: 'Build reusable AI agent templates',
    modal: {
      title: 'Agent Templates', status: 'done',
      what: 'Create AI agent personas with specific roles (writer, analyst, coach, generalist). Each agent has its own LLM config, 4-layer prompt stack, tool permissions, and RAG settings.',
      how: 'Creates agent_templates records. When deployed, becomes a brain_agents row for the target org. Agent config includes: provider, model, temperature, foundation/persona/domain/guardrail prompts, tools_granted array.',
      tech: ['agent_templates', 'brain_agents', 'prompt_layers', 'brain_tools_granted', 'LLM config per agent'],
    },
  },
  {
    route: 'ai-playground', title: 'AI Playground', status: 'done', lines: 947,
    desc: 'Test any AI model directly',
    modal: {
      title: 'AI Playground', status: 'done',
      what: 'Direct LLM testing interface. Select any configured provider and model, write a prompt, and see raw output with token usage and latency. Test streaming vs non-streaming. Save test prompts.',
      how: 'Calls /api/superadmin/ai-chat which routes to AIProviderService with the selected provider. Bypasses Brain entirely — raw model access.',
      tech: ['AIProviderService', '/api/superadmin/ai-chat', '6 providers', 'stream + non-stream'],
    },
  },
  {
    route: 'redis', title: 'Redis / Queue Monitor', status: 'done', lines: 850,
    desc: 'Real-time queue health and job management',
    modal: {
      title: 'Redis / Queue Monitor', status: 'done',
      what: 'Live view of all 9 BullMQ queues: active jobs, waiting, completed, failed, delayed counts. Retry failed jobs by ID, drain or pause queues, view job details, test Redis connection.',
      how: 'Worker Management API (port 3100) exposes queue stats. Superadmin page calls /api/superadmin/redis/status and /api/workers/jobs endpoints.',
      tech: ['BullMQ', 'Redis', 'Worker API :3100', '9 queues', 'axiom: prefix'],
    },
  },
  {
    route: 'infrastructure', title: 'Infrastructure Config', status: 'done', lines: 677,
    desc: 'Configure servers, Redis, and deployment targets',
    modal: {
      title: 'Infrastructure Config', status: 'done',
      what: 'Superadmin sets the deployment target (Local/VPS/Railway/Dedicated server), configures Redis connection, Worker API URL, and VPS/SSH credentials — all from the UI.',
      how: 'Writes to infra_config table. infra-config.ts reads from DB first, falls back to env vars. Includes connection tests for Redis and Worker API.',
      tech: ['infra_config table', 'infra-config.ts', 'Redis test', 'Worker API test', 'SSH config'],
    },
  },
  {
    route: 'email-providers', title: 'Email Providers', status: 'done', lines: 684,
    desc: 'Configure autoresponders and SMTP relays',
    modal: {
      title: 'Email Providers', badge: 'Two-Layer Architecture', status: 'done',
      what: 'IMPORTANT: MarketX integrates with TWO distinct layers.\n\n1. AUTORESPONDER (MailWizz): Manages subscriber lists, email sequences, campaign scheduling, open/click/reply tracking. MailWizz is NOT an MTA — it routes actual delivery through an SMTP relay.\n\n2. SMTP RELAY (SES / Mailgun / SendGrid): The real mail servers that physically send email bytes. MailWizz connects to one of these under the hood.',
      how: 'Config stored on engine_instances.email_provider_config (JSONB). EmailDispatchService loads provider from DB, configures the right adapter, and sends. Unified webhook /api/webhooks/email/[provider] handles events from all providers.',
      tech: ['EmailProviderAdapter interface', 'MailWizzAdapter (autoresponder)', 'SESAdapter (smtp_relay)', 'MailgunAdapter (smtp_relay)', 'SendGridAdapter (smtp_relay)', 'engine_instances.email_provider_config'],
      note: 'MailWizz ≠ MTA. MailWizz uses SES/Mailgun/SendGrid as its SMTP relay. They serve different purposes in the stack.',
    },
  },
  {
    route: 'users', title: 'User Management', status: 'done', lines: 551,
    desc: 'Manage users, impersonate, reset passwords',
    modal: {
      title: 'User Management', status: 'done',
      what: 'View all users across all orgs. Impersonate any user (generate impersonation session for debugging), reset passwords, view activity.',
      how: '/api/superadmin/users/impersonate generates a scoped session. Password reset goes through Supabase admin API.',
      tech: ['users table', 'Supabase admin API', 'impersonation sessions'],
    },
  },
  {
    route: 'workflow-manager', title: 'Workflow Manager', status: 'done', lines: 3611,
    desc: 'Visual drag-and-drop workflow builder (ReactFlow)',
    modal: {
      title: 'Workflow Manager', badge: 'Most Mature', status: 'done',
      what: 'Full visual workflow builder using ReactFlow with 36 node types across 8 categories: Triggers, Resolvers, Generators, Validators, Enrichers, Transforms, Outputs, Utilities. Build complex multi-step AI pipelines with drag-and-drop.',
      how: 'Builder saves workflow_templates to DB. Execution goes through BullMQ → engine-execution-worker → workflowExecutionService (3611-line processor). Supports checkpoint/resume on failure, token tracking per node.',
      tech: ['ReactFlow', '36 node types', 'workflow_templates', 'workflow-execution-processor.ts (3611 lines)', 'topological sort', 'checkpoint/resume'],
    },
  },
  { route: 'ai-providers', title: 'AI Providers', status: 'done', lines: 800, desc: 'Add/configure AI providers and models', modal: { title: 'AI Providers', status: 'done', what: 'Add API keys for OpenAI, Anthropic, Google, Mistral, xAI, Perplexity. Configure fallback chain order. Discover available models from provider API. Set pricing per model.', how: 'Writes to ai_providers and ai_models tables. AIProviderService reads from DB at runtime — model selection is fully dynamic, not hardcoded.', tech: ['ai_providers', 'ai_models', 'AIProviderService', '6 providers', 'fallback chain'] } },
  { route: 'mastery-agents', title: 'Mastery Agents', status: 'partial', lines: 723, desc: '9 specialized AI agents for deep analysis', modal: { title: 'Mastery Agents', status: 'partial', what: '9 specialized agents: Angle, BuyerStage, BuyingRole, ContactDecision, ReplyMeaning, SendPacing, SequenceProgression, TimingWindow, UncertaintyResolution. Each has deep domain expertise.', how: 'Agents are invoked by BrainOrchestrator for specific analytical tasks. Config stored in brain_agents with role-specific system prompts.', tech: ['MarketingCoachService', '9 mastery agent types', 'brain_agents', 'specialized prompts'], note: 'Some CRUD actions partial — read and view is complete.' } },
  { route: 'organizations', title: 'Organizations', status: 'done', lines: 323, desc: 'Create and manage client orgs', modal: { title: 'Organizations', status: 'done', what: 'Create new organizations with plan tier, assign active brain template, view run counts and usage per org.', how: 'Writes to organizations table. Org creation can trigger welcome email (TODO). Brain assignment updates brain_agents.org_id.', tech: ['organizations', 'org_id scoping', 'plan tiers: echii/pulz/quanta'] } },
  { route: 'brains', title: 'Brain Templates', status: 'done', lines: 500, desc: 'Build and version AI brain templates', modal: { title: 'Brain Templates', status: 'done', what: 'Master brain blueprints. Each template defines the LLM config, RAG settings, agent configuration, and prompt layers. Versioned — can roll back.', how: 'brain_templates table with version history. Deployed via Engine Bundle to create a live brain_agents record for an org.', tech: ['brain_templates', 'brain_version_history', 'RAG config', 'prompt_layers'] } },
  { route: 'licenses', title: 'Licenses', status: 'partial', lines: 609, desc: 'Manage org quotas and usage limits', modal: { title: 'Licenses', status: 'partial', what: 'View license stats per org (runs quota, KB quota). Transaction history. Upgrade/downgrade plan tiers.', how: 'Reads from licenses and license_transactions tables. Some management actions are partial.', tech: ['licenses', 'license_transactions', 'runs_quota', 'kb_quota'] } },
  { route: 'analytics', title: 'SA Analytics', status: 'done', lines: 506, desc: 'Platform-wide metrics dashboard', modal: { title: 'SA Analytics', status: 'done', what: 'Cross-org platform metrics: total runs by org, AI cost by provider/model, error rates, usage trends.', how: 'Aggregates engine_run_logs, brain_request_logs, ai_usage_logs across all orgs.', tech: ['engine_run_logs', 'brain_request_logs', 'ai_usage_logs', 'cross-org aggregation'] } },
  { route: 'engines', title: 'Engine Instances', status: 'done', lines: 483, desc: 'View all deployed engine instances', modal: { title: 'Engine Instances', status: 'done', what: 'Lists all deployed engine instances across all orgs. Shows status, run history, API keys, token usage.', how: 'Queries engine_instances joined with organizations and engine_bundles.', tech: ['engine_instances', 'engine_run_logs', 'api_key_mode', 'byok_keys'] } },
  { route: 'workers', title: 'Worker Control', status: 'done', lines: 458, desc: 'Start/stop/restart workers, view logs', modal: { title: 'Worker Control', status: 'done', what: 'View all 9 workers with status, start/stop/restart, view logs, check Railway deployment.', how: 'Calls Worker Management API (:3100) for live stats and control actions.', tech: ['Worker API :3100', 'PM2 process management', 'Railway integration'] } },
  { route: 'prompt-library', title: 'Prompt Library', status: 'partial', lines: 369, desc: 'Create reusable prompt layers', modal: { title: 'Prompt Library', status: 'partial', what: 'Create and manage prompt layers: foundation (what the AI is), persona (how it communicates), domain (what it knows), guardrails (what it must never do). These become building blocks for Brain Templates.', how: 'Writes to prompt_layers table with type, tier, and content fields.', tech: ['prompt_layers', '4 layer types', 'tier-based access'], note: 'Some save/delete actions are placeholder stubs.' } },
  { route: 'dashboard', title: 'SA Dashboard', status: 'done', lines: 400, desc: 'Superadmin home with platform stats', modal: { title: 'SA Dashboard', status: 'done', what: 'Platform overview: total orgs, total users, total runs today/week/month, error rate, Redis health, worker status.', how: '/api/superadmin/stats aggregates across all tables.', tech: ['/api/superadmin/stats', 'cross-table aggregation', 'worker health'] } },
]

const WORKERS: Array<{ name: string; queue: string; concurrency: number; status: string; desc: string; modal: ModalInfo }> = [
  {
    name: 'engine-execution-worker', queue: 'engine-execution', concurrency: 2, status: 'done',
    desc: 'Runs deployed engine workflows end-to-end',
    modal: { title: 'Engine Execution Worker', status: 'done', what: 'The most critical worker. Picks up engine run jobs and executes the full workflow: loads engine config from DB, runs nodes in topological order, tracks tokens/cost, saves results. This is what actually generates email content.', how: 'Listens to engine-execution BullMQ queue. Calls workflowExecutionService.executeWorkflow(). Publishes progress to Redis pub/sub for SSE streaming. Updates engine_run_logs on completion.', tech: ['BullMQ', 'workflowExecutionService', 'Redis pub/sub SSE', 'engine_run_logs', 'token tracking'] },
  },
  {
    name: 'workflow-execution-worker', queue: 'workflow-execution', concurrency: 10, status: 'done',
    desc: 'Template-based workflow runs (high concurrency)',
    modal: { title: 'Workflow Execution Worker', status: 'done', what: 'Handles direct workflow template execution with 10x concurrency (vs 2x for engine execution). Used for superadmin workflow tests and template-based runs outside the engine bundle system.', how: 'Simpler processor than engine-execution. Handles basic node types: trigger, input, ai_generation, output, condition, transform.', tech: ['BullMQ', 'workflow-execution queue', 'concurrency: 10', 'workflow-processor.ts'] },
  },
  {
    name: 'scheduled-task-worker', queue: 'scheduled-task', concurrency: 5, status: 'done',
    desc: 'Cron/event fan-out dispatcher',
    modal: { title: 'Scheduled Task Worker', status: 'done', what: 'A fan-out dispatcher for scheduled jobs. Accepts job types (dream_cycle, learning_loop, kb_reprocess, analytics_rollup) and routes them to the appropriate downstream worker queue.', how: 'External schedulers (pg_cron, Railway Cron, GitHub Actions) push jobs here. The worker just routes — it doesn\'t execute directly.', tech: ['BullMQ', 'fan-out routing', '4 job types', 'external scheduler compatible'] },
  },
  {
    name: 'kb-worker', queue: 'kb-processing', concurrency: 5, status: 'done',
    desc: 'Semantic chunk → embed → store KB documents',
    modal: { title: 'KB Processing Worker', status: 'done', what: 'The full KB pipeline: takes a raw document, semantically chunks it (paragraph → sentence → word boundaries with sliding overlap), generates embeddings via text-embedding-3-large, stores chunks in the embeddings table.', how: 'semanticChunk() splits on natural language boundaries. generateEmbedding() calls the org\'s configured AI provider. Upserts to embeddings table with org_id for RLS. Updates kb_documents status: pending → chunking → embedding → ready.', tech: ['semantic chunker', 'text-embedding-3-large', 'embeddings (pgvector)', 'kb_documents status flow', '5x concurrency'] },
  },
  {
    name: 'conversation-worker', queue: 'conversation-summary', concurrency: 3, status: 'done',
    desc: 'LLM-powered conversation summarization',
    modal: { title: 'Conversation Summary Worker', status: 'done', what: 'Periodically compresses old conversations (>7 days) into summaries to save storage and improve future context retrieval.', how: 'Fetches conversation messages, sends to LLM with summarization prompt, writes summary back to conversations.summary. Fixed: now uses real LLM call, not stub string.', tech: ['conversations', 'messages', 'LLM summarization', 'aiService.generateText()'] },
  },
  {
    name: 'analytics-worker', queue: 'analytics', concurrency: 2, status: 'done',
    desc: 'Aggregate usage metrics per org',
    modal: { title: 'Analytics Worker', status: 'done', what: 'Aggregates usage events (runs, tokens, costs) into time-bucketed analytics rows for fast dashboard queries.', how: 'Reads engine_run_logs and brain_request_logs, groups by org/time, writes to analytics aggregation tables.', tech: ['engine_run_logs', 'brain_request_logs', 'time-bucket aggregation'] },
  },
  {
    name: 'dream-state-worker', queue: 'dream-state', concurrency: 2, status: 'done',
    desc: 'Nightly memory consolidation — 7 job types',
    modal: { title: 'Dream State Worker', status: 'done', what: 'The Brain\'s nightly consolidation cycle. Handles 7 job types: memory_consolidation (merge related memories), embedding_optimization (clean stale vectors), conversation_summary (compress old chats), feedback_analysis (learn from ratings), pattern_precomputation (cache common queries), cleanup (remove expired data), full_cycle (run all).', how: 'Runs on schedule (via scheduled-task-worker) or on-demand. Writes to brain_memories, brain_dream_logs. LLM used for conversation summaries.', tech: ['brain_memories', 'brain_dream_logs', '7 job types', 'memory decay', 'LLM summarization'] },
  },
  {
    name: 'learning-loop-worker', queue: 'learning-loop', concurrency: 1, status: 'done',
    desc: 'Marketing Coach — daily AI optimization',
    modal: { title: 'Learning Loop Worker', status: 'done', what: 'The feedback brain. After every email campaign cycle, analyzes signal_events (opens, clicks, replies, bounces) per belief. High-performing beliefs gain confidence. Underperformers lose it. Results written to brain_memories and brain_reflections.', how: 'MarketingCoachProcessor reads signal_event aggregated by belief_id. Updates brain_beliefs.confidence_score (+/-0.1 bounded). Writes brain_memories and brain_reflections for audit trail.', tech: ['MarketingCoachProcessor', 'signal_event', 'brain_beliefs', 'brain_memories', 'brain_reflections', 'concurrency: 1'] },
  },
  {
    name: 'mastery-agent-worker', queue: 'mastery-agent', concurrency: 8, status: 'done',
    desc: '9 async decision agents — angle, buyer stage, timing, reply, pacing + more',
    modal: { title: 'Mastery Agent Worker', badge: 'NEW', status: 'done', what: 'Runs 9 specialized decision agents asynchronously. Previously these ran synchronously inside BrainOrchestrator (blocking the response). Now they are fully async — Brain returns the response immediately and agent decisions happen in the background.', how: 'BrainOrchestrator queues a mastery-agent job after each turn. Worker picks it up (concurrency: 8), runs the appropriate agent (AngleSelection, BuyerStage, BuyingRole, ContactDecision, ReplyMeaning, SendPacing, SequenceProgression, TimingWindow, UncertaintyResolution), writes result to brain_decisions table, updates brain_beliefs.confidence_score if relevant.', tech: ['mastery-agent queue', 'BullMQ concurrency: 8', 'brain_decisions', 'brain_beliefs', '9 agent types', 'KB-confidence weighted decisions', 'non-blocking'] },
  },
  {
    name: 'fine-tuning-worker', queue: 'fine-tuning', concurrency: 1, status: 'done',
    desc: 'OpenAI fine-tuning pipeline — real API wired',
    modal: { title: 'Fine-Tuning Worker', status: 'done', what: 'Manages the complete OpenAI fine-tuning pipeline: collect training examples from feedback, format as JSONL, upload to OpenAI Files API, submit fine-tuning job, poll job status, deploy the resulting model ID into brain_templates.config.', how: 'Real API: OpenAI Files API (POST /v1/files) + Fine-tuning Jobs API (POST /v1/fine_tuning/jobs). Monitor polls GET /v1/fine_tuning/jobs/{id}. Deploy writes actual fine_tuned_model ID to brain_templates.', tech: ['OpenAI Files API', 'OpenAI Fine-tuning API', 'brain_templates.config.model', 'JSONL format', 'brain_version_history'] },
  },
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
  { priority: 'P0', label: 'DB Migrations 029–036', desc: 'All new tables (engine bundles, agent templates, signal_event idempotency, 4 new brain tools) — MUST run on prod Supabase before deploy' },
  { priority: 'P1', label: '/chat → /brain-chat redirect', desc: 'Legacy page org_id is now fixed via real auth. Final step: add a redirect so /chat → /brain-chat automatically.' },
  { priority: 'P1', label: 'Portal tier-gating UI', desc: 'Portal page links to real routes now. Full tier-locked feature gating UI needs completion.' },
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

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ info, onClose, dark }: { info: ModalInfo; onClose: () => void; dark: boolean }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const card = dark ? 'bg-[#13131f] border-white/15' : 'bg-white border-slate-200'
  const muted = dark ? 'text-white/55' : 'text-slate-500'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
          className={`relative w-full max-w-xl rounded-2xl border ${card} shadow-2xl overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          {/* Gradient accent top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-black">{info.title}</h2>
                  {info.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">{info.badge}</span>
                  )}
                  {info.status && <StatusBadge status={info.status} />}
                </div>
              </div>
              <button onClick={onClose}
                className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-lg ${dark ? 'hover:bg-white/10' : 'hover:bg-slate-100'} transition-colors`}>
                ×
              </button>
            </div>

            {/* What it does */}
            <div>
              <div className={`text-xs font-bold uppercase tracking-widest ${muted} mb-2`}>What it does</div>
              <p className="text-base leading-relaxed whitespace-pre-line">{info.what}</p>
            </div>

            {/* How it works */}
            <div>
              <div className={`text-xs font-bold uppercase tracking-widest ${muted} mb-2`}>How it works</div>
              <p className={`text-sm leading-relaxed ${muted}`}>{info.how}</p>
            </div>

            {/* Tech stack */}
            <div>
              <div className={`text-xs font-bold uppercase tracking-widest ${muted} mb-2`}>Tech / Tables / Services</div>
              <div className="flex flex-wrap gap-2">
                {info.tech.map(t => (
                  <span key={t} className={`px-2.5 py-1 rounded-lg text-sm font-mono font-medium ${dark ? 'bg-white/[0.06] text-violet-300' : 'bg-violet-50 text-violet-700'}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Note if any */}
            {info.note && (
              <div className={`rounded-xl p-4 text-sm leading-relaxed ${dark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                <span className="font-bold">Note: </span>{info.note}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Clickable Card ───────────────────────────────────────────────────────────

function ClickCard({
  children, onClick, dark, className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  dark: boolean
  className?: string
}) {
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setTimeout(() => setRipple(null), 600)
    onClick()
  }

  return (
    <motion.div
      onClick={handleClick}
      whileHover={{ scale: 1.02, boxShadow: dark ? '0 0 0 1px rgba(139,92,246,0.4), 0 8px 30px rgba(139,92,246,0.15)' : '0 0 0 1px rgba(139,92,246,0.3), 0 8px 20px rgba(139,92,246,0.1)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative overflow-hidden cursor-pointer select-none ${className}`}
    >
      {children}
      {/* Ripple */}
      {ripple && (
        <motion.div
          initial={{ width: 0, height: 0, opacity: 0.4 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ left: ripple.x - 150, top: ripple.y - 150 }}
          className="absolute rounded-full bg-violet-400 pointer-events-none"
        />
      )}
    </motion.div>
  )
}

// ─── Flow Graph (node-based) ──────────────────────────────────────────────────

interface FlowNodeDef {
  id: string
  icon: string
  label: string
  sub: string
  modal: ModalInfo
  type: 'trigger' | 'api' | 'brain' | 'queue' | 'worker' | 'db' | 'user'
}

const nodeColors: Record<string, string> = {
  trigger: 'from-violet-500/25 to-purple-500/25 border-violet-500/40',
  api:     'from-blue-500/25 to-cyan-500/25 border-blue-500/40',
  brain:   'from-emerald-500/25 to-teal-500/25 border-emerald-500/40',
  queue:   'from-orange-500/25 to-amber-500/25 border-orange-500/40',
  worker:  'from-rose-500/25 to-pink-500/25 border-rose-500/40',
  db:      'from-slate-500/25 to-gray-500/25 border-slate-500/40',
  user:    'from-cyan-500/25 to-sky-500/25 border-cyan-500/40',
}
const nodeGlow: Record<string, string> = {
  trigger: 'rgba(139,92,246,0.5)',
  api:     'rgba(59,130,246,0.5)',
  brain:   'rgba(16,185,129,0.5)',
  queue:   'rgba(249,115,22,0.5)',
  worker:  'rgba(244,63,94,0.5)',
  db:      'rgba(100,116,139,0.5)',
  user:    'rgba(6,182,212,0.5)',
}

const FLOW_NODES: Record<FlowKey, FlowNodeDef[]> = {
  writer: [
    { id: 'w1', icon: '👤', label: 'User', sub: '/writer/new', type: 'user', modal: { title: 'User Action', what: 'User visits /writer/new and submits a run request: target ICP, topic, tone, and any specific instructions.', how: 'Form submit triggers POST /api/writer/execute with the input payload.', tech: ['/writer/new page', 'form submission'] } },
    { id: 'w2', icon: '🔐', label: 'Auth + Org', sub: 'Supabase session', type: 'api', modal: { title: 'Auth Check', what: 'Supabase session is verified. The user\'s org_id is loaded from the users table. No anonymous runs allowed.', how: 'createServerClient().auth.getUser() → users.select(org_id). If no session → 401.', tech: ['Supabase session', 'users.org_id', 'createServerClient()'] } },
    { id: 'w3', icon: '🧠', label: 'Brain Runtime', sub: 'Active agent loaded', type: 'brain', modal: { title: 'Brain Runtime Resolver', what: 'The active brain_agent for the org is loaded. This is the single source of truth for all Brain operations — LLM config, tools, RAG settings, prompt layers.', how: 'BrainRuntimeResolver.resolveForOrg(orgId). Reads brain_agents table. Caches per request.', tech: ['BrainRuntimeResolver', 'brain_agents', 'requireActiveBrainRuntime()'] } },
    { id: 'w4', icon: '📚', label: 'KB Context', sub: 'ICP + beliefs + offer', type: 'brain', modal: { title: 'KB Context Build', what: 'Full context package assembled: KB sections, ICP profile, belief scores, offer details, and pre-assembled prompt stack. This becomes the brain_context payload.', how: 'BrainKBService.buildWriterContext(orgId). Pulls kb_sections, icp_segments, brain_beliefs, offers in parallel.', tech: ['BrainKBService', 'kb_sections', 'icp_segments', 'brain_beliefs', 'offers'] } },
    { id: 'w5', icon: '📦', label: 'BullMQ Queue', sub: 'Redis job created', type: 'queue', modal: { title: 'Job Queued', what: 'A BullMQ job is pushed to the engine-execution queue in Redis. The API returns immediately with an executionId — the user doesn\'t wait for the AI response.', how: 'engineQueue.add(\'engine-execution\', { executionId, engineId, brain_context, input }). Redis stores the job.', tech: ['BullMQ', 'engine-execution queue', 'Redis', 'axiom: prefix', 'executionId returned'] } },
    { id: 'w6', icon: '⚡', label: 'Worker', sub: 'concurrency: 2', type: 'worker', modal: { title: 'Engine Execution Worker', what: 'The worker picks up the job. Loads engine config from DB. Runs the workflow nodes in topological order. Publishes progress updates to Redis pub/sub for real-time streaming.', how: 'engine-execution-worker.ts → workflowExecutionService.executeWorkflow(). Kahn\'s topological sort on the workflow graph. Each node executes in sequence.', tech: ['engine-execution-worker', 'workflowExecutionService', 'topological sort', 'Redis pub/sub', 'concurrency: 2'] } },
    { id: 'w7', icon: '🤖', label: 'AI Generate', sub: 'KB + ICP + beliefs', type: 'brain', modal: { title: 'AI Generation Node', what: 'The AI generation node in the workflow runs. Brain context (KB content, ICP, beliefs, offer) is injected into the prompt. The LLM generates a hyper-personalized email.', how: 'executeAIGenerationNode() in workflow-execution-processor.ts. Calls aiService.generateText() with assembled prompt. Token usage tracked per node.', tech: ['ai_generation node', 'aiService', 'brain_context injection', 'token tracking', 'cost tracking'] } },
    { id: 'w8', icon: '💾', label: 'Save to DB', sub: 'engine_run_logs', type: 'db', modal: { title: 'Result Saved', what: 'The generated email, token usage, cost, and duration are saved to engine_run_logs. Status updated from "running" to "completed".', how: 'updateExecutionStatus(executionId, \'completed\', { result, tokensUsed, cost, durationMs }).', tech: ['engine_run_logs', 'output_data JSONB', 'tokens_used', 'cost_usd', 'duration_ms'] } },
    { id: 'w9', icon: '✅', label: 'User Sees', sub: 'Poll → display', type: 'user', modal: { title: 'Result Displayed', what: 'Frontend polls GET /api/engines/executions/[id] until status is "completed". The generated email is displayed to the user.', how: 'setInterval polling every 2s. On completed: stop polling, display output_data.finalOutput.', tech: ['GET /api/engines/executions/[id]', 'polling', 'output_data.finalOutput'] } },
  ],
  brain: [
    { id: 'b1', icon: '💬', label: 'User Message', sub: '/brain-chat', type: 'user', modal: { title: 'User Sends Message', what: 'User types a message in /brain-chat. Could be anything: "Write a follow-up for this reply", "What angle works for fintech CTOs?", "How are my campaigns doing?"', how: 'POST /api/brain/chat with { message, conversationId? }. Supports streaming (EventSource SSE).', tech: ['/brain-chat page', 'POST /api/brain/chat', 'conversationId optional'] } },
    { id: 'b2', icon: '🎯', label: 'Runtime Resolve', sub: 'Single source of truth', type: 'api', modal: { title: 'Brain Runtime Resolver', what: 'The active brain_agent for this org is resolved. Never stale — always reads from brain_agents table which is the single source of truth.', how: 'BrainRuntimeResolver.resolveForOrg(orgId). Returns full agent config: LLM settings, tools_granted, RAG config, prompt layer IDs.', tech: ['BrainRuntimeResolver', 'brain_agents', 'ToolLoader'] } },
    { id: 'b3', icon: '📝', label: 'Prompt Assembly', sub: '4 layers injected', type: 'brain', modal: { title: 'Prompt Assembly', what: 'Four prompt layers are assembled: Foundation (what the AI is), Persona (how it speaks), Domain (what it knows about the business), Guardrails (what it must never do). Plus memory context and RAG results.', how: 'PromptAssembler.assemble(agentConfig, ragResults, memories). Reads prompt_layers table for each layer type.', tech: ['PromptAssembler', 'prompt_layers', 'foundation + persona + domain + guardrails', 'memory injection'] } },
    { id: 'b4', icon: '🔍', label: 'RAG Retrieval', sub: 'Hybrid vector + FTS', type: 'brain', modal: { title: 'RAG Orchestrator', what: 'Retrieves the most relevant KB content using hybrid search: 70% vector similarity + 30% full-text search. Reranks results. Detects knowledge gaps if retrieval scores are low.', how: 'RAGOrchestrator.retrieve(query, orgId). Calls hybrid_search Postgres RPC (vector + FTS). Min similarity: 0.5 floor. Gap detected → inserts to knowledge_gaps table.', tech: ['RAGOrchestrator', 'hybrid_search() RPC', 'embeddings (pgvector)', 'knowledge_gaps', 'min_similarity: 0.5'] } },
    { id: 'b5', icon: '🤖', label: 'Agentic Loop', sub: 'Tool calls + guard', type: 'brain', modal: { title: 'BrainOrchestrator Agentic Loop', what: 'Multi-turn reasoning loop. The LLM can call tools (write_email, search_kb, get_campaign_insights, etc.). Every tool call goes through HallucinationInterceptor before execution. Supports up to N turns.', how: 'BrainOrchestrator.handleTurn(). Tool call → HallucinationInterceptor.validate() → MarketXToolExecutor.execute(). All 15 tools available based on agent\'s tools_granted.', tech: ['BrainOrchestrator (1524 lines)', 'HallucinationInterceptor', 'MarketXToolExecutor', '15 tools', 'multi-turn'] } },
    { id: 'b6', icon: '📡', label: 'SSE Stream', sub: 'Real-time chunks', type: 'api', modal: { title: 'Server-Sent Events Stream', what: 'Response streams word-by-word to the frontend in real-time. Events: turn_start, llm_response, tool_result, chunk (text), done.', how: 'AIProviderService.streamText() → yields chunks → SSE response. Frontend EventSource receives chunks and renders incrementally.', tech: ['Server-Sent Events', 'AIProviderService.streamText()', 'EventSource API', 'ReadableStream'] } },
    { id: 'b7', icon: '💾', label: 'Save + Learn', sub: 'Memory + coach queued', type: 'db', modal: { title: 'Save & Trigger Learning', what: 'Conversation saved to messages table. brain_request_logs updated. Marketing Coach job queued async (non-blocking) to analyze the interaction and potentially update belief scores.', how: 'saveAssistantMessage() → messages INSERT. brainConfigService.logRequest() → brain_request_logs. learningQueue.add(\'coach_analysis\') → non-blocking async.', tech: ['messages', 'brain_request_logs', 'learning-loop queue', 'MarketingCoachProcessor (async)'] } },
  ],
  engine: [
    { id: 'e1', icon: '▶️', label: 'Trigger', sub: 'User / webhook / API', type: 'trigger', modal: { title: 'Execution Trigger', what: 'Execution can be triggered by: user clicking Run in the UI, an incoming email webhook, an external API call with authentication, or a scheduled task.', how: 'All routes to POST /api/engines/[id]/execute. Auth checked (Supabase session or x-user-id header for server-to-server).', tech: ['POST /api/engines/[id]/execute', 'Supabase session auth', 'webhook trigger', 'API key trigger'] } },
    { id: 'e2', icon: '🔐', label: 'Auth + Load', sub: 'Engine instance loaded', type: 'api', modal: { title: 'Auth & Engine Load', what: 'Session verified. engine_instances record loaded from DB (includes workflow config, Brain config, email provider). org context resolved.', how: 'Supabase session → users.org_id. engine_instances.select(*).eq(id, engineId). Includes flowConfig (nodes + edges).', tech: ['engine_instances', 'flowConfig JSONB', 'org_id resolution', 'Supabase auth'] } },
    { id: 'e3', icon: '📋', label: 'Log Created', sub: 'status: started', type: 'db', modal: { title: 'Execution Log Created', what: 'An engine_run_logs row is inserted immediately with status "started". This gives the user a reference ID and creates the audit trail.', how: 'supabase.from(\'engine_run_logs\').insert({ id: executionId, engine_id, org_id, input_data, status: \'started\', started_at }).', tech: ['engine_run_logs', 'executionId (UUID)', 'input_data JSONB', 'status: started'] } },
    { id: 'e4', icon: '📦', label: 'Queue Job', sub: 'Returns immediately', type: 'queue', modal: { title: 'BullMQ Job Queued', what: 'Job pushed to Redis via BullMQ. API returns { executionId, status: "queued" } immediately — no waiting for AI. The heavy lifting happens async in the worker.', how: 'engineQueue.add(\'engine-execution\', jobData). Job has: executionId, engineId, engine config, userId, orgId, input, options.', tech: ['BullMQ', 'Redis', 'engine-execution queue', 'async dispatch', 'immediate response'] } },
    { id: 'e5', icon: '🗂️', label: 'Topo Sort', sub: "Kahn's algorithm", type: 'worker', modal: { title: 'Topological Sort', what: 'The workflow graph (nodes + edges) is topologically sorted so nodes execute in the correct dependency order. If Node B needs output from Node A, Node A always runs first.', how: "Kahn's algorithm on the directed acyclic graph. Nodes with no incoming edges run first. Parallel nodes can run concurrently (future enhancement).", tech: ["Kahn's algorithm", 'directed acyclic graph', 'workflow nodes/edges', 'dependency resolution'] } },
    { id: 'e6', icon: '⚙️', label: 'Node Execution', sub: '36 node types', type: 'worker', modal: { title: 'Node-by-Node Execution', what: 'Each node runs in order: trigger → input → KB retrieval → AI generation → condition → transform → output. Each node type has its own executor in workflow-execution-processor.ts.', how: 'executeNode(node, pipelineData) dispatches to the correct executor based on node.data.nodeType. Output of each node becomes input for the next.', tech: ['workflow-execution-processor.ts (3611 lines)', '36 node types', 'pipelineData pipeline', 'token tracking per node', 'checkpoint/resume'] } },
    { id: 'e7', icon: '📊', label: 'Progress SSE', sub: 'Redis pub/sub', type: 'queue', modal: { title: 'Progress Streaming', what: 'As each node completes, a progress event is published to Redis pub/sub on channel execution:{id}:progress. Frontend can subscribe via SSE to see live node completion.', how: 'publishProgress(executionId, { nodeId, status, output }). Redis PUBLISH. Frontend SSE endpoint SUBSCRIBE and forward chunks.', tech: ['Redis pub/sub', 'publishProgress()', 'execution:{id}:progress channel', 'SSE endpoint'] } },
    { id: 'e8', icon: '✅', label: 'Complete', sub: 'tokens + cost saved', type: 'db', modal: { title: 'Execution Complete', what: 'Final result saved. engine_run_logs updated with: status "completed", output_data (final output), tokens_used, cost_usd, duration_ms. Completion event published to Redis.', how: 'updateExecutionStatus(executionId, \'completed\', { result, tokensUsed, cost, durationMs }). publishExecutionComplete(executionId).', tech: ['engine_run_logs', 'output_data.finalOutput', 'tokens_used', 'cost_usd', 'duration_ms', 'publishExecutionComplete()'] } },
  ],
}

function FlowGraph({ flowKey, onNodeClick, dark }: { flowKey: FlowKey; onNodeClick: (m: ModalInfo) => void; dark: boolean }) {
  const nodes = FLOW_NODES[flowKey]
  const [activeNode, setActiveNode] = useState<string | null>(null)

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-center gap-0 min-w-max px-2 py-6">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-center">
            {/* Node */}
            <motion.div
              onHoverStart={() => setActiveNode(node.id)}
              onHoverEnd={() => setActiveNode(null)}
              onClick={() => onNodeClick(node.modal)}
              whileHover={{ scale: 1.08, boxShadow: `0 0 24px ${nodeGlow[node.type]}, 0 0 8px ${nodeGlow[node.type]}` }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`relative w-[120px] cursor-pointer rounded-2xl border-2 bg-gradient-to-br p-3 text-center flex-shrink-0 ${nodeColors[node.type]}`}
            >
              {/* Pulse ring when active */}
              {activeNode === node.id && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="absolute inset-0 rounded-2xl border-2 border-violet-400"
                />
              )}
              <div className="text-2xl mb-1.5">{node.icon}</div>
              <div className="text-xs font-bold leading-tight">{node.label}</div>
              <div className={`text-[10px] mt-0.5 leading-snug ${dark ? 'text-white/50' : 'text-slate-500'}`}>{node.sub}</div>
              {/* Click hint */}
              <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium ${dark ? 'text-white/30' : 'text-slate-400'} whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity`}>
                click for details
              </div>
            </motion.div>

            {/* Arrow connector */}
            {i < nodes.length - 1 && (
              <div className="flex items-center flex-shrink-0 mx-1">
                <motion.div
                  className={`h-px w-8 ${dark ? 'bg-gradient-to-r from-white/20 to-white/40' : 'bg-gradient-to-r from-slate-200 to-slate-400'}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                />
                <motion.div
                  className={`w-0 h-0 border-t-4 border-b-4 border-l-8 border-t-transparent border-b-transparent ${dark ? 'border-l-white/40' : 'border-l-slate-400'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className={`text-sm text-center mt-2 ${dark ? 'text-white/30' : 'text-slate-400'}`}>
        Click any node to see what happens inside
      </p>
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
  const [modal, setModal] = useState<ModalInfo | null>(null)
  const openModal = useCallback((info: ModalInfo) => setModal(info), [])
  const closeModal = useCallback(() => setModal(null), [])

  const bg = dark ? 'bg-[#080810]' : 'bg-slate-50'
  const text = dark ? 'text-white' : 'text-slate-900'
  const card = dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200 shadow-sm'
  const sub = dark ? 'bg-white/[0.025] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
  const muted = dark ? 'text-white/45' : 'text-slate-500'
  const navBg = dark ? 'bg-[#080810]/90 border-white/10' : 'bg-white/90 border-slate-200'

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-200`}>
      {/* Modal overlay */}
      {modal && <Modal info={modal} onClose={closeModal} dark={dark} />}

      {/* NAV */}
      <nav className={`sticky top-0 z-50 border-b ${navBg} backdrop-blur-xl px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Image
            src={dark ? '/7.png' : '/6.png'}
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
              src={dark ? '/7.png' : '/6.png'}
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
            Multi-org SaaS · Agentic Brain with RAG · 10 Workers · 9 Mastery Agents (async) · 65+ API Routes · ~80 DB Tables · 24 Superadmin Pages
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
                <p className={`text-xs ${muted} mb-4`}>Click any card for full details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {USER_PAGES.map((p, i) => (
                    <motion.div key={p.route} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <ClickCard dark={dark} onClick={() => openModal(p.modal)}
                        className={`rounded-xl border ${sub} p-3.5`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-base font-semibold">{p.title}</div>
                            <div className={`text-sm font-mono ${muted} mt-0.5`}>{p.route}</div>
                            <div className={`text-sm ${muted} mt-2 leading-snug`}>{p.desc}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <StatusBadge status={p.status} />
                            <span className={`text-xs ${muted}`}>tap ↗</span>
                          </div>
                        </div>
                      </ClickCard>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl border ${card} p-5`}>
                <h2 className="text-xl font-bold mb-1">Superadmin — 18 Pages</h2>
                <p className={`text-sm ${muted} mb-5`}>The control panel. Only platform operators have access — users never see this.</p>
                <p className={`text-xs ${muted} mb-4`}>Click any card for full details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {SUPERADMIN_PAGES.map((p, i) => (
                    <motion.div key={p.route} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }}>
                      <ClickCard dark={dark} onClick={() => openModal(p.modal)}
                        className={`rounded-xl border ${sub} p-3.5`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-base font-semibold">{p.title}</div>
                            <div className={`text-sm font-mono ${muted} mt-0.5`}>/{p.route}</div>
                            <div className="text-sm text-violet-400 mt-1 font-medium">{p.lines.toLocaleString()} lines</div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <StatusBadge status={p.status} />
                            <span className={`text-xs ${muted}`}>tap ↗</span>
                          </div>
                        </div>
                      </ClickCard>
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
                    10/10 Production-ready
                  </div>
                </div>
                <p className={`text-xs ${muted} mb-4`}>Click any worker for full details</p>
                <div className="space-y-2.5">
                  {WORKERS.map((w, i) => (
                    <motion.div key={w.name} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.055 }}>
                      <ClickCard dark={dark} onClick={() => openModal(w.modal)}
                        className={`flex items-center gap-4 p-4 rounded-xl border ${sub}`}>
                        <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${w.status === 'done' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-base font-semibold font-mono ${dark ? 'text-white/90' : 'text-slate-800'}`}>{w.name}</span>
                            <StatusBadge status={w.status} />
                          </div>
                          <div className={`text-sm ${muted} mt-0.5`}>{w.desc}</div>
                        </div>
                        <div className="text-right flex-shrink-0 hidden md:flex flex-col items-end gap-0.5">
                          <div className={`text-sm font-mono ${muted}`}>{w.queue}</div>
                          <div className="text-sm text-violet-400 font-semibold">×{w.concurrency} concurrent</div>
                          <div className={`text-xs ${muted}`}>tap ↗</div>
                        </div>
                      </ClickCard>
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
                  <h2 className="text-xl font-bold mb-1">
                    {flowTab === 'writer' ? '✍️ Writer Run — Full Execution Chain' : flowTab === 'brain' ? '🧠 Brain Chat — Agentic Loop' : '⚡ Engine Run — Workflow Pipeline'}
                  </h2>
                  <p className={`text-sm ${muted} mb-6`}>Each node is interactive — click to see exactly what happens inside.</p>
                  <FlowGraph flowKey={flowTab} onNodeClick={openModal} dark={dark} />
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
                    { phase: 'Today', label: 'Env Configuration', desc: 'REDIS_URL, SUPABASE keys, AI API keys on Railway + server', active: true },
                    { phase: 'Today', label: 'Run DB Migrations 029–036', desc: 'Engine bundles, agent templates, signal_event idempotency, 4 new brain tools — all on prod Supabase', active: true },
                    { phase: 'Today', label: '🚀 GO LIVE', desc: 'Frontend (Railway) + Workers (Dedicated) + Redis (Server) = production', active: true },
                    { phase: 'Week 1', label: 'Add /chat redirect', desc: 'One-line: redirect /chat → /brain-chat', active: false },
                    { phase: 'Week 1', label: 'Portal tier-gating', desc: 'Complete the tier-locked feature gating UI in /portal', active: false },
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
              src={dark ? '/7.png' : '/6.png'}
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
