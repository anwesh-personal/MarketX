# 12 — Production Blowout Plan

**Date:** 9 March 2026  
**Owner:** Anwesh Rath  
**Status:** Execution Blueprint (No Band-Aids)  
**Directive:** Build a production-grade, multi-tenant acquisition intelligence platform where Brain + Engines + Workflow + Signals compound safely and measurably.

---

## Execution Status

- **Current Phase:** A — Data Canonicalization
- **Execution Tracker:** `13_EXECUTION_BACKLOG.md`
- **Operating Rule:** No phase advancement without release-gate evidence.

---

## 1) Scope Lock (What We Are Building)

This platform has one job: produce durable revenue outcomes through governed outbound intelligence.

Core system boundaries:
- **Workflow Builder** defines process logic and operational lanes.
- **Engine Deployment** turns workflow definitions into runtime engines.
- **Per-User Engine Assignment** provides isolated execution per tenant/user context.
- **Per-User Brain Deployment** provides isolated intelligence and learning surfaces.
- **Market Writer** generates belief-bound content.
- **Market Surface** delivers safely and captures delivery truth.
- **Signal Engine** records outcomes with strict attribution.
- **Promotion + Knowledge Governance** controls what can learn, what can change, and when.

Non-goals:
- No unbounded auto-modification.
- No “generic chatbot” behavior.
- No hidden hardcoded provider paths.
- No cross-tenant leakage under any circumstance.

---

## 2) Production Definition (What “Ready” Means)

The system is production-ready only when all are true:
- **Deterministic Execution:** Every run produces complete, auditable traces.
- **Tenant Isolation:** RLS and app-level checks prevent all cross-tenant reads/writes.
- **Grounded AI:** Brain outputs have evidence provenance or explicit uncertainty.
- **Operational SLOs:** Latency, failure, queue health, and data freshness are monitored.
- **Governed Learning:** Learning cannot override locked constraints or safety policies.
- **Rollbackability:** Every critical release can be reverted without data corruption.

---

## 3) Architecture Contract (Must Not Drift)

### A. Runtime Topology
- Frontend/API: Next.js routes (control plane + integration plane).
- Workers: BullMQ (execution plane + learning plane).
- Data: Supabase Postgres + RLS (source of truth).
- AI: Provider abstraction via `AIProviderService` only.

### B. Plane Separation
- **Control Plane:** templates, assignments, governance, configuration.
- **Execution Plane:** engine runs, tool calls, content generation, send decisions.
- **Learning Plane:** signal ingestion, confidence recompute, knowledge updates.

### C. Isolation Rules
- Tenant key = `organization_id` / `partner_id` mapped consistently.
- Every read/write must include tenant scope.
- Global knowledge is read-only to tenants and write-only via governance path.

---

## 4) Hard Gaps to Close (No Exceptions)

| Gap | Current Risk | Hard Fix |
|---|---|---|
| Missing RS:OS core entities (`belief`, `brief`, `flow`, `signal_event`, etc.) | No canonical learning substrate | Implement canonical schema in Phase A |
| `028_brain_learning.sql` references missing `beliefs(id)` | migration/runtime breakage | Repoint FK to canonical `belief` table after schema creation |
| RAG hardcoded to OpenAI in places | provider mismatch and silent failures | force all AI calls through `AIProviderService` |
| One-shot brain chat (no agentic loop) | no iterative tool reasoning | implement bounded function-calling loop |
| Learning loop only updates metadata | no real self-healing | wire to confidence, belief state, and local KB weights |
| Dream state worker returns placeholders | fake learning narrative | implement real summarization/reflection jobs |
| Agent stack partially disabled/commented | capability gaps | wire first 5 mastery agents end-to-end |

---

## 5) Brain Contract (Awesome, but Safe)

### A. Non-Hallucination Protocol
- Retrieval-first generation for factual claims.
- Evidence scoring per retrieved chunk.
- If evidence below threshold: explicit uncertainty + `knowledge_gap` event.
- Citation requirement for all strategic recommendations.
- Policy layer blocks unsupported deterministic claims.

### B. Agentic Loop Contract
- Max iterations (e.g., 4-6), token budget, timeout budget.
- Tool call policy by role (Writer/Analyst/Coach/etc.).
- Tool result validation before next step.
- Final answer must include decision rationale + confidence.

### C. Learning Surfaces
- Mutable: thresholds, ranking weights, routing preferences, heuristics.
- Locked: mission constraints, compliance rails, forbidden claims, identity doctrine.
- Promotion to broader scopes requires governance checks and evidence.

---

## 6) Workflow + Engine Contract

### A. Template to Runtime
1. Workflow template authored in builder.
2. Engine instantiated from template.
3. Assignment creates a dedicated runtime clone (tenant/user scoped).
4. Clone binds to tenant brain profile and tool permissions.

### B. Execution Guarantees
- Idempotent execution IDs.
- Retry policy with dead-letter handling.
- Step-level status model: queued/processing/succeeded/failed.
- Full run logs with input/output snapshots.

### C. Assignment Integrity
- Engine assignment must validate tenant ownership.
- Brain assignment must validate tier permissions.
- Key/material segregation per tenant/user.

---

## 7) Guardrails (Compliance + Quality)

### A. Content Guardrails
- Forbidden claims list.
- Required proof language for aggressive claims.
- Safe fallback outputs when context is thin.

### B. Deliverability Guardrails
- Pacing caps enforced by worker, not UI.
- Domain/satellite health gates block scale-up automatically.
- Complaint/bounce thresholds trigger auto-throttle.

### C. Governance Guardrails
- No direct local-to-global knowledge promotion.
- All promotions require evidence and rollback metadata.
- Drift detection triggers suspension and revalidation.

---

## 8) Observability + SLOs

### A. Minimum SLOs
- API p95 latency target per route class.
- Queue lag upper bound per critical queue.
- Worker failure ratio threshold.
- Daily signal ingestion completeness target.

### B. Required Telemetry
- Correlation ID across API, worker, DB events.
- Decision logs for every mastery agent output.
- Per-tenant error budgets.
- Audit logs for governance state transitions.

### C. Alerting
- Missing signal ingestion window.
- Queue starvation/backlog surge.
- Provider failure spikes.
- Cross-tenant access violations (critical page immediately).

---

## 9) Build Program (Execution Order)

### Phase A — Data Canonicalization (Week 1)
- Implement RS:OS canonical core schema.
- Fix `028` FK and migration chain.
- Map existing IMT/client/ICP tables to canonical entities.
- Add strict constraints and indexes for runtime workloads.

### Phase B — Brain Hardening (Week 2)
- Remove all direct provider calls; enforce provider abstraction.
- Add bounded tool-calling agentic loop.
- Add hallucination/grounding checks + gap event writer.
- Re-enable and wire Analyst/Coach paths where planned.

### Phase C — Workflow/Engine Reliability (Week 3)
- Standardize engine runtime clone model.
- Add idempotency + retry + DLQ policies.
- Add assignment integrity checks (tenant, tier, key isolation).

### Phase D — Learning That Actually Learns (Week 4)
- Wire signal-driven confidence recomputation into belief state.
- Implement dream/reflection jobs with real model outputs.
- Update local KB weights and decision priors from outcomes.
- Add revalidation queue for contradictions.

### Phase E — Mastery Agent Core 5 (Week 5–6)
- Contact Decision, Timing Window, Angle Selection, Send Pacing, Reply Meaning.
- Decision logs + confidence + knowledge objects used.
- Hook agents into execution path (not sidecar-only).

### Phase F — Launch Discipline (Week 7)
- End-to-end soak tests on staging.
- SLO and alert validation drills.
- Runbook + rollback rehearsal.
- Controlled production rollout by tenant cohort.

---

## 10) Release Gates (Ship / No-Ship)

No phase advances unless:
- Schema and migrations are green on fresh environment.
- Integration tests cover critical happy + failure paths.
- Worker retry/DLQ behavior is verified.
- AI responses pass grounding policy checks.
- Tenant isolation checks pass (automated + manual probes).
- Dashboards expose phase-relevant health and business metrics.

---

## 11) Immediate Next 72 Hours (Action Plan)

1. Finalize canonical schema patch set (RS:OS + FK repair).
2. Implement provider-abstraction enforcement in brain pipeline.
3. Add `knowledge_gap` writer and confidence threshold policy.
4. Define queue reliability defaults (retry, backoff, DLQ) across workers.
5. Create master test matrix: API, workers, assignment integrity, RLS.
6. Publish runbook v1 (incident classes, rollback, owner actions).

---

## 12) Definition of “Blow This Out of the Water”

Success is not visual polish alone. Success is:
- higher revenue per 1K sends,
- lower variance in outcomes,
- faster learning cycles,
- safer scaling under guardrails,
- and auditable intelligence that compounds by tenant and network.

That is the standard this plan enforces.
