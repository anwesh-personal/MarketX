# Axiom (MarketX) — Deep Audit: Part 1
## Architecture & Structure

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AXIOM / MARKETX                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  apps/frontend (Next.js 14)                         │
│  ├── UI Pages (React, TailwindCSS 3)                │
│  │   ├── /dashboard         — Overview metrics      │
│  │   ├── /portal            — Partner portal        │
│  │   ├── /writer            — AI content studio     │
│  │   ├── /kb-manager        — Knowledge base CRUD   │
│  │   ├── /brain-chat        — Conversational AI     │
│  │   ├── /brain-control     — Brain config + agents │
│  │   ├── /learning          — Learning loop viewer  │
│  │   ├── /analytics         — Campaign analytics    │
│  │   ├── /settings          — User preferences      │
│  │   ├── /mastery-agents    — Agent management      │
│  │   ├── /marketx-os        — OS-level dashboard    │
│  │   ├── /system-map        — Interactive arch map  │
│  │   └── /superadmin/*      — Admin panel           │
│  │                                                   │
│  └── API Routes (/api/*)  ← THIS IS THE BACKEND    │
│      ├── /api/agents/*           — Agent dispatch    │
│      ├── /api/ai-models/*        — Provider mgmt    │
│      ├── /api/angles/*           — Angle system      │
│      ├── /api/beliefs/*          — Belief engine     │
│      ├── /api/brain/*            — 10+ brain routes  │
│      ├── /api/briefs/*           — Brief generation  │
│      ├── /api/campaigns/*        — Email campaigns   │
│      ├── /api/chat/*             — Chat system       │
│      ├── /api/contact/*          — Contact decisions  │
│      ├── /api/conversations/*    — Thread mgmt       │
│      ├── /api/cron/*             — Scheduled tasks   │
│      ├── /api/dashboard/*        — Dashboard data    │
│      ├── /api/domains/*          — Domain mgmt       │
│      ├── /api/engines/*          — Engine CRUD+exec  │
│      ├── /api/flows/*            — Workflow flows    │
│      ├── /api/icp/*              — ICP profiles      │
│      ├── /api/identity/*         — Identity sourcing │
│      ├── /api/imt/*              — IMT integration   │
│      ├── /api/kb/*               — Knowledge base    │
│      ├── /api/knowledge/*        — Knowledge mgmt    │
│      ├── /api/onboarding/*       — Onboarding flow   │
│      ├── /api/portal/*           — Portal data       │
│      ├── /api/replies/*          — Reply handling     │
│      ├── /api/runs/*             — Execution runs    │
│      ├── /api/satellites/*       — Satellite mgmt    │
│      ├── /api/signals/*          — Signal events     │
│      ├── /api/superadmin/*       — Admin endpoints   │
│      ├── /api/system/*           — System config     │
│      ├── /api/webhooks/*         — Webhook receivers  │
│      └── /api/workers/*          — Worker mgmt       │
│                                                      │
│  apps/workers (BullMQ Consumers)                    │
│  ├── kb-worker             (5 concurrent)           │
│  ├── conversation-worker   (3 concurrent)           │
│  ├── analytics-worker      (2 concurrent)           │
│  ├── dream-state-worker    (2 concurrent)           │
│  ├── fine-tuning-worker    (1 concurrent)           │
│  ├── learning-loop-worker  (1 concurrent)           │
│  ├── workflow-exec-worker  (10 concurrent)          │
│  ├── engine-exec-worker    (2 concurrent)           │
│  ├── scheduled-task-worker (5 concurrent)           │
│  └── mastery-agent-worker  (8 concurrent)           │
│                                                      │
│  apps/backend (Express, port 8080) ← LEGACY/DEAD    │
│  └── Deprecated. All logic moved to Next.js API     │
│                                                      │
├─────────────────────────────────────────────────────┤
│                  EXTERNAL SERVICES                   │
├─────────────────────────────────────────────────────┤
│  Supabase     — Auth + Postgres DB                  │
│  Redis        — BullMQ job queues                   │
│  OpenAI       — AI generation                       │
│  Anthropic    — AI generation (optional)            │
│  Google AI    — AI generation (optional)            │
│  Refinery     — ClickHouse data warehouse (webhook) │
│  MailWizz     — Campaign dispatch (autoresponder)   │
│  Mailgun/SES  — SMTP relay                          │
└─────────────────────────────────────────────────────┘
```

---

## Database (Supabase/Postgres)

**40 migrations** — from core extensions through to engine RLS policies.

| Migration Range | Domain |
|----------------|--------|
| 001-004 | Core extensions, knowledge, brain, vector/RAG |
| 005-010 | Agent system, workers, AI providers, workflows, admin, seeds |
| 011-017 | IMT/ICPs, partner orgs, brain agents, prompt layers, KB pipeline |
| 018-021 | Learning, angles, meetings, identity sourcing |
| 022-028 | Satellites, deliverability, email providers, mastery, rollups, RAG fix |
| 029-040 | Onboarding, RLS fixes, agent templates, engine bundles, infra config |

> [!NOTE]
> 40 migrations is substantial. Schema appears mature and well-layered.

---

## Deployment Targets

| Component | Current | Target |
|-----------|---------|--------|
| Frontend (Next.js) | Vercel (free tier) | Keep on Vercel |
| Workers (BullMQ) | Railway ($) | Move to RackNerd VPS |
| Redis | Railway add-on ($) | Move to RackNerd VPS |
| Legacy Backend | Not deployed | DEAD — don't deploy |
| Supabase | Cloud | Keep on cloud |
| Domain | `marketwriter.app` (owned, not pointed) | Point to Vercel |

---

## Key Env Vars (.env.local — local dev only)

| Var | Status | Notes |
|-----|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | Cloud Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | — |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | — |
| `JWT_SECRET` | ⚠️ Placeholder | `axiom-jwt-secret-change-in-production` — MUST change |
| `VPS_HOST` | ⚠️ Wrong IP | Points to Lekhika (`103.190.93.28`), not RackNerd |
| `REFINERY_NEXUS_URL` | Not set | Bridge inactive (code handles gracefully) |
| `REFINERY_NEXUS_API_KEY` | Not set | Bridge inactive |
| `MAILWIZZ_WEBHOOK_SECRET` | Not set | Needed when MailWizz provider is configured |
| `CRON_SECRET` | Not set | For cron endpoint auth |

### NOT env vars (correctly DB-managed):
- **AI Provider Keys** (OpenAI, Anthropic, Google) → Configured in **Superadmin → AI Providers** UI, stored in DB per organization. Never hardcoded in env.
- **Redis** → Configured in Railway environment for workers. Not needed in local .env.local for frontend dev.
- **MailWizz API keys** → Configured in **Superadmin → Email Providers** UI, stored in DB per provider config.

---

## Stubs / TODOs Found

| File | Issue | Severity |
|------|-------|----------|
| `api/superadmin/vps/pm2/logs/route.ts` | Placeholder — returns empty, says "TODO: Bootstrap server needs logs endpoint" | Medium |
| `api/superadmin/vps/workers/logs/route.ts` | Placeholder — "Bootstrap doesn't have logs endpoint" | Medium |
| `api/superadmin/organizations/route.ts` | `TODO: Send welcome email with credentials` | Low |
| `api/superadmin/organizations/[id]/route.ts` | `admin_id: null // TODO: Add superadmin ID` (x2) | Medium |
| `writer/page.tsx` | `output_preview: null // TODO: Add output preview` | Low |
| `apps/workers/confidence-engine.ts` | "Placeholder deterministic proxy until reply quality model is added" | Low (acceptable) |

> [!TIP]
> Surprisingly clean. Only 6 TODOs across the entire codebase. Most are low-severity admin features.

---

## Integration Points

### 1. Refinery Nexus Bridge
- **File:** `api/webhooks/email/[provider]/route.ts`
- **How:** Fire-and-forget POST to `REFINERY_NEXUS_URL` on every webhook event
- **Status:** ⚠️ Code is solid. Env vars not set in Vercel → silently skipped (no crash)
- **To activate:** Set `REFINERY_NEXUS_URL` + `REFINERY_NEXUS_API_KEY` in Vercel env

### 2. MailWizz Integration
- **File:** `services/email/providers/MailWizzAdapter.ts`
- **How:** Full adapter implementing `EmailProviderAdapter` interface
- **Features:** List creation, subscriber management, campaign dispatch, webhook verification
- **Status:** ✅ Code complete. Provider needs to be configured in Superadmin → Email Providers

### 3. Redis / Workers
- **File:** `apps/workers/src/config/redis.ts`
- **How:** `REDIS_URL` or `REDIS_HOST`+`REDIS_PORT`+`REDIS_PASSWORD`
- **Status:** ✅ Running on Railway. Workers deployed and consuming jobs.

### 4. AI Providers
- **Supported:** OpenAI, Anthropic, Google AI
- **Configuration:** Via **Superadmin → AI Providers** UI (DB-backed per organization, NOT env vars)
- **Status:** ✅ Architecture complete. Keys configured dynamically through the UI.
