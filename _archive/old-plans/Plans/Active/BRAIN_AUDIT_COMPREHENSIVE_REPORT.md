# AXIOM BRAIN — Comprehensive Audit Report

**Date:** 18 February 2026  
**Prepared for:** Nino  
**Scope:** End-to-end investigation of the Brain system for self-healing, knowledge gap filling, non-hallucinating, semantic intelligence. Evidence-based — no assumptions.

---

Nino,

I’ve put together this audit so we’re fully aligned on where the Brain stands and what’s missing. It covers the full stack: what works, what’s disconnected, and what we need to build so we can deliver a self-healing, learning Brain that stays grounded and improves from every email sent. Use it as the single source of truth for planning and handoff.

---

## Executive Summary

**The Brain is NOT fully functional** for the vision you described. It is a chat-oriented RAG + multi-agent system that works for conversational Q&A and content generation, but it is **decoupled** from Workflows/Engines, **not wired** into email stats, and **lacks** self-healing, knowledge-gap filling, and learning-from-outcomes loops.

**Where we are vs. where we want to be:**

| Capability | Vision | Current State |
|------------|--------|---------------|
| Self-healing | Learns from every interaction, updates itself | ❌ Not implemented — "foundations" only |
| Knowledge gap filling | Detects gaps, fetches/suggests content | ❌ Not implemented |
| Non-hallucinating | Grounded in KB, citations | 🟡 Partial — RAG retrieves docs, but no strict grounding enforcement |
| Semantic intelligence | Deep understanding, intent routing | ✅ Intent classification, multi-agent routing |
| Learn from core prompts + KB | Uses hardcoded prompts + KB | ✅ RAG uses KB embeddings |
| Learn from emails sent | Updates Brain from email performance | ❌ No connection |
| Learn from email stats | BOOKED_CALL, REPLY, CLICK → update Brain | ❌ Learning Loop updates KB metadata only, not Brain |

---

## 1. What the Brain IS (Today)

### 1.1 Architecture

```
User Chat → /api/brain/chat → BrainOrchestrator
                                    ↓
                            IntentClassifier (routes to agent)
                                    ↓
                            RAGOrchestrator (retrieves from embeddings)
                                    ↓
                            Agent (Writer, Generalist, Analyst, Coach)
                                    ↓
                            LLM (via BrainConfig providers)
                                    ↓
                            Response with sources
```

**Location:** `apps/frontend/src/services/brain/`

- **BrainOrchestrator** — Main entry, intent → agent selection, RAG, prompt assembly
- **RAGOrchestrator** — Query expansion, hybrid search (pgvector), reranking, caching
- **VectorStore** — Embeddings in Supabase
- **BrainConfigService** — Org brain config, templates (Echii, Pulz, Quanta)
- **Agents** — WriterAgent, GeneralistAgent, AnalystAgent, CoachAgent, IntentClassifier

### 1.2 What Works

- ✅ Multi-agent routing (Writer, Generalist, Analyst, Coach)
- ✅ RAG with query expansion, reranking, cache
- ✅ Org-scoped brain config (`org_brain_assignments`)
- ✅ Chat API at `/api/brain/chat`
- ✅ Brain management UI (superadmin)
- ✅ Conversation + message storage
- ✅ KB sections used in RAG (embeddings from KB docs)
- ✅ Constitution/guardrails from KB (guardrails, brand compliance, voice rules)
- ✅ Citation/sources returned with responses

---

## 2. Brain vs. Workflow/Engine — Critical Disconnect

### 2.1 Two Separate Systems

| System | Purpose | Data Source | Output |
|--------|---------|-------------|--------|
| **Brain** | Chat, Q&A, content via agents | RAG (embeddings), KB config | Text response |
| **Workflow/Engine** | Execute flows (email flows, replies, pages) | KB via `kbResolutionService`, engine config | Generated content, stored in `generated_content` |

**They do NOT talk to each other.**

- Brain chat does **not** invoke engines or workflows.
- Workflow execution uses `kbResolutionService` (in workers) — not Brain.
- The doc `WORKFLOW_CAPABILITIES_AND_BRAIN_INTEGRATION.md` describes Brain → Engine routing; **this is not implemented**.

### 2.2 Impact

- User in chat cannot trigger engine execution via Brain.
- Workflow-generated emails do not flow back into Brain learning.
- Brain and Engine/KB are separate pipelines.

---

## 3. Self-Healing — Gaps

### 3.1 Intended Loop

```
KB Rules → Writer Generates → Content Deployed → Analytics Records
     ↑                                                    ↓
     └── Learning Loop Updates KB ←───────────────────────┘
```

### 3.2 What Exists

**Learning Loop Worker** (`apps/workers/src/workers/learning-loop-worker.ts`):

- Reads `analytics_events` (BOOKED_CALL, REPLY, CLICK, BOUNCE)
- Promotes/demotes variants via `knowledge_bases.metadata.promotedVariants` / `demotedVariants`
- Updates `learnedPatterns` in KB metadata from keyword success rates
- **Does NOT update Brain.** Only KB metadata.

**Dream State Worker** (`apps/workers/src/workers/dream-state-worker.ts`):

- Memory consolidation (merge duplicate embeddings)
- Embedding cleanup (orphaned conversation embeddings)
- Conversation summarization (placeholder — "Simple summary - in production, use LLM")
- Feedback analysis (placeholder)
- **Does NOT update Brain config or prompts.**

**Fine-Tuning Worker** (`apps/workers/src/workers/fine-tuning-worker.ts`):

- Collects positive feedback (rating ≥ 4) from `feedback` table
- Formats for OpenAI/Anthropic/Google
- Can submit fine-tuning jobs
- **Requires feedback table to be populated.** Chat UI may not collect ratings.
- **Fine-tuning is model-level, not Brain/KB-level.**

### 3.3 Gaps

1. **No automatic Brain prompt/config updates** from outcomes
2. **No "self-healing" of Brain** — no loop that changes Brain based on performance
3. Learning Loop updates KB metadata, but workflows may not read `promotedVariants`/`learnedPatterns` meaningfully
4. Dream State has stubs, not production logic

---

## 4. Knowledge Gap Filling — Gaps

### 4.1 Concept

Detect when the KB lacks information needed to answer or generate, then:

- Flag the gap
- Suggest or fetch content
- Optionally trigger KB update

### 4.2 Current State

- ❌ **No gap detection** in Brain or RAG
- ❌ No "low confidence" or "no relevant docs" handling that triggers gap resolution
- RAG returns empty or low-relevance docs; agents still generate (risk of hallucination)
- ❌ No automated KB update from gaps

---

## 5. Non-Hallucination / Grounding — Gaps

### 5.1 What Exists

- RAG retrieves documents; they are injected into the prompt
- `sources` / `ragDocuments` returned with response
- Constitution/guardrails from KB applied in workflow generator nodes

### 5.2 Gaps

- ❌ **No strict "answer only from context"** enforcement
- ❌ No rejection when no relevant docs found (agent can still answer)
- ❌ No hallucination detection or scoring
- ❌ No grounding verification step (e.g., check output against retrieved docs)

---

## 6. Learning from Emails and Stats — Gaps

### 6.1 Analytics Pipeline

**`analytics_events` table** (in `supabase/migrations/00000000000002_knowledge_and_content.sql`):

- event_type: OPEN, CLICK, REPLY, BOOKED_CALL, BOUNCE, UNSUBSCRIBE, COMPLAINT
- org_id, content_id, variant_id, icp_id, offer_id, etc.

**Who populates it?**

- Backend `api.ts` has an insert for `analytics_events` (run_id, variant_id, event_type, payload)
- Legacy `workflowExecutionService.legacy.ts` has an analytics insert
- **No MailWizz webhook** — IMT/MailWizz is expected to send events; we don’t yet have an endpoint that receives them. This is a key integration point for your side.

### 6.2 Learning Loop Dependency

Learning Loop reads `analytics_events`. If MailWizz/IMT never sends events, the loop has no data.

### 6.3 Brain ↔ Email Stats

- ❌ **No link** between `analytics_events` and Brain
- Brain does not see which emails performed well
- No "learn from email stats" in Brain

---

## 7. Target Architecture (Understanding)

### 7.1 Multi-Tenant Hierarchy

```
Super Admin
  └── Resellers / Mini Super Admins (future)
        └── Organizations (clients)
              └── Users (members)
                    ├── Assigned Engines (dedicated clones)
                    ├── Assigned Brain
                    └── Data (flows, brain output)
```

### 7.2 User Flow (Post-IMT Onboarding)

1. User signs up (from IMT onboarding)
2. User visits MW dashboard
3. Sees assigned **flow** (engine) and **brain**
4. Emails sent on their behalf via MailWizz (your side)
5. Data (flows, brain, stats) is pure gold

### 7.3 Current vs. Target

| Concept | Target | Current |
|---------|--------|---------|
| Engine per user | Dedicated clone, granular config | Engine per org (`engine_instances.org_id`) |
| Brain per user | Assign brain to user | Brain per org (`org_brain_assignments`) |
| User sees assigned flow + brain | Dashboard shows both | No unified "my engines + my brain" dashboard |
| Engine execution for user | User's clone runs | Org-level execution |

---

## 8. Database Schema Summary

### 8.1 Brain Tables

- `brain_templates` — Brain configs
- `org_brain_assignments` — Org → Brain (no user-level assignment)
- `brain_request_logs` — Request logging
- `brain_version_history`, `brain_ab_tests`, `brain_thinking_configs`, `brain_tool_configs`
- `feedback` — User ratings (conversation_id, rating 1–5)
- `embeddings` — Vector store for RAG
- `conversations`, `messages` — Chat history

### 8.2 Workflow/Engine Tables

- `workflow_templates` — Flow definitions
- `engine_instances` — Deployed engines (org_id, template_id, config, kb_id)
- `engine_run_logs` — Execution history
- `user_api_keys` — User ↔ Engine access (assign engine to user)

### 8.3 Analytics / Learning

- `analytics_events` — Raw events (CLICK, REPLY, BOOKED_CALL, etc.)
- `aggregated_metrics` — Pre-computed metrics
- `knowledge_bases` — KB content; `metadata` holds promotedVariants, learnedPatterns

---

## 9. Gap Summary Table

| Gap | Severity | Description |
|-----|----------|-------------|
| Brain ↔ Workflow integration | **Critical** | Brain does not invoke engines; workflows don't use Brain |
| Self-healing loop | **Critical** | No automatic Brain updates from outcomes |
| Knowledge gap detection | **High** | No detection or filling of KB gaps |
| Hallucination prevention | **High** | No strict grounding or rejection when no docs |
| Email stats → Brain learning | **High** | No pipeline from analytics_events to Brain |
| analytics_events ingestion | **High** | No MailWizz/IMT webhook to receive events |
| User-level engine assignment | **Medium** | Engines assigned to org; user-level clones not clear |
| User-level brain assignment | **Medium** | Brain assigned to org only |
| Member dashboard | **Medium** | No "my flows + my brain" view for users |
| Learning Loop → Brain | **Medium** | Loop updates KB metadata, not Brain |
| Dream State production logic | **Low** | Stubs for consolidation, summarization |
| Feedback collection | **Low** | feedback table exists; UI may not collect ratings |

---

## 10. Recommendations (Prioritized)

### Phase 1: Wire the Data (Foundation)

1. **MailWizz/IMT Analytics Webhook** — We need `POST /api/imt/analytics/events` to receive CLICK, REPLY, BOOKED_CALL, etc. from MailWizz and insert into `analytics_events`. Nino — this is the critical handoff point from your side.
2. **Verify Learning Loop** — Ensure it runs (cron or external trigger) and that promoted/demoted variants are used in workflow resolution
3. **Feedback in Chat** — Add thumbs up/down or 1–5 rating in chat UI and persist to `feedback`

### Phase 2: Brain ↔ Workflow Integration

1. **Brain Invokes Engine** — For intents like "write email" or "generate flow", Brain looks up user/org engines and triggers execution
2. **Engine Uses Brain** — Optional: Use Brain for "best time to reply" or intent analysis inside workflow nodes
3. **Unified User Dashboard** — Page showing assigned engines + brain + recent runs

### Phase 3: Self-Healing and Learning

1. **Learning Loop → Brain** — Extend loop to update Brain config (e.g., prompt snippets, preferences) from outcomes
2. **Knowledge Gap Detection** — In RAG, when relevance score is low or no docs found, return "gap" and optionally queue KB update
3. **Strict Grounding Mode** — Optional Brain mode: reject or flag when no relevant docs, or when output cannot be attributed to docs

### Phase 4: User-Level Granularity

1. **Engine clone per user** — When assigning engine to user, create a user-specific config/clone
2. **Brain per user** — Optional overrides or dedicated brain per power user
3. **Reseller / Mini Super Admin** — Hierarchical admin model as planned

---

## 11. MW Dashboard & Member Portal — Current vs. Target

### 11.1 Current Main Dashboard

**Path:** `apps/frontend/src/app/(main)/dashboard/page.tsx`

- Shows: `runs` (triggered by user), KB count, org name/plan, recent runs
- Uses `runs` table (legacy), not `engine_run_logs`
- **Does NOT show:** Assigned engines, assigned brain, email flows, email stats

### 11.2 Engine Assignment (Schema)

- `engine_instances.org_id` — Engine deployed per org
- `user_api_keys` — Links `user_id` to `engine_id`; supports "assign engine to user"
- `apiKeyService.assignEngineToUser()` — Exists in backend
- **No user-level engine clone** — User gets access to org's engine, not a dedicated clone

### 11.3 Brain Assignment

- `org_brain_assignments` — Brain per org only
- No `user_brain_assignments` table

### 11.4 MW Dashboard (Post-IMT) — What You Want

| Feature | Status |
|---------|--------|
| User sees assigned flow (engine) | ❌ Not in dashboard |
| User sees assigned brain | ❌ Not in dashboard |
| User sees data (gold) | ❌ Partial — runs/KB only, no email flows/stats |
| Emails sent via MailWizz (Nino) | ⚠️ IMT → MW handoff; no Axiom ingestion of results |

### 11.5 "MW Dashboard" Clarification

- If "MW dashboard" = **MailWizz UI** (your side): Users see campaigns, sends, stats there. Axiom doesn’t own that.
- If "MW dashboard" = **Axiom member portal** (post-login): It should show assigned flows + brain + data. That view is **not built yet**.

---

## 12. Files Reference

| Purpose | Path |
|---------|------|
| Brain Orchestrator | `apps/frontend/src/services/brain/BrainOrchestrator.ts` |
| RAG Orchestrator | `apps/frontend/src/services/brain/RAGOrchestrator.ts` |
| Brain Chat API | `apps/frontend/src/app/api/brain/chat/route.ts` |
| Workflow Execution (KB) | `apps/workers/src/processors/workflow-execution-processor.ts` |
| KB Resolution | `apps/workers/src/utils/kb-resolution-service.ts` |
| Learning Loop | `apps/workers/src/workers/learning-loop-worker.ts` |
| Dream State | `apps/workers/src/workers/dream-state-worker.ts` |
| Fine-Tuning | `apps/workers/src/workers/fine-tuning-worker.ts` |
| Analytics Aggregator | `apps/workers/src/processors/analytics/aggregator.ts` |

---

## Appendix: Target Architecture (for reference)

1. **Multi-tenant:** Super Admin → Resellers / Mini Super Admins → Orgs → Members (users)
2. **Workflow Builder:** Create flows → deploy as engine → assign engine to user (dedicated clone for granular config, AI keys, etc.)
3. **Brain:** Deploy brain, assign to user
4. **Post-IMT onboarding:** User visits MW dashboard → sees assigned flow + brain → sees data
5. **Emails:** Sent on behalf of users to their offer via self-hosted MailWizz
6. **Data:** Flows, brain output, email stats — the valuable layer we’re building toward

**Current state:** The structure exists in the schema (engines, brains, orgs, users), but the member dashboard, Brain↔Engine wiring, and learning-from-outcomes loops are incomplete.

---

Thanks — happy to walk through any section in more detail whenever works for you.

*Audit based on codebase inspection. No assumptions.*
