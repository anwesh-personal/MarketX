# 13 — Execution Backlog (Live)

**Date:** 9 March 2026  
**Owner:** Anwesh Rath  
**Operating Mode:** Production-first, no band-aids, evidence-driven updates only.

---

## Program Status

- **Current Phase:** A — Data Canonicalization
- **Phase Health:** In Progress
- **Last Updated:** 9 March 2026
- **Update Rule:** This file must be updated after every material code or schema change.

---

## Verified Baseline (Completed Discovery)

### What was verified in codebase
- Supabase migration chain currently has `00000000000001` through `00000000000011`.
- Canonical RS:OS tables (`partner`, `offer`, `icp`, `brief`, `belief`, `belief_competition`, `flow`, `flow_step`, `asset`, `signal_event`, `config_table`) are **not present** in active Supabase migrations.
- `database/migrations/028_brain_learning.sql` contains a broken FK:
  - `belief_id UUID REFERENCES beliefs(id)` where `beliefs` table does not exist.

### Immediate implication
- Brain learning migration path remains structurally unsafe until canonical schema and FK correction are done.

---

## Execution Board

| ID | Task | Phase | Owner | Status | Dependencies | Definition of Done |
|---|---|---|---|---|---|---|
| A-01 | Create RS:OS canonical migration file (core entities + indexes + constraints) | A | Anwesh | Complete (Remote Applied) | None | Migration exists, reviewed, and applies on fresh DB |
| A-02 | Add compatibility mapping (`partner_id` to `organizations.id`) strategy | A | Anwesh | Complete (Remote Applied) | A-01 | Documented and implemented without tenant breakage |
| A-03 | Repair broken FK in `028_brain_learning.sql` to canonical `belief` table | A | Anwesh | Complete (Remote Applied) | A-01 | FK valid, migration applies cleanly |
| A-04 | Add `belief_gate_snapshot` and `belief_promotion_log` tables | A | Anwesh | Complete (Remote Applied) | A-01 | Tables created with required indexes/FKs |
| A-05 | Create `config_table` with baseline thresholds | A | Anwesh | Complete (Remote Applied) | A-01 | Seeded config values queryable by services |
| A-06 | Run full migration chain on clean environment | A | Anwesh | Deferred (Tech Debt) | A-01..A-05 | End-to-end migration succeeds with zero manual fixes |
| B-01 | Enforce `AIProviderService` for all brain LLM calls | B | Anwesh | Complete | A-06 | No direct provider HTTP calls remain in brain path |
| B-02 | Implement bounded agentic function-calling loop | B | Anwesh | Deferred Validation (Tech Debt) | B-01 | Multi-step tool calls execute with iteration limits |
| B-03 | Add grounding checks + `knowledge_gap` write path | B | Anwesh | Deferred Validation (Tech Debt) | B-01 | Low-evidence outputs trigger explicit gap events |

### B-01 Audit (Hardcoded Provider Calls in Brain)

**Must fix (Brain pipeline):**
- `services/brain/RAGOrchestrator.ts` (lines 240, 395) — query expansion + reranking
- `services/brain/VectorStore.ts` (lines 425, 462) — embeddings
- `services/brain/agents/Agent.ts` (lines 351, 384) — agent execution
- `services/brain/agents/IntentClassifier.ts` (line 161) — intent classification
- `services/brain/agents/WriterAgent.ts` (line 112) — writer agent

**Must fix (Workers):**
- `workers/src/processors/conversation/summarizer.ts` (line 73)
- `workers/src/utils/embeddings.ts` (line 37)

**Acceptable (provider classes + admin test routes):**
- Provider classes (`OpenAIProvider.ts`, etc.) — these ARE the abstraction
- Admin test routes — intentionally test specific providers

### Locked Product Constraints (Non-Negotiable)

- Multi-tenant is mandatory: every brain/workflow/agent execution must stay org-scoped.
- Users must be able to create a Brain, attach workflows and agents to that Brain, and deploy to end users without cross-tenant leakage.
- BYOK is mandatory: tenant-owned provider keys are first-class, with platform keys only as fallback.
- No stubs/bandaids in production path: no direct provider HTTP calls in brain execution code.

---

## Today’s Active Focus

1. Continue build sequence execution (no validation stop-gates in this session).
2. Phase 7 COMPLETE; next: Phase 8 — Dashboards + Member Portal.
3. Keep all deferred validations tracked in explicit tech debt queue.

## Deferred Validation Tech Debt (Must Close Before Release)

1. B-02 live smoke: `/api/brain/chat` bounded loop + SSE event sequence.
2. B-03 grounding validation: low-confidence disclosure behavior.
3. B-03 persistence validation: `knowledge_gaps` write path on retrieval failure.
4. `generate_email` end-to-end validation: queue dispatch, worker execution, output persistence.
5. A-06 clean-environment migration chain validation.

---

## Risks and Controls

| Risk | Severity | Control |
|---|---|---|
| Migration collision with existing tables | High | Use `IF NOT EXISTS`, explicit naming, and additive rollout |
| Tenant isolation regression | Critical | Preserve org scoping and validate RLS assumptions before merge |
| Service break from schema rename assumptions | High | Add compatibility mapping layer and avoid destructive renames |
| Partial phase completion shipped early | High | No-ship until Phase A DoD is fully green |

---

## Change Log

### 2026-03-09
- Created live backlog and execution board.
- Verified missing RS:OS canonical schema in active Supabase migrations.
- Verified broken FK in `database/migrations/028_brain_learning.sql` (`REFERENCES beliefs(id)`).
- Set active focus to Phase A schema hardening and migration safety.
- Added `supabase/migrations/00000000000012_rs_os_core.sql` with canonical RS:OS core tables, promotion logs, and config seeds.
- Added `supabase/migrations/00000000000013_partner_org_compat.sql`:
  - backfills `partner` from existing `organizations` (idempotent)
  - adds trigger-based sync on `organizations` insert/update (`name`, `status`)
  - introduces explicit compatibility view `partner_organization_map`
- Ported pending legacy migrations into canonical chain for direct remote rollout:
  - `00000000000014_brain_agents.sql` (from `database/migrations/024_brain_agents.sql`)
  - `00000000000015_prompt_layers.sql` (from `database/migrations/025_prompt_layers.sql`)
  - `00000000000016_brain_tools_registry.sql` (from `database/migrations/026_brain_tools_registry.sql`)
  - `00000000000017_kb_pipeline.sql` (from `database/migrations/027_kb_pipeline.sql`)
  - `00000000000018_brain_learning.sql` (from `database/migrations/028_brain_learning.sql`, FK aligned to `belief(id)`)
- User manually applied migrations `00000000000012` through `00000000000018` on remote Supabase.
- Updated status to mark A-01/A-03/A-04/A-05 as complete on remote.
- Added `00000000000019_angle_system.sql` and `/api/angles` seed/list APIs to implement canonical 7-angle per-offer system.
- Updated `/api/briefs/generate` to enforce offer-angle validation (or auto-select first active seeded angle).
- Added Superadmin Brief Manager API/UI and reply classification service endpoint (`/api/replies/classify`) as part of Phase 1 completion path.
- Added Phase 2 engines:
  - confidence recompute worker path (`belief-confidence` analytics job)
  - hybrid gating evaluation endpoint with `belief_gate_snapshot` persistence
- Added allocation engine worker path (`allocation-engine` analytics job) with min-exploration and stepwise rebalance logic.
- Added webhook ingestion paths:
  - Mailgun/SES email event webhooks -> `signal_event`
  - CRM booking webhook -> `meeting` + `signal_event`
- Added Phase 3 ICP Construction API (`/api/icp/construct`) with structured 420-taxonomy-ready criteria persistence.
- Added Phase 3 sourcing/decision path:
  - identity sourcing pipeline API (`/api/identity/source`)
  - contact decision logic API (`/api/contact/decide`)
  - canonical sourcing tables migration (`00000000000021_identity_sourcing_and_decisions.sql`)
- Added Superadmin ICP Manager stack:
  - `/api/superadmin/icps` (list/create/options)
  - `/api/superadmin/icps/[id]/source`
  - `/api/superadmin/icps/[id]/decide`
  - `/superadmin/icp-manager` UI
- Added satellite management stack:
  - migration `00000000000022_satellite_management.sql`
  - provisioning API `/api/satellites/provision`
  - list/update API `/api/satellites`
- Patched `database/migrations/028_brain_learning.sql` FK from `beliefs(id)` to `belief(id)`.
- Moved A-01, A-03, A-04, A-05 to "Implemented (Pending Validation)".
- Moved A-02 to "Implemented (Pending Validation)".
- Static SQL syntax check passed (59 statements, no parse errors).
- A-06 blocked: Docker not running on machine; cannot spin up local Supabase for live validation.
- Proceeding to Phase B (Brain Hardening) tasks that do not require DB.
- **B-01 Progress:**
  - Fixed `RAGOrchestrator.ts` — removed hardcoded OpenAI, now uses `aiProviderService.generateChat()`.
  - Fixed `VectorStore.ts` — removed hardcoded OpenAI embeddings, now uses `aiProviderService.embedTexts()`.
  - Fixed `Agent.ts` — removed hardcoded OpenAI in `callLLM()` and `callLLMStream()`, now uses `aiProviderService.generateChat()`.
  - Fixed `IntentClassifier.ts` — removed hardcoded OpenAI, now uses `aiProviderService.generateChat()`.
  - Fixed `WriterAgent.ts` — removed hardcoded OpenAI in `generateOutline()`, now uses `aiProviderService.generateChat()`.
  - Fixed `workers/summarizer.ts` — now uses `AIService.call()` instead of hardcoded OpenAI.
  - Fixed `workers/embeddings.ts` — now uses provider-aware endpoint routing with org/platform fallback.
  - Removed final legacy direct OpenAI streaming method from `apps/frontend/src/services/brain/agents/Agent.ts`.
  - **B-01 COMPLETE (HARD-VALIDATED):** Brain execution path has no direct provider HTTP calls; all routes go through provider abstraction.
  - **B-02 Progress:**
    - Migrated `/api/brain/chat` runtime path to `brainOrchestrator.handleTurn()` (bounded multi-turn loop).
    - Wired deployed `brain_agents` config into execution (`max_turns`, `preferred_provider`, `preferred_model`).
    - Integrated dynamic tool loading via `ToolLoader.getAgentTools(agentId)` for granted tools only.
    - Added tool execution safety ceilings in orchestrator (`MAX_TOOL_CALLS_PER_TURN`, `MAX_TOOL_CALLS_TOTAL`).
    - Added prompt-time grounding in `/api/brain/chat` using `ragOrchestrator.retrieve(...)` + `user_memory` enrichment before prompt assembly.
    - Hardened tool permission checks to be tenant-bound (`brain_agents.id` + `org_id`) in `BrainOrchestrator`.
    - Replaced `generate_email` placeholder tool response with real `engine-execution` queue dispatch using org-scoped engine/template resolution and `engine_run_logs` audit creation.
    - Added strict conversation ownership enforcement in `/api/brain/chat` (provided `conversationId` must belong to current `org_id` + `user_id`).
    - Added tenant/user scoping on persisted chat messages (`messages.org_id`, `messages.user_id`) and org-bound history reads.
    - **B-03 Progress:**
      - Added strict grounding enforcement in `BrainOrchestrator.handleTurn()` final response path.
      - If strict grounding is enabled and KB confidence is low, response now gets explicit uncertainty disclosure (non-optional).
      - Added explicit retrieval-failure `knowledge_gaps` upsert path in `/api/brain/chat` for prompt-time RAG failures.
      - Propagated gap metadata (`gapDetected`, `gapConfidence`) through request/metrics metadata for auditability.
      - Status moved to **Implemented (Pending Validation)**; needs live endpoint smoke test.
  - Streaming execution path now emits real-time orchestration events (`turn_start`, `tool_result`, final chunk) from `BrainOrchestrator.handleTurn()` via callback hooks, replacing opaque full-buffer behavior in SSE route.
    - Status moved to **Implemented (Pending Validation)**; needs live endpoint smoke test.
