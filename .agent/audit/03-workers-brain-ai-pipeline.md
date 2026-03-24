# Axiom (MarketX) — Deep Audit: Part 3
## Workers, Brain System & AI Pipeline

---

## Worker Architecture

### 10 Workers (BullMQ Consumers)

| Worker | Queue | Concurrency | Purpose |
|--------|-------|-------------|---------|
| KB Worker | `kb-processing` | 5 | Knowledge base document processing |
| Conversation Worker | `conversation-summary` | 3 | Conversation summarization |
| Analytics Worker | `analytics` | 2 | Data aggregation & rollups |
| Dream State Worker | `dream-state` | 2 | Memory consolidation, cleanup, optimization |
| Fine-Tuning Worker | `fine-tuning` | 1 | AI model fine-tuning pipeline |
| Learning Loop Worker | `learning-loop` | 1 | Daily optimization cycles |
| Workflow Execution Worker | `workflow-execution` | 10 | Template workflow runs |
| Engine Execution Worker | `engine-execution` | 2 | Deployed engine runs (production) |
| Scheduled Task Worker | `scheduled-task` | 5 | Cron/event-triggered jobs |
| Mastery Agent Worker | `mastery-agent` | 8 | 9 async decision agents |

### Architecture Quality
- ✅ All workers use lazy Redis connection (won't crash if Redis is temporarily unavailable)
- ✅ Graceful shutdown on SIGTERM/SIGINT (closes all workers)
- ✅ Management API on port 3100 (`/api/health`, `/api/stats`, `/api/action`)
- ✅ Queue prefix `axiom:` prevents conflicts with Refinery Redis (if shared)
- ✅ Exponential backoff with configurable retry counts
- ✅ Rate limiting per queue (e.g., engine exec: 10 jobs/min max)

### Env Vars Required for Workers

| Var | Required By | Notes |
|-----|------------|-------|
| `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT` | All workers | BullMQ connection |
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | All workers | DB access |
| `SUPABASE_SERVICE_ROLE_KEY` | All workers | **Fail-fast validation** — workers crash on startup without this |
| `DATABASE_URL` | Dream State Worker | Direct Postgres connection (not via Supabase REST) |
| `OPENAI_API_KEY` | Dream State, Fine-Tuning, Engine Execution | AI generation |

> [!IMPORTANT]
> Workers have a **fail-fast pattern** (`supabase.ts` config). They crash immediately at startup if
> `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing. This is good — no silent failures.

---

## Dream State System

The "Brain" is one of MarketX's core differentiators. The Dream State handles background optimization:

| Job Type | What it does |
|----------|-------------|
| `memory_consolidation` | Finds and deduplicates exact-match embeddings |
| `embedding_optimization` | Removes orphaned embeddings (conversations deleted but vectors remain) |
| `conversation_summary` | Uses AI to summarize old conversations (>10 messages, >7 days old) |
| `feedback_analysis` | Aggregates user feedback patterns for reporting |
| `pattern_precomputation` | Identifies frequently asked queries for caching |
| `cleanup` | Purges expired caches and old retry queue entries |
| `full_cycle` | Runs all of the above in sequence |

### Assessment
- ✅ Production-grade SQL queries (parameterized, no injection)
- ✅ AI fallback: if summarization fails, uses plain text fallback
- ✅ Records job results in `dream_jobs` table for audit trail
- ✅ Rate-limited (5 jobs/sec max)
- ⚠️ `DATABASE_URL` required for direct Postgres access (not all workers use Supabase REST)

---

## Engine Execution Pipeline

This is the core revenue-generating flow: user creates an "engine" (AI workflow), clicks "Run", and it executes:

```
User clicks "Run" in UI
  → POST /api/engines/[id]/execute
    → Queues job to Redis (engine-execution queue)
      → engine-execution-worker picks up
        → Loads workflow config (nodes + edges)
        → Resolves agent configs (LLM, prompts, guardrails)
        → Executes workflow step by step
        → Publishes progress to Redis (real-time via SSE)
        → Writes results to engine_run_logs in Supabase
```

### Assessment
- ✅ Async execution with real-time progress (Redis pub/sub)
- ✅ Token tracking and cost calculation per execution
- ✅ Duration tracking
- ✅ Per-engine agent configs (LLM, prompts, temperature)
- ✅ Status updates: pending → running → completed/failed
- ✅ Error handling with full trace to DB
- ⚠️ Rate limited at 10 jobs/min — may need tuning for production load

---

## AI Provider System

### Discovery & Configuration
- **Dynamic:** Models discovered from provider APIs, not hardcoded
- **Multi-provider:** OpenAI, Anthropic, Google AI supported
- **Provider configs** stored in `email_provider_configs` table per organization
- **AI model configs** stored in `ai_model_configs` table

### Service Architecture
- `AIProviderService` — centralized service for all AI calls
- `aiService` (workers) — simplified worker-side AI client
- Both support org-scoped provider selection

### Assessment
- ✅ Provider abstraction is clean
- ✅ No hardcoded API keys in code
- ✅ Model discovery from live APIs
- ❌ **No API keys configured in env** — AI features are dead without them

---

## Integration: Refinery Nexus Bridge

### Code Location: `api/webhooks/email/[provider]/route.ts`

```
Webhook arrives (MailWizz/SES/Mailgun/SendGrid)
  → Normalize event to standard format
  → Store in Supabase (engagement_events)
  → Fire-and-forget POST to Refinery Nexus
    → Refinery stores in ClickHouse for analytics
```

### Assessment
- ✅ Fire-and-forget (non-blocking) — webhook response isn't delayed
- ✅ Gracefully skips if `REFINERY_NEXUS_URL` not set (no crash)
- ✅ Forwards raw webhook payload + provider identifier
- ❌ **Env vars not configured** — bridge is inactive

### What's needed to activate:
1. Set `REFINERY_NEXUS_URL=https://iiiemail.email` (or `http://107.172.56.66:4000`)
2. Set `REFINERY_NEXUS_API_KEY` to a key accepted by Refinery's webhook endpoint
3. Refinery needs a `POST /api/v1/webhooks/:provider` endpoint (verify this exists)

---

## Integration: MailWizz

### Code Locations:
- `services/email/providers/MailWizzAdapter.ts` — Full adapter
- `services/email/SatelliteSendOrchestrator.ts` — Campaign dispatch
- `api/webhooks/email/[provider]/route.ts` — Webhook receiver

### Adapter Capabilities:
| Capability | Status |
|-----------|--------|
| Send single email | ✅ Implemented |
| Send bulk (campaign) | ✅ Via subscriber list + campaign trigger |
| Create subscriber lists | ✅ Implemented |
| Webhook verification | ✅ HMAC signature check |
| Delivery stats | ✅ Via webhook events |
| Reply handling | ✅ Via webhook events |

### Assessment
- ✅ Clean adapter pattern (same interface as SES, Mailgun, SendGrid)
- ✅ Not hardcoded — reads config from `email_provider_configs` in Supabase
- ⚠️ Requires provider config to be created in Superadmin → Email Providers page
- ⚠️ MailWizz API key + base URL must be set in the provider config record

---

## Critical Worker Dependencies Summary

| Dependency | Status | Impact if Missing |
|-----------|--------|-------------------|
| Redis | ❌ Not installed on VPS | Workers can't start. Background jobs don't execute. |
| SUPABASE_URL | ✅ Available | — |
| SUPABASE_SERVICE_ROLE_KEY | ✅ Available | — |
| DATABASE_URL (Postgres) | ❌ Not in worker env | Dream State worker fails. Direct SQL queries fail. |
| OPENAI_API_KEY | ❌ Not in any env | AI features return fallbacks/errors. Core product broken. |
| REDIS_URL (for Vercel) | ❌ Not in Vercel env | Frontend API routes can't enqueue jobs to workers. |
