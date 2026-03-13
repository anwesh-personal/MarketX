# Axiom Architecture, Mail Writer & MTA Feedback Loop — Master Plan

**Version:** 2.0  
**Date:** March 13, 2026  
**Purpose:** Handover document for any new agent. Read this to understand current architecture, what is working, what is broken, and what we are building next.  
**Boss:** Anwesh Rath (male). Agent is female, respectful, uses "aap" in Hinglish.

---

## ✅ IMPLEMENTATION STATUS (March 13, 2026)

### Phase 1: Mail Writer - COMPLETED ✅

| Task | Status | Implementation |
|------|--------|----------------|
| Fix MarketXToolExecutor | ✅ Done | Uses `belief`, `brief`, `partner_id` correctly |
| Wire Writer to Brain KB | ✅ Done | `BrainKBService` created, Writer uses `kb_sections`/`kb_documents` |
| Writer uses ICP + Belief | ✅ Done | `buildWriterContext()` loads ICP, Belief, Offer from RS:OS |
| Engine execution worker | ✅ Done | Worker properly registered and processes jobs |

### Phase 2: MTA Feedback Loop - COMPLETED ✅

| Task | Status | Implementation |
|------|--------|----------------|
| Campaign metrics aggregation | ✅ Done | `CampaignMetricsService` reads from `signal_event` (provider-agnostic) |
| Coach Agent trigger | ✅ Done | `MarketingCoachService` + `/api/brain/training/coach-analysis` endpoint |
| Coach analysis & learnings | ✅ Done | Extracts patterns, identifies top/underperformers |
| Brain update flow | ✅ Done | Updates `belief.confidence_score`, saves to `brain_memories`/`brain_reflections` |
| Learning Loop Worker | ✅ Done | Uses `MarketingCoachProcessor`, supports `coach_analysis` job type |

### New Services Created:

| Service | Location | Purpose |
|---------|----------|---------|
| `BrainKBService` | `services/brain/BrainKBService.ts` | Unified Brain KB access |
| `CampaignMetricsService` | `services/brain/CampaignMetricsService.ts` | Provider-agnostic metrics from `signal_event` |
| `MarketingCoachService` | `services/brain/MarketingCoachService.ts` | Coach analysis and Brain updates |
| `MarketingCoachProcessor` | `workers/processors/brain/marketing-coach-processor.ts` | Worker-side coach implementation |

---

## 1. Document Purpose

When a new agent takes over or gets stuck:

1. **Read this plan first** — it contains the end-to-end architecture audit, Mail Writer fix list, and MTA feedback-loop design.
2. **Phase 1** = Get Mail Writer working (ICP, KB, Belief, worker).
3. **Phase 2** = MTA/Autoresponder integration + Coach Agent feedback loop so Brain keeps improving from campaign metrics.

All client-specific data (ICP, KB, Belief, Memory) must be org-scoped. This plan states what is correctly tied and what is not.

---

## 1.1 Email Provider System (MTA-Agnostic)

**IMPORTANT:** The system is designed to be **MTA-agnostic**. Boss may change/shuffle MTAs at any time.

### Existing Multi-Provider Infrastructure:

| Component | Location | Details |
|-----------|----------|---------|
| **Email Providers UI** | `/superadmin/email-providers` | CRUD for any provider |
| **Provider Config Table** | `email_provider_configs` | Per-org or global configs |
| **Supported Providers** | 8 types | Mailwizz, Mailgun, SES, SendGrid, Postmark, SparkPost, SMTP, Custom |
| **Webhooks** | `/api/webhooks/email/{provider}/` | Mailwizz, Mailgun, SES routes exist |
| **Signal Events** | `signal_event` table | Canonical storage for delivery/open/click/bounce from ANY provider |

### Provider Config Features:
- `partner_id` (org-scoped) or `NULL` (global)
- `priority` for fallback ordering
- `is_default` flag
- Rate limits (`max_sends_per_day`, `max_sends_per_hour`, `rate_limit_per_second`)
- Warmup settings (`warmup_enabled`, `warmup_start_volume`, `warmup_increment_pct`, `warmup_target_days`)
- Health tracking (`health_status`, `consecutive_failures`, `last_health_check`)

**All feedback-loop logic must read from `signal_event` (provider-agnostic) — NOT hardcoded to any specific MTA.**

---

## 2. High-Level Architecture (How It All Fits)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SUPERADMIN LEVEL                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   BRAIN TEMPLATES          AGENT TEMPLATES              WORKFLOWS                │
│   (Customer KB, ICP,       (Email Writer, Coach,        (Node-based              │
│    Belief, Memory)         Scraper, Landing Page)       automation flows)        │
│         │                          │                            │               │
│         └── brain_agent_assignments ┘                            │               │
│                        │                                         │               │
│                        ▼                                         ▼               │
│            ┌─────────────────────────────────────────────────────────┐          │
│            │              ENGINE INSTANCES (per org)                   │          │
│            │  Deployed with template + config                         │          │
│            └─────────────────────────────────────────────────────────┘          │
│                                    │                                             │
└────────────────────────────────────┼─────────────────────────────────────────────┘
                                     │ DEPLOY
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           USER / MEMBER LEVEL                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   BRAIN CONTROL           AGENTS                  WRITER STUDIO                  │
│   (View KB, IPC,          (Use agents to           (Uses Workflow                 │
│    Belief, Memory)        write, research)         Engine)                       │
│                                │                          │                      │
│                                ▼                          ▼                      │
│                    ┌───────────────────────────────────────────┐                 │
│                    │         ENGINE EXECUTION (BullMQ)          │                 │
│                    │  Queue → Worker → Output                   │                 │
│                    └───────────────────────────────────────────┘                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Brain** = Customer’s “mind” (ICP, Belief, KB, Memory).  
- **Agents** = Specialized workers (Email Writer, Coach, etc.).  
- **Workflow** = Node-based automation (e.g. email sequences).  
- **Engine** = What actually runs a workflow (one per org when deployed).

---

## 3. What Is Tied Up Correctly

| Area | Status | Details |
|------|--------|---------|
| **Org → Brain Deploy** | ✅ | `brain_agents` table; `POST /api/superadmin/agents/deploy` creates org-level brain and default `kb_sections`. |
| **KB Isolation (Brain)** | ✅ | `kb_sections`, `kb_documents` have `org_id` and link to `brain_agents`. |
| **Memory Isolation** | ✅ | `brain_memories` has `org_id`. |
| **ICP (Axiom)** | ✅ | `imt_icps` has `org_id`. |
| **Agent Templates → Brain** | ✅ | `brain_agent_assignments` links `brain_templates` to `agent_templates`. |
| **Engine Execution** | ✅ | `engine_instances`, `engine_run_logs` have `org_id`. |
| **Deploy mechanism** | ✅ | `BrainRuntimeResolver` loads active `brain_agents` for org; used by chat, Writer, workflow. |

---

## 4. What Is Broken or Missing

### 4.1 RS:OS Table / Column Mismatch (Critical)

Code expects one naming, database has another. **All references must use the actual RS:OS schema.**

| Code Expectation | Actual DB (RS:OS) | Fix |
|------------------|-------------------|-----|
| Table `beliefs` | Table `belief` | Use `belief` everywhere (e.g. `MarketXToolExecutor`). |
| Column `org_id` on belief | Column `partner_id` | Query by `partner_id` where `partner.id = organizations.id`. |
| Table `briefs` | Table `brief` | Use `brief` everywhere. |
| Column `org_id` on brief | Column `partner_id` | Same: use `partner_id` with org mapping. |
| `signal_event.org_id` | `signal_event.partner_id` | Use `partner_id` in `executeAnalyzeSignals`, `executeSuggestAngle`, etc. |

**Action:** In `MarketXToolExecutor` (and any RS:OS callers), use table names `belief`, `brief` and column `partner_id`. Map `org_id` → `partner_id` via `organizations.id = partner.id`.

### 4.2 Two KB Systems (Not Unified)

| System | Tables | Used By |
|--------|--------|--------|
| Legacy | `knowledge_bases` | Writer, `engine_instances`, KB Manager UI |
| Brain pipeline | `kb_sections`, `kb_documents` | Deploy, RAG, Brain Chat |

- Writer currently uses **`knowledge_bases`** (legacy).  
- Brain uses **`kb_sections`** / **`kb_documents`**.  
- `engine_instances.kb_id` points to `knowledge_bases`, not Brain KB.

**Action:** Either (a) make Writer use Brain KB (`kb_sections`/`kb_documents` for the org’s `brain_agents.id`), or (b) define a clear bridge (e.g. sync or single source of truth) and document it here.

### 4.3 Writer Worker Not Processing

- Writer queues jobs to **engine-execution** (BullMQ).  
- Jobs are created but **not processed** (worker not wired or not running).  
- Ref: `.agent/HONEST_STATUS_AND_BUILD_PLAN.md` — “Writer: Runs created but never processed”.

**Action:** Ensure `engine-execution` worker runs and actually processes Writer jobs (same flow as workflow execution).

### 4.4 Writer Not Using ICP / Belief

- Agent tools exist (`belief_lookup`, `icp_lookup`) but the **Writer path does not call them**.  
- So generated mail does not consistently use client-specific ICP and Belief.

**Action:** In the Writer flow, resolve Brain runtime and call the same tools (or equivalent logic) so generation uses ICP + Belief + Brain KB.

---

## 5. Mail Writer — Current vs Desired Flow

### Current (Broken)

```
User → Writer Studio → engine_instances (legacy KB) → Queue → ❌ Worker not processing
       No ICP/Belief in path; uses knowledge_bases, not Brain KB.
```

### Desired

```
User → Writer Studio → requireActiveBrainRuntime(org_id)
       → Resolve Brain KB (kb_sections / kb_documents for that org)
       → Resolve ICP (imt_icps or RS:OS icp via partner_id)
       → Resolve Belief (belief via partner_id)
       → Build writer input with context
       → Queue job to engine-execution
       → Worker runs workflow and produces output
```

---

## 6. MTA Feedback Loop (Provider-Agnostic)

Goal: **Retrieve campaign metrics from ANY configured MTA → Coach Agent studies it → Feeds learnings back into Brain → Next emails improve.**

**IMPORTANT:** This is NOT hardcoded to any specific MTA. The system supports multiple providers (Mailwizz, Mailgun, SES, SendGrid, etc.) and Boss may switch/shuffle at any time.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MTA FEEDBACK LOOP (Provider-Agnostic)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │  MAIL WRITER │ ──────► │  ANY MTA     │ ──────► │   WEBHOOK    │       │
│   │  (Generate)  │  Send   │  (Mailwizz,  │  Stats  │  (Per-provider│       │
│   │              │   via   │   Mailgun,   │         │   routes)    │       │
│   │              │ provider│   SES, etc.) │         │              │       │
│   └──────────────┘  config └──────────────┘         └──────┬───────┘       │
│                                                            │                │
│                                                            ▼                │
│                                                   ┌──────────────┐          │
│                                                   │ signal_event │          │
│                                                   │ (canonical)  │          │
│                                                   └──────┬───────┘          │
│                                                          │                  │
│                                                          ▼                  │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │    BRAIN     │ ◄────── │    COACH     │ ◄────── │   CAMPAIGN   │       │
│   │  (Updated)   │  Feed   │   AGENT      │  Study  │   METRICS    │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
│                                                                             │
│   Metrics: Open Rate, CTR, Reply Rate, Unsubscribe, Conversions              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Existing Infrastructure (Already Built):

| Component | Status | Location |
|-----------|--------|----------|
| Email Provider Config UI | ✅ Exists | `/superadmin/email-providers` |
| Provider Config Table | ✅ Exists | `email_provider_configs` |
| Mailwizz Webhook | ✅ Exists | `/api/webhooks/email/mailwizz/route.ts` |
| Mailgun Webhook | ✅ Exists | `/api/webhooks/email/mailgun/route.ts` |
| SES Webhook | ✅ Exists | `/api/webhooks/email/ses/route.ts` |
| Signal Event Storage | ✅ Exists | `signal_event` table (canonical) |

### Phase 2 Implementation - ✅ COMPLETED:

1. **Campaign metrics aggregation** ✅  
   - `CampaignMetricsService` queries `signal_event` grouped by belief/brief/icp.
   - Computes open rate, CTR, reply rate, booking rate, bounce rate.
   - File: `services/brain/CampaignMetricsService.ts`

2. **Coach Agent trigger** ✅  
   - API endpoint: `POST /api/brain/training/coach-analysis`
   - Worker job type: `coach_analysis` in Learning Loop Worker.
   - Can be triggered manually, via cron, or via webhook.

3. **Coach Agent analysis** ✅  
   - `MarketingCoachService` identifies top/underperformers.
   - Extracts patterns (dominant angles, subject line impact).
   - Produces structured learnings with confidence scores.
   - File: `services/brain/MarketingCoachService.ts`

4. **Brain update flow** ✅  
   - Updates `belief.confidence_score` based on performance.
   - Creates `belief_promotion_log` entries for audit.
   - Saves learnings to `brain_memories` and `brain_reflections`.
   - Worker processor: `workers/processors/brain/marketing-coach-processor.ts`

### Adding New MTA Provider:

To add a new MTA (e.g. Postmark, SparkPost):
1. Add webhook route: `/api/webhooks/email/{provider}/route.ts`
2. Map provider events to canonical `signal_event` types
3. Insert into `signal_event` with `partner_id`, `offer_id`, `brief_id`, `belief_id`
4. Coach Agent automatically picks up data (reads from `signal_event`, not provider-specific)

---

## 7. Priority Fix List (Execution Order)

### Phase 1: Get Mail Writer Working (Urgent)

1. **Fix MarketXToolExecutor**  
   - Use table `belief` (not `beliefs`), `brief` (not `briefs`).  
   - Use `partner_id` for RS:OS tables; map `org_id` → `partner_id` where `partner.id = organizations.id`.

2. **Fix all RS:OS callers**  
   - Any code that uses `beliefs`, `briefs`, or `org_id` on RS:OS tables must switch to `belief`, `brief`, `partner_id`.

3. **Wire Writer to Brain KB**  
   - Writer should use `kb_sections` / `kb_documents` for the org’s active `brain_agents` (or a documented bridge from `knowledge_bases` to Brain KB).

4. **Ensure engine-execution worker runs**  
   - Confirm worker process runs and processes jobs from the queue used by Writer (same as workflow execution).

5. **Writer flow to use ICP + Belief**  
   - In Writer path, after resolving Brain runtime, call or reuse logic for ICP and Belief so generation is client-specific.

### Phase 2: MTA Feedback Loop & Coach Agent (Provider-Agnostic)

1. **Campaign metrics aggregation**  
   - Query `signal_event` (already populated by existing webhooks) grouped by campaign/brief/belief.  
   - Compute open rate, CTR, reply rate, bounce rate.

2. **Coach Agent trigger**  
   - Daily or threshold-based trigger to invoke Coach Agent.  
   - Coach reads from `signal_event` table (canonical, provider-agnostic).

3. **Coach Agent analysis & learning extraction**  
   - Identify winning/losing angles, subject lines, beliefs.  
   - Produce structured learnings.

4. **Brain update flow**  
   - Write learnings to `brain_memories` / `brain_reflections` / Brain KB.  
   - Update belief weights in RS:OS `belief` table.  
   - Ensure proper `org_id` / `partner_id` scoping.

---

## 8. Schema Relationship Map (Quick Reference)

```
organizations
├── brain_agents (org_id) → brain_templates
│   ├── kb_sections (agent_id, org_id)
│   │   └── kb_documents (section_id, agent_id, org_id)
│   ├── brain_memories (org_id, agent_id)
│   ├── brain_reflections (org_id, agent_id)
│   └── ...
├── engine_instances (org_id)
├── knowledge_bases (org_id)   [legacy; Writer currently uses this]
├── imt_icps (org_id)
└── partner (id = organizations.id)  [RS:OS 1:1]
    ├── belief (partner_id)
    ├── brief (partner_id)
    ├── icp (partner_id)
    ├── signal_event (partner_id)
    └── ...

brain_templates (platform)
└── brain_agent_assignments → agent_templates (platform)
```

---

## 9. Key Files for Implementation

| Concern | Location |
|--------|----------|
| RS:OS / Belief / Brief usage | `services/brain/tools/MarketXToolExecutor.ts` |
| Writer API | `app/api/writer/execute/route.ts` |
| Engine execution worker | `apps/workers/src/workers/engine-execution-worker.ts` |
| Brain runtime resolution | `services/brain/BrainRuntimeResolver.ts` |
| Brain KB Service | `services/brain/BrainKBService.ts` |
| Campaign Metrics | `services/brain/CampaignMetricsService.ts` |
| Marketing Coach | `services/brain/MarketingCoachService.ts` |
| Coach Analysis API | `app/api/brain/training/coach-analysis/route.ts` |
| Learning Loop Worker | `apps/workers/src/workers/learning-loop-worker.ts` |
| Marketing Coach Processor | `apps/workers/src/processors/brain/marketing-coach-processor.ts` |
| Deploy brain to org | `POST /api/superadmin/agents/deploy` |
| Agent templates | `database/migrations/031_agent_templates.sql`, `/api/superadmin/agent-templates` |

---

## 10. Handover Notes for New Agent

- **Boss:** Anwesh Rath. Refer to him with respect; use **“aap”** in Hinglish (not “tu”).  
- **Phase 1 & 2 COMPLETED:** Mail Writer and MTA feedback loop are now working.
- **MTA is NOT hardcoded:** System supports multiple providers (Mailwizz, Mailgun, SES, SendGrid, etc.). Boss may switch/shuffle at any time. All feedback logic reads from `signal_event` (canonical), not from any specific provider.  
- **Always:** Client data (ICP, KB, Belief, Memory) is org-scoped; use `org_id` (or `partner_id` with org mapping for RS:OS).  
- **When stuck:** Re-read the Implementation Status at top, then Sections 4 (broken/missing), 5 (Mail Writer flow), 7 (priority list), and 8 (schema). Then check the key files in Section 9.

### How to Trigger Coach Analysis:

1. **Via API (Manual/Cron):**
   ```bash
   POST /api/brain/training/coach-analysis
   Body: { "days": 30, "update_beliefs": true, "save_learnings": true }
   ```

2. **Via Worker (Queue Job):**
   ```typescript
   await queues.learningLoop.add('learning-loop', {
     type: 'coach_analysis',
     orgId: 'org-uuid',
     config: { days: 30 }
   })
   ```

3. **Full Learning Loop:**
   ```typescript
   await queues.learningLoop.add('learning-loop', {
     type: 'full_loop',
     orgId: 'org-uuid'
   })
   ```

---

*End of plan. Phase 1 and Phase 2 completed on March 13, 2026.*
