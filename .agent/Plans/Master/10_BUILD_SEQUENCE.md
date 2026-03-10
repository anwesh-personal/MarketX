# 10 — Build Sequence

**Date:** 9 March 2026
**Builder:** Anwesh Rath (solo)
**Timeline:** 20 weeks (Phases 0–9)

---

## Overview

This is the execution-order build plan. Phases are gated — each one must be functional before the next begins. No shortcuts, no stubs, no "we'll wire it later."

---

## Phase 0 — Foundation Reset (Week 1–2)

**Goal:** Clean slate. RS:OS schema exists. App compiles. Dev server runs.

### Tasks
- [x] Create RS:OS core migration: `partner`, `offer`, `icp`, `brief`, `belief`, `belief_competition`, `flow`, `flow_step`, `asset`, `signal_event`, `config_table`
- [x] Fix `028_brain_learning.sql` FK to reference new `belief` table
- [x] Create `belief_gate_snapshot` and `belief_promotion_log` tables
- [x] Map existing `organizations` to `partner` (or alias — `partner_id = org_id`)
- [ ] Map existing `imt_icps` to new `icp` table structure
- [x] Seed `config_table` with Tommy's v1 thresholds (from Tech Spec Section 2.8)
- [ ] Remove or archive dead code paths that reference old schema
- [ ] Verify full migration chain applies cleanly on fresh Supabase
- [ ] Run `npm run dev` — no errors, all pages compile

### Exit Criteria
- `psql` shows all RS:OS tables with correct FKs
- Frontend compiles and loads
- Config thresholds are queryable

### Dependencies
None — this is the foundation.

---

## Phase 1 — Market Writer Core (Week 3–5)

**Goal:** Brief generation, Belief creation, Flow binding. The core of what makes this system different from a mail merge.

### Tasks
- [x] Build Brief Generation Service (`/api/briefs/generate`)
  - Input: ICP_ID, Offer_ID
  - Creates immutable Brief with all lock fields
  - Creates exactly 2 Beliefs (Champion + Challenger)
  - Sets Status = TEST, allocation = 50/50
- [x] Build Flow Generation Service (`/api/flows/generate`)
  - Input: Belief_ID
  - Generates initial 4-email block
  - Binds Flow to Belief_ID
  - Subject A/B per email
- [x] Build Angle System
  - 7 starting angles per offer (from Tommy's Angle System doc)
  - 3–4 hooks per angle
  - Angle metadata stored on Brief + Belief
- [x] Build Superadmin UI: Brief Manager
  - Create, view, lock Briefs
  - View Belief competition pairs
  - View Flow bindings
- [x] Build Reply Classification Service
  - Classify: Interested, Clarification, Objection, Timing, Referral, Negative, Noise
  - Store with confidence score
  - Uses AI provider (not hardcoded OpenAI)

### Exit Criteria
- Can create a Brief for a partner + ICP + offer
- Brief creates 2 beliefs with proper binding
- Flows generate and bind correctly
- Replies can be classified

### Dependencies
Phase 0 complete.

---

## Phase 2 — Signal Engine (Week 5–7)

**Goal:** Capture real-world outcomes. Without signals, nothing learns.

### Tasks
- [x] Build Signal Ingestion API (`/api/signals/ingest`)
  - Accepts: send, reply, click, booking, show, revenue events
  - Every event must carry: partner_id, offer_id, icp_id, brief_id, belief_id
  - Stores in `signal_event` table
- [x] Build Confidence Score Engine (weekly worker)
  - Formula: `Confidence = (Booked_Call_Rate × W1) + (Positive_Reply_Rate × W2) + (Reply_Quality × W3) - (Negative_Reply_Rate × W4)`
  - Weights from `config_table`
  - Updates `belief.confidence_score`
- [x] Build Hybrid Gating Engine
  - Before any allocation/extension/promotion: verify all 5 gate conditions
  - If any fails → no action
- [x] Build Allocation Engine (weekly worker)
  - If gate satisfied: increase winner by step size, reduce loser proportionally
  - Maintain minimum exploration percentage
  - Never 100% allocation to one belief
- [x] Build email delivery webhook receiver
  - Mailgun/SES webhook → `signal_event`
  - Captures: delivered, bounced, complained, opened, clicked, replied
- [x] Build CRM booking webhook
  - Booking event → `meeting` table + `signal_event`

### Exit Criteria
- Signal events flow into the database
- Confidence scores update weekly
- Gating prevents premature allocation changes
- Webhook receives real email events

### Dependencies
Phase 1 complete + email sending configured.

---

## Phase 3 — Market Builder (Week 7–9)

**Goal:** Automated ICP construction and identity sourcing.

### Tasks
- [x] Build ICP Construction Service
  - 420 taxonomy segmentation
  - Revenue band, seniority, buying power, InMarket intent, exclusions
  - Outputs: `icp` record with all firmographics
- [x] Build Identity Sourcing Pipeline
  - Pull Universal Person records by ICP criteria
  - Apply: global suppression, partner suppression, reject history, catch-all exclusion, verification
  - Output: deliverable identity pool
- [x] Build Contact Decision Logic
  - Evaluate: ICP fit, identity confidence, prior engagement, delivery capacity
  - Output: Contact now / Delay / Suppress with confidence + reason codes
- [x] Build Superadmin UI: ICP Manager
  - Create, view, edit ICP segments
  - View identity pool stats
  - View contact decision audit trail

### Exit Criteria
- Can define an ICP segment with full firmographics
- Identity pool generated with hygiene applied
- Contact decisions are logged and auditable

### Dependencies
Phase 0 complete. Can run parallel to Phase 2 signal work.

---

## Phase 4 — Market Surface (Week 9–11)

**Goal:** Email delivery infrastructure with deliverability governance.

### Tasks
- [x] Build Satellite Management
  - 5 TLDs × 10 satellites per partner
  - Assign, warm up, track status
- [x] Build Send Pacing Engine
  - 3,000/satellite/day max
  - One satellite ramp at a time
  - 10–14 day ramp schedule
  - Centralized throttle control
- [x] Build Deliverability Monitoring
  - Inbox placement, spam rate, bounce rate, complaint rate, reputation trend
  - Section 1 metrics from Tommy's Measurement doc
  - Gating: if Section 1 fails → pause scale
- [x] Build Domain Management
  - DNS verification, SPF/DKIM/DMARC
  - Tracking domain isolation
  - Reply routing configuration
- [x] Integrate with email provider (Mailgun or SES)
  - Send API
  - Webhook receiver (bounces, complaints, opens, clicks)

### Exit Criteria
- Can provision satellites for a partner
- Sends respect pacing rules
- Deliverability metrics are captured
- Emails actually send and webhooks come back

### Dependencies
Phase 2 (signal infrastructure must exist to receive webhooks).

---

## Phase 5 — Promotion Engine + Flow Extension (Week 11–13)

**Goal:** Beliefs promote through the ladder. Flows extend intelligently.

### Tasks
- [x] Build Promotion Engine
  - Status transitions: HYP → TEST → SW → IW → RW → GW
  - Every transition logged in `belief_promotion_log`
  - Gate snapshot stored in `belief_gate_snapshot`
  - Failure reduces allocation, does not auto-kill
- [x] Build Flow Extension Service
  - Triggered only after gating met
  - Generates Emails 5–8, then 9–12
  - Allowed changes: friction level, problem specificity, idea order, fit clarity
  - Forbidden changes: offer, ICP, belief mixing
  - Post-12: reflection phase, belief expression continues indefinitely
- [x] Build Extension Analysis
  - Step-level engagement patterns
  - Engagement type mix (click-only, reply-only, click→reply)
  - Reply composition analysis
  - Account spread detection
- [x] Build Superadmin UI: Belief Dashboard
  - View promotion ladder state
  - View confidence scores
  - View allocation weights
  - View gate snapshots

### Exit Criteria
- Beliefs can promote through the full ladder
- Extensions generate correctly under governance
- Dashboard shows promotion state in real time

### Dependencies
Phase 2 (signals) + Phase 1 (beliefs/flows).

---

## Phase 6 — Mastery Agents (Week 13–16)

**Goal:** Deploy the first 5 specialized agents. Not all 9 yet.

### First 5 Agents (highest leverage)
1. **Contact Decision Agent** — who to contact
2. **Timing Window Agent** — when to reach out
3. **Angle Selection Agent** — which belief angle to use
4. **Send Pacing Agent** — how fast to scale delivery
5. **Reply Meaning Agent** — how to interpret responses

### Tasks
- [x] Build Knowledge Object schema (Tommy's 30-field canonical model)
  - `knowledge_object` table with 3 scopes: local, candidate_global, global
  - All fields from Tommy's KB Schema (Canonical)
- [x] Build Agent Framework
  - Each agent: defined task, standard, inputs, outputs, learning permissions, locked constraints
  - Agents read from Local KB first, Global priors second
  - Agents write to Local KB only
  - Decision logging for every agent decision
- [x] Build Decision Log table
  - decision_id, type, inputs, knowledge_objects_used, confidence, timestamp, outcome
- [x] Implement first 5 agents with real logic
- [x] Wire agents into the execution pipeline
  - Contact Decision Agent called before send
  - Timing Window Agent determines send timing
  - Angle Selection Agent chooses belief angle
  - Send Pacing Agent governs satellite ramp
  - Reply Meaning Agent classifies all incoming replies

### Exit Criteria
- 5 agents make real decisions in production
- Every decision is logged with full audit trail
- Agents read from Local KB and respect locked constraints

### Dependencies
Phase 5 complete (promotion engine must exist for belief lifecycle).

---

## Phase 7 — Knowledge Governance + Remaining Agents (Week 16–18)

**Goal:** Full knowledge promotion lifecycle + remaining 4 agents.

### Tasks
- [x] Build Knowledge Governance Engine
  - Promotion path: Local → Candidate → Under Review → Global
  - No direct local-to-global jumps
  - Evidence requirements: cross-partner, sample size, stability, no harmful side effects
  - Revalidation scheduling (fast/medium/slow cycle)
  - Demotion, suspension, retirement, rollback
- [x] Implement remaining 4 agents
  6. **Buying Role Agent** — persona/role classification
  7. **Buyer Stage Agent** — where in the buying journey
  8. **Uncertainty Resolution Agent** — what to address next
  9. **Sequence Progression Agent** — what message comes next
- [x] Build Network Learning Layer
  - Cross-partner pattern detection
  - Candidate global creation when patterns repeat
  - Governance review workflow
- [x] Build Global KB
  - Only stores validated structural truths
  - Read-only for partner execution
  - Write-only through governance

### Exit Criteria
- All 9 agents operational
- Knowledge promotes through the full lifecycle
- Global KB begins forming from cross-partner patterns

### Dependencies
Phase 6 complete.

---

## Phase 8 — Dashboards + Member Portal (Week 18–19)

**Goal:** Clients see their data. The golden insights that make them stay.

### Tasks
- [ ] Build 12-section measurement implementation
  - Sections 1–12 from Tommy's Measurement doc
  - Materialized rollups (`belief_daily_rollup`)
  - Gating: downstream sections invalid if upstream fails
- [ ] Build Partner Dashboard
  - Total Sends, Reply Rate, Booked Calls, Show Rate, Revenue, Revenue/1K Sends
  - Active Satellites, Belief status, Angle performance
- [ ] Build Belief Dashboard
  - Confidence Score, Allocation %, Sends, Replies by type, Status, Hierarchy Level
- [ ] Build Member Portal
  - Client login → sees their assigned Brain, flows, insights
  - Basic: metrics only
  - Medium: + chat with Brain + train
  - Enterprise: + write emails + feed Brain + flow builder access
- [ ] Build feature gating by tier

### Exit Criteria
- Partner dashboards show real data
- Member portal serves all 3 tiers
- Feature gating works correctly

### Dependencies
Phase 5+ (needs signal data and promotion state).

---

## Phase 9 — Scale + Self-Healing (Week 19–20)

**Goal:** The system compounds. Network effect activates.

### Tasks
- [ ] Build Self-Healing Loop
  - Nightly: review signal_events per partner
  - Identify: winning beliefs → boost angle weights in Local KB
  - Identify: knowledge gaps (low-confidence RAG retrievals) → flag for fill
  - Update partner Brain config with fresh learning
- [ ] Build RUST Brain Integration (optional but powerful)
  - Feed signal batches to Oraya overnight
  - Oraya runs: gap detection, research, reflection
  - Returns: KB update suggestions
  - JS Brain applies validated updates
- [ ] Build Scale Expansion Logic
  - Activate next satellite when: durability positive + deliverability stable + rev/1K healthy
  - Horizontal before vertical
  - Offer tier escalation ($10K + $5K/month)
- [ ] Build Network Effect Monitoring
  - Track: more partners → more signal → better priors → better performance → more partners
  - Dashboard for network health

### Exit Criteria
- System improves overnight without human intervention
- New partners start with stronger priors than earlier ones
- Scale expansion follows governance rules

### Dependencies
All prior phases.

---

## Timeline Summary

| Phase | What | Weeks | Cumulative |
|-------|------|-------|-----------|
| 0 | Foundation Reset | 1–2 | 2 weeks |
| 1 | Market Writer Core | 3–5 | 5 weeks |
| 2 | Signal Engine | 5–7 | 7 weeks |
| 3 | Market Builder | 7–9 | 9 weeks |
| 4 | Market Surface | 9–11 | 11 weeks |
| 5 | Promotion + Extension | 11–13 | 13 weeks |
| 6 | First 5 Mastery Agents | 13–16 | 16 weeks |
| 7 | Governance + Remaining Agents | 16–18 | 18 weeks |
| 8 | Dashboards + Member Portal | 18–19 | 19 weeks |
| 9 | Scale + Self-Healing | 19–20 | 20 weeks |

**Note:** Phases 2 and 3 can partially overlap. Phases 8 and 9 can partially overlap. Solo builder, so parallelization is limited to async workers + UI.
