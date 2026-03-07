# MarketerX — Complete Solo Founder Roadmap
**Version:** 1.0  
**Date:** March 2026  
**Owner:** Anwesh Rath  
**Scope:** Everything from infrastructure to client portal — built by one person, end to end

---

## The Business in One Sentence

MarketerX manufactures booked sales calls for B2B clients by running a self-improving belief-testing and email delivery machine — then showing clients the data as proof of value.

---

## How the Product Actually Works (The Real Flow)

```
Client Onboarding
      ↓
Brain trained on client's ICP, offer, persona, goals
      ↓
Market Builder: qualified leads matched to ICP
      ↓
Market Writer: emails generated around a belief (Champion vs Challenger)
      ↓
Market Surface: emails delivered via MailWizz + SMTP
      ↓
Signals: replies, opens, clicks, bookings captured
      ↓
Brain learns: winning beliefs promoted, losing beliefs suppressed
      ↓
Client dashboard: sees the gold (data, brain insights, trends)
      ↓
Brain chats with client, suggests next moves, improves with every cycle
```

---

## The Three Engines

| Engine | Job | Status |
|---|---|---|
| **Market Builder** | Pull and qualify leads matching ICP | ❌ To build (currently relying on IMT/Nino who is gone) |
| **Market Writer** | Generate emails, pages, social content tied to beliefs | ⚠️ Partial (workflow engine exists but not belief-bound) |
| **Market Surface** | Deliver emails, manage domains, satellites, ramp | ❌ To build (was Nino/IMT's SMTP infra) |

---

## The Three Tiers

| Tier | What They Get |
|---|---|
| **Basic** | Brain trained for them, emails sent on their behalf, basic insights dashboard |
| **Medium** | Everything above + chat with their Brain, manual training, richer analytics |
| **Enterprise** | Everything + write your own emails, feed the brain, full workflow builder access |

---

## Current State: What Exists vs. What's Missing

### ✅ Already Built and Working
- Multi-tenant Supabase DB (orgs, users, RLS)
- Workflow execution engine (36 node types)
- Brain: RAG + multi-agent routing (Writer, Analyst, Coach, Generalist)
- VectorStore + embeddings (pgvector)
- KB management + admin UI
- Superadmin portal (engines, users, AI providers, orgs)
- 3 IMT endpoints: client registration, ICP storage, email flow return
- Learning Loop worker (partial — KB metadata updates only)
- Workers infrastructure (Bull + Redis)
- `imt_icps` table + `client_id` on organizations
- Theme system + responsive frontend shell

### ❌ Missing (Critical Path)
1. **Email sending infrastructure** (MailWizz was Nino's — need own SMTP/sending layer)
2. **RS:OS database schema** (Brief, Belief, Flow, Asset, Signal, Promotion tables)
3. **Lead sourcing / Market Builder** (IMT was doing this — need to own it)
4. **Belief-bound email generation** (current generation is KB-based, not belief-bound)
5. **MailWizz analytics webhook** (signals need to flow back in)
6. **Belief promotion engine** (HYP→TEST→SW→IW→RW→GW state machine)
7. **Client-facing member portal** (clients can't see anything useful yet)
8. **Brain ↔ Workflow integration** (they're separate — Brain doesn't power email generation)
9. **Knowledge gap detection** (Brain doesn't know when it's missing info)
10. **Self-healing loop** (Learning Loop updates KB metadata but not the Brain itself)

---

## Phase 0 — Foundations (Do This Before Anything Else)
**Goal:** Clean up the mess. Lock the architecture. Get your own email infra.

### 0.1 — Email Infrastructure Decision
You need to own your own email sending. Options:

| Option | What It Is | Cost | Best For |
|---|---|---|---|
| **Mailgun** | Transactional email API + dedicated IPs | ~$35/mo | Low-medium volume, fast start |
| **Postmark** | Highest deliverability, strict policy | ~$15/mo | Clean sender reputation |
| **AWS SES** | Cheapest, most flexible, needs warmup | ~$0.10/1k | High volume, technical setup |
| **Self-hosted Postfix + WHM** | Full control, no SaaS fees | Server cost only | Enterprise, Tommy's original model |
| **MailWizz self-hosted** | Marketing-focused, built-in campaign mgmt | $59 one-time | Closest to what you had |

**Recommendation:** Start with **Mailgun** (fast, reliable, API-first, easy warmup). Migrate to self-hosted when you hit 50k+ sends/day.

### 0.2 — RS:OS Schema Migration
Run the new Supabase migrations (see Phase 1 below).

### 0.3 — Remove Nino's IMT Dependency
The 3 IMT endpoints are fine. Keep them. But remove any assumption that IMT pushes data to you — you'll push from your own onboarding flow instead.

### 0.4 — Your RUST Brain Integration Plan
Keep the JS Brain for generation (it's fast and works).
Use your RUST Brain as the self-improvement engine:
```
JS Brain generates → emails sent → signals come back
→ RUST Brain analyses patterns overnight
→ RUST Brain detects KB gaps, runs research
→ RUST Brain pushes updates back to JS Brain's KB
→ Next generation cycle is smarter
```
You need: a simple HTTP API on your RUST Brain that accepts signal batches and returns KB update payloads.

---

## Phase 1 — RS:OS Schema (Week 1-2)
**Goal:** Build the data model Tommy designed. Everything else sits on top of this.

### Tables to create (new Supabase migration)

```sql
-- Core RS:OS Tables
partner          -- client account (maps to organizations)
offer            -- what the client sells
icp              -- immutable ICP segment
brief            -- immutable hypothesis container (1 Brief = 1 ICP = 2 Beliefs)
belief           -- atomic test unit (Champion or Challenger)
belief_competition  -- links champion + challenger, tracks allocation %
flow             -- execution container (one belief expressed to one context)
flow_step        -- individual emails in a flow
asset            -- any MW output (email, page, post, reply)
signal_event     -- every measurable event (click, reply, booking, etc.)
belief_gate_snapshot  -- audit trail of promotion gate evaluations
belief_promotion_log  -- log of every HYP→TEST→SW etc. transition
meeting          -- booked call with belief attribution
opportunity      -- sales opportunity linked to meeting
revenue_event    -- revenue linked to opportunity
sending_identity -- domain/satellite tracking
```

### Key constraints to enforce
- Brief immutable after launch (`locked_at` timestamp + DB trigger)
- Exactly 2 beliefs per brief (`UNIQUE(brief_id, belief_role)`)
- Every asset must reference `brief_id` + `belief_id` + `icp_id`
- Every signal_event must reference `belief_id`

---

## Phase 2 — Email Sending Infrastructure (Week 2-3)
**Goal:** Own your own email sending. No more dependency on third parties for core infrastructure.

### 2.1 — Set Up Sending Layer
- Sign up for Mailgun (or chosen provider)
- Set up sending domains (5 per client as per RS:OS governance)
- Configure DNS: SPF, DKIM, DMARC per domain
- Build domain warmup scheduler (ramp: 100 → 500 → 1000 → 3000/day over 14 days)
- Implement daily send limit enforcement (3,000/satellite/day max)

### 2.2 — Webhook Receiver (Critical)
Build `POST /api/webhooks/mailgun/events` to receive:
- `delivered`, `opened`, `clicked`, `complained`, `unsubscribed`, `bounced`
- Each event → insert into `signal_event` table with `belief_id` + `icp_id` reference

### 2.3 — Suppression Management
- Global suppression list
- Per-client suppression list
- Auto-suppress on complaint/unsubscribe/bounce
- Block catch-all email addresses

---

## Phase 3 — Market Builder (Lead Sourcing) (Week 3-5)
**Goal:** You need your own lead pipeline. IMT is gone. Own the data.

### Options for lead sourcing

| Option | What It Is | Cost |
|---|---|---|
| **Apollo.io API** | B2B database, 220M+ contacts, filters | $99/mo |
| **Hunter.io** | Email finding + verification | $49/mo |
| **Clay** | Multi-source enrichment, automation | $149/mo |
| **Prospeo** | LinkedIn email extraction | $39/mo |
| **PDL (People Data Labs)** | Raw API, highest coverage | $500+/mo |
| **Snov.io** | Email finder + verifier | $39/mo |

**Recommendation:** Apollo.io API as primary source + Hunter.io for verification.

### 3.1 — Lead Ingestion API
Build `POST /api/leads/import` to:
- Accept lead data from Apollo/Hunter
- Validate against ICP rules (industry, revenue, seniority, geography)
- Apply exclusion rules + global suppression check
- Email verification layer
- Store qualified leads linked to `icp_id`

### 3.2 — ICP Rule Engine
- Each ICP defines: industry codes, revenue band, seniority, geography, exclusions
- Lead import auto-classifies against active ICPs
- Output: `Deliverable identity pool` per ICP (as per RS:OS Phase 1)

---

## Phase 4 — Market Writer Core (Week 4-7)
**Goal:** Email generation that is belief-bound, not just KB-based. The core of the product.

### 4.1 — Brief Generation Service
When a client is onboarded:
1. Create `partner` record (maps to org)
2. Create `offer` record (what they're selling)
3. Create `icp` record (who to target)
4. Create `brief` with 2 beliefs:
   - **Champion**: current best hypothesis for this ICP+offer
   - **Challenger**: new hypothesis to test against Champion
5. Lock brief at first send (immutable from then on)

### 4.2 — Angle-Bound Flow Generation
For each brief:
- Generate **Flow A** (Champion belief): emails 1–4, subject A/B, single CTA
- Generate **Flow B** (Challenger belief): same structure, different belief frame
- Each email references `belief_id` + `brief_id`
- 7 canonical angles: Problem Reframe, Hidden Constraint, False Solution, Economic Inefficiency, Market Shift, Opportunity Gap, Risk Exposure

### 4.3 — Flow Extension Logic
After signals cross thresholds:
- **Emails 5–8**: Clarification & depth — resolve uncertainty from 1–4
- **Emails 9–12**: Confirmation & resolution — make next step feel obvious
- **Post-12**: Ongoing reflection — belief maintenance without escalation

### 4.4 — Email Destination Pages
Every email CTA must link to a dedicated page:
- Same angle as the email
- Structure: Hook → Recognition → Problem Reframe → Framework → Evidence → CTA
- Generated per `Angle × ICP × Buyer Stage` combination

---

## Phase 5 — Belief Promotion Engine (Week 6-8)
**Goal:** Automate the learning. Beliefs should promote or get suppressed without manual intervention.

### 5.1 — Signal Aggregation Worker
Daily worker reads `signal_event` and aggregates per belief:
- Sends, replies (positive/negative), clicks, bookings, show rate, revenue
- Calculates Confidence Score
- Updates `belief.confidence_score` and `belief.allocation_pct`

### 5.2 — Hybrid Gating Check
Before any promotion/allocation change, all 5 gates must pass:
1. Minimum send threshold met
2. Minimum reply count met
3. Minimum booked call count met
4. Durability window satisfied (7–14 days)
5. Statistical confidence threshold (≥90%)

### 5.3 — Promotion State Machine
```
HYP → TEST (start sending)
TEST → SW  (wins one ICP segment durably)
SW  → IW   (transfers across ICP segments)
IW  → RW   (holds across revenue bands)
RW  → GW   (platform-wide winner)
```
All transitions logged in `belief_promotion_log`.

### 5.4 — Allocation Adjustment
- Winner increases allocation stepwise (not to 100% immediately)
- Loser reduces proportionally
- Exploration % always maintained (challenger never dies until explicitly suppressed)

---

## Phase 6 — Brain Integration + Self-Healing (Week 7-10)
**Goal:** The Brain powers generation AND improves itself from what worked.

### 6.1 — Brain ↔ Workflow Integration
Wire the Brain into email generation:
- When generating an email for a belief → Brain fetches relevant KB context for that client
- Brain constitution (brand voice, guardrails) applied to every generation
- Generation grounded in KB — if no relevant docs found → flag gap, don't hallucinate

### 6.2 — Self-Healing Loop
```
email sent → signal captured → signal_event written
→ Learning Loop worker reads signal_event daily
→ Updates: promoted beliefs get angle weight boost in KB
→ RUST Brain API called with signal batch
→ RUST Brain identifies: what beliefs won, what KB sections were missing
→ RUST Brain returns: KB update suggestions, gap fill content
→ Updates pushed to client's KB
→ Next generation cycle uses updated KB → better output
```

### 6.3 — Knowledge Gap Detection
In RAGOrchestrator: when relevance score < 0.65 or zero docs returned:
- Return `gap_detected: true` with context
- Queue gap fill request to RUST Brain
- Client-facing: "Training your brain..." indicator

### 6.4 — Strict Grounding Mode
Optional Brain flag per client tier:
- When enabled: reject responses that can't be attributed to retrieved docs
- Return confidence score with every generation
- Basic clients always have this on (reduces hallucination risk)

---

## Phase 7 — Member Portal (Week 8-12)
**Goal:** Clients log in and see the gold. This is the product they pay for.

### 7.1 — Onboarding Flow
```
/onboarding → Step 1: ICP questionnaire (industry, revenue, titles, exclusions)
            → Step 2: Offer definition (what you sell, CTA type, booking link)
            → Step 3: Brain initialization (upload collateral, KB trained)
            → Step 4: Brain chat preview ("meet your Brain")
            → Assigned: flow (engine) + brain ready
```

### 7.2 — Dashboard Pages

**Basic Tier:**
- Campaign overview: sends, replies, bookings, open rate trend
- Current belief status (simplified: "Testing" / "Winning" / "Improving")
- Next milestone: "X more bookings to confirm belief"

**Medium Tier:**
- Everything above
- Brain chat: ask questions, get strategy suggestions
- Manual training: upload new content, see how it updates the Brain
- Belief performance: which angle is winning and why

**Enterprise Tier:**
- Everything above
- Full Belief Promotion Dashboard (HYP→TEST→SW→IW→RW→GW ladder)
- Brief Lineage view (how beliefs evolved)
- Workflow builder access (build custom flows)
- Asset performance (which emails, which pages, which social posts)

### 7.3 — The "Gold" View (What Makes Clients Stay)
- Revenue attributed to belief → shows ROI directly
- "Your Brain learned X new things this week"
- "Belief shift confirmed: [angle] is working with [ICP segment]"
- Compare: "This client's Brain vs. industry average" (anonymized benchmarks)
- Prediction: "At current trajectory, X booked calls next month"

---

## Phase 8 — Extended Content (Week 10-14)
**Goal:** MarketWriter generates everything — not just emails.

### 8.1 — SEO Page Generation
- Keyword map generated per client during onboarding
- Worth Winning Keywords → authoritative long-form pages
- Long-Tail Keywords → one page per intent, all linking upward
- Internal linking structure enforced automatically

### 8.2 — Social Content
- Platform support: LinkedIn, X, YouTube Shorts, Instagram, TikTok
- Native posts (no links, maximize reach)
- Traffic posts (link to destination page)
- Each traffic post gets unique destination page
- Angle-bound: every post tied to one of 7 canonical angles

### 8.3 — Company Website Generation
- MarketWriter generates all standard pages
- Single objective per page, single CTA
- Updated dynamically as Brain learns what messaging works

---

## Phase 9 — Scale + Multi-Tenancy (Week 12-16)
**Goal:** Handle multiple clients cleanly. Enable resellers.

### 9.1 — Per-Client Isolation Hardening
- Each client: isolated ICP, Beliefs, Flows, Signals, Brain, Domains
- No cross-client data leakage (RLS enforced everywhere)
- Satellite/domain per client with daily limit enforcement

### 9.2 — Reseller Tier
- Hierarchy: Platform Admin (you) → Resellers → Clients → Users
- Resellers can white-label and manage their own client accounts
- Feature gating configurable per reseller

### 9.3 — Controlled Scale Mechanics
As per RS:OS Governance:
- One satellite activated at a time
- 3,000 sends/satellite/day hard cap
- Horizontal expansion: next satellite → next domain layer → scale tier
- Never scale volume before deliverability stability confirmed

---

## The Dashboard System (5 Layers)
As per Tommy's `MarketWriter Dashboard Architecture.docx`:

| Layer | What It Shows | Who Uses It |
|---|---|---|
| **1. System Health** | Active boxes, capacity, queue backlog, API health | You (ops) |
| **2. Deliverability** | Inbox placement, spam rate, reputation, bounce rate | You (ops) |
| **3. Belief Tracking** | Belief performance, promotion ladder, Brief lineage | You + Enterprise clients |
| **4. Campaign Performance** | Per-client/campaign sends, bookings, conversion | You + Medium/Enterprise clients |
| **5. Sales & Revenue** | Revenue attribution, deals created, Rev/1k sends | You + Enterprise clients |

---

## What Replaces Nino's Work

| What Nino Did | What Replaces It |
|---|---|
| MailWizz self-hosted SMTP | Mailgun API (or self-host MailWizz) |
| IMT lead sourcing | Apollo.io API + ICP rule engine |
| IMT client registration push | Your own onboarding flow |
| IMT analytics push | Mailgun webhook → your signal_event table |
| IMT reply handling (Phase 4) | Mailgun inbound routing → your reply classification |

Nino's 3 API endpoints (`/api/imt/clients`, `/api/imt/icps`, `/api/imt/email/flows`) — keep them. They're clean and work. When IMT is out of the picture, your onboarding flow calls them internally instead.

---

## Build Priority (One-Person Schedule)

| Sprint | What to Build | Weeks |
|---|---|---|
| Sprint 1 | RS:OS schema migration + email infra setup (Mailgun) | 1–2 |
| Sprint 2 | Mailgun webhook → signal_event + basic sending pipeline | 2–3 |
| Sprint 3 | Lead sourcing (Apollo API + ICP rule engine) | 3–5 |
| Sprint 4 | Brief/Belief/Flow generation (MarketWriter core) | 4–7 |
| Sprint 5 | Belief Promotion Engine (state machine + gating) | 6–8 |
| Sprint 6 | Brain ↔ Workflow integration + self-healing loop | 7–10 |
| Sprint 7 | Member portal: onboarding + basic dashboard | 8–12 |
| Sprint 8 | Member portal: medium/enterprise tiers + chat | 10–14 |
| Sprint 9 | Extended content (SEO, social, website) | 12–16 |
| Sprint 10 | Scale mechanics + reseller tier | 14–18 |

---

## Files to Create (By Phase)

### Phase 1 (Schema)
- `supabase/migrations/XXXXXX_rs_os_core.sql`
- `supabase/migrations/XXXXXX_rs_os_signals.sql`
- `supabase/migrations/XXXXXX_rs_os_outcomes.sql`

### Phase 2 (Email Infra)
- `apps/frontend/src/app/api/webhooks/mailgun/route.ts`
- `apps/frontend/src/lib/email/mailgun-client.ts`
- `apps/workers/src/workers/email-sender-worker.ts`
- `apps/workers/src/workers/suppression-worker.ts`

### Phase 3 (Lead Sourcing)
- `apps/frontend/src/app/api/leads/import/route.ts`
- `apps/frontend/src/lib/leads/apollo-client.ts`
- `apps/frontend/src/lib/leads/icp-rule-engine.ts`

### Phase 4 (Market Writer)
- `apps/frontend/src/app/api/briefs/route.ts`
- `apps/frontend/src/lib/marketwriter/brief-service.ts`
- `apps/frontend/src/lib/marketwriter/belief-generator.ts`
- `apps/frontend/src/lib/marketwriter/flow-generator.ts`
- `apps/frontend/src/lib/marketwriter/angle-engine.ts`

### Phase 5 (Promotion Engine)
- `apps/workers/src/workers/belief-promotion-worker.ts`
- `apps/workers/src/workers/signal-aggregation-worker.ts`
- `apps/frontend/src/lib/belief/promotion-state-machine.ts`
- `apps/frontend/src/lib/belief/hybrid-gate-evaluator.ts`

### Phase 6 (Brain)
- `apps/frontend/src/services/brain/BeliefBrainBridge.ts`
- `apps/frontend/src/services/brain/GapDetector.ts`
- `apps/frontend/src/services/brain/GroundingEnforcer.ts`
- `apps/workers/src/workers/rust-brain-sync-worker.ts`

### Phase 7 (Member Portal)
- `apps/frontend/src/app/(main)/onboarding/page.tsx`
- `apps/frontend/src/app/(main)/dashboard/page.tsx` (rebuild)
- `apps/frontend/src/app/(main)/beliefs/page.tsx`
- `apps/frontend/src/app/(main)/insights/page.tsx`
- `apps/frontend/src/app/(main)/brain-chat/page.tsx` (already exists, wire properly)

---

## North Star Metric

**Revenue per 1,000 sends** — this is the single number that tells you if the whole system is working.

If this number goes up over time, the Brain is learning, the beliefs are improving, the targeting is right, and the product is delivering.

Everything else is a leading indicator of this number.

---

## References
- Tommy's docs: `Documentation/3 IN ONE MULTITENANT MARKETX/`
- Brain audit: `Plans/Active/BRAIN_AUDIT_COMPREHENSIVE_REPORT.md`
- Master plan: `.agent/Plans/Active/MARKETERX_MASTER_PLAN.md`
- Architecture: `.agent/knowledge_system/ARCHITECTURE.md`
