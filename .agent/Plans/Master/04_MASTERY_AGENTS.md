# 04 — Mastery Agents

**Source:** Tommy's Mastery Agent Blueprint + Canonical Agent Stack Spec + Learning Architecture + KB Schema + Governance Policy

---

## What a Mastery Agent Is

A bounded system built to perform **one defined task** under **one defined standard**, improve through feedback, and retain validated learning over time.

NOT a general AI. NOT a chatbot. NOT a personality that improvises.
ONE worker. ONE job. ONE rubric. ONE improvement loop.

---

## The 5 Structural Layers (per agent)

| Layer | Purpose |
|-------|---------|
| Task Definition | Exact job, boundaries, triggers, inputs, outputs |
| Standard | What correct means, what failure means |
| Execution | Performs the task using approved logic + tools |
| Feedback | Captures real-world outcomes after execution |
| Learning | Turns measured outcomes into retained improvements |

**Critical rule:** Execution and Learning are SEPARATE systems. The acting part does not freely rewrite itself.

---

## The 9-Agent Canonical Stack

### Phase 6 — First 5 (Highest Leverage)

| # | Agent | Control Point | Task |
|---|-------|--------------|------|
| 1 | **Contact Decision** | Contact vs suppress | Decide whether a person should be contacted now, delayed, or suppressed |
| 2 | **Timing Window** | When to outreach | Determine when outreach should occur for a qualified person |
| 3 | **Angle Selection** | Which belief angle | Select the best angle for the buyer at this stage in this context |
| 4 | **Send Pacing** | Delivery speed | Control rollout speed to protect reputation and economics |
| 5 | **Reply Meaning** | Response interpretation | Classify replies: positive intent, objections, wrong-person, meeting intent |

### Phase 7 — Remaining 4

| # | Agent | Control Point | Task |
|---|-------|--------------|------|
| 6 | **Buying Role** | Persona classification | Determine the likely buying role and route logic accordingly |
| 7 | **Buyer Stage** | Journey classification | Determine current stage and next required conclusion |
| 8 | **Uncertainty Resolution** | What to address next | Determine which uncertainty must be resolved to move buyer forward |
| 9 | **Sequence Progression** | Message order | Decide what message comes next to progress one conclusion at a time |

---

## Knowledge Scoping

### 3-Scope Model

| Scope | Where | Authority |
|-------|-------|-----------|
| **Local KB** | Per partner | Highest for execution |
| **Candidate Global** | Review layer | Non-authoritative |
| **Global KB** | Network-wide | Advisory priors only |

### Authority Order (deterministic)
1. Hard constraints / locked rules
2. Local knowledge
3. Global priors
4. Candidate-global insights (non-authoritative)

**Local always controls execution. Global informs, never overrides.**

---

## Knowledge Object Model (v1 — 20 fields)

| Field | Purpose |
|-------|---------|
| knowledge_id | Unique identifier |
| knowledge_scope | local / candidate_global / global |
| partner_id | Nullable for global |
| engine_domain | data_engine / delivery_engine / marketwriter / cross_engine / governance |
| control_point | contact_decision / timing_window / angle_selection / etc. |
| agent_owner | Which agent created this |
| knowledge_type | threshold / preference / rule / mapping / pattern / heuristic / exception / guardrail |
| knowledge_title | Human-readable short title |
| knowledge_statement | Clear statement of the learned pattern |
| structured_payload | Machine-readable actionable form (JSON) |
| applicability_context | Where this applies (ICP, role, stage, segment, industry) |
| exclusions | Where this should NOT apply |
| evidence_summary | Why this object exists |
| evidence_metrics | Sample size, lift, confidence, impact |
| confidence_status | exploratory / provisional / validated / promoted / weakened / deprecated / rolled_back |
| promotion_status | local_only / candidate_for_review / under_review / approved_for_global / global_active / global_suspended |
| version_number | Monotonic version |
| created_at | Timestamp |
| created_by | Agent or human |
| updated_at | Timestamp |

### v2 Additions (Phase 7+)
- effective_start_at, effective_end_at
- supersedes_knowledge_id
- approved_by
- last_revalidated_at, next_revalidation_due_at
- rollback_reference
- origin_type, origin_reference
- audit_notes

---

## Learning Permissions (per agent)

Each agent has explicit allowed and locked learning surfaces:

**Allowed learning examples:**
- Ranking preferences, threshold values, wording preferences
- Pattern associations, failure flags, edge-case handling
- Routing rules, timing windows, angle effectiveness

**Locked (requires human review):**
- Mission, task boundary, core rubric
- Safety/compliance constraints, brand doctrine
- Canonical definitions, ICP source of truth

---

## Decision Logging

Every agent decision must be recorded:

| Field | Content |
|-------|---------|
| decision_id | UUID |
| agent_name | Which agent |
| decision_type | contact / timing / angle / pacing / reply_class |
| inputs_used | Structured JSON of all inputs |
| knowledge_objects_used | Array of knowledge_ids consulted |
| confidence_score | Float |
| output | The decision (contact/delay/suppress, angle_id, timing, etc.) |
| timestamp | When |
| outcome | Populated later when signal arrives |

---

## Our Improvements Over Tommy's Design

### 1. LLM-Powered Diagnosis
Tommy's agents learn from statistical patterns only. We add an LLM reasoning layer: when an angle fails for an ICP, the Brain analyzes WHY (not just that it failed). This produces richer knowledge objects with explanatory context, making priors more useful for new partners.

### 2. Inter-Agent Communication
Tommy specifies 9 independent agents. We add an orchestration layer:
- Angle Selection Agent queries Buyer Stage Agent before choosing
- Sequence Progression Agent queries Uncertainty Resolution Agent
- Contact Decision Agent can consult Timing Window Agent

This prevents contradictory decisions (e.g., selecting an angle for a stage the buyer isn't in).

### 3. Signal-Triggered Revalidation
Tommy's revalidation is time-based (fast/medium/slow cycle). We add signal-triggered revalidation: when a new reply contradicts a learned pattern, that pattern gets fast-tracked for revalidation regardless of schedule. This prevents stale knowledge from persisting during rapid market shifts.

### 4. Graduated Autonomy
Phase 6: Agents propose, superadmin approves (manual governance)
Phase 7: Agents propose, governance engine auto-approves if evidence thresholds met
Phase 9: Agents with proven track records get expanded learning permissions

Tommy's doc doesn't specify this graduation. He assumes governance is always the same. We evolve trust in the system as it proves itself.
