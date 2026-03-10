# 05 — Market Writer Engine

**Source:** Tommy's MW Angle System + Brief + Tracking + Flow Extension Rules + Angle Architecture & Governance

---

## Purpose

Market Writer is the Conversion & Belief Engine. It decides **what must happen in the buyer's mind next**.

It does NOT write "marketing emails." It constructs belief-shifting communication that moves buyers through a sequence of conclusions toward a booked call.

---

## The Angle System

### 7 Starting Angles (per offer)

| # | Angle | Core Concept | Entry Point |
|---|-------|-------------|-------------|
| 1 | **Problem Reframe** | The problem you think you have is not the real problem | Recognition of a misunderstood problem |
| 2 | **Hidden Constraint** | Something upstream is silently limiting results | Discovery of an unseen bottleneck |
| 3 | **False Solution** | The industry-accepted solution actually worsens the problem | Critical evaluation of standard approaches |
| 4 | **Economic Inefficiency** | Current approach costs 5–10x more than necessary | Financial audit of waste |
| 5 | **Market Shift** | Market rules changed, but strategies haven't | Observation of new rules vs old assumptions |
| 6 | **Opportunity Gap** | Competitors are missing something that creates advantage | Identification of unrealized potential |
| 7 | **Risk Exposure** | Current approach introduces hidden risk | Revelation of hidden systemic risk |

### Per Angle
- 3–4 hooks generated (entry points, not strategic frames)
- Hooks are tested to determine which opening most effectively introduces the angle
- Learning occurs at the ANGLE level, because the angle determines whether the message resonates

### Angle Adaptation
New angles can emerge from:
- Buyer responses
- Recurring objections
- High-performing hooks that reveal a new belief frame
- Brain analysis of reply patterns (our improvement — Tommy doesn't specify this)

### Convergence
In most markets, 2–3 angles eventually produce the majority of qualified responses. Once identified, MarketWriter increases focus on them across all channels.

---

## The Brief

### What It Is
An immutable container that defines:
- **WHO** (ICP)
- **WHAT** (Champion vs Challenger belief test)
- **WHY** (decision movement)
- **HOW** success is measured (signals)
- **HOW** the system is allowed to extend (extension intent)

### Lifecycle
1. Created in Draft
2. Locked at launch (immutable_after_launch = true)
3. Active during testing
4. Retired when replaced by child Brief

### Key Rule
If a Brief must change → create a NEW Brief with `parent_brief_id` linking lineage. Briefs never mutate after launch.

---

## Belief Competition

Every Brief creates exactly 2 Beliefs:
- **Champion** — current best hypothesis
- **Challenger** — the competitor

### Rules
- One belief per flow
- Two competing beliefs per ICP segment
- No belief mixing
- Allocation starts 50/50
- Allocation adjusts stepwise via Hybrid Gating
- Champion remains until Challenger wins by defined signal thresholds
- When Challenger wins: it becomes new Champion, a new Challenger is created in a new Brief

---

## Flow Generation

### Initial Block
- Flow A (Champion belief) — Emails 1–4
- Flow B (Challenger belief) — Emails 1–4
- Subject A/B per email
- Plain text
- Single CTA

### Flow Extension (gated)
Only triggered after Hybrid Gating conditions met.

**Emails 5–8: Clarification & Depth**
- Resolve uncertainty revealed in 1–4
- Reduce friction to reply
- "Let me be clearer, not louder."

**Emails 9–12: Confirmation & Resolution**
- Make next step feel safe and obvious
- Confirm fit explicitly
- Close open loops
- "This is what usually happens next."

**Post-12: Ongoing Reflection**
- Belief expression continues indefinitely
- Emphasis rotates: uncertainty type, role perspective, timing relevance
- CTA remains consistent
- No assumption of prior exposure

### Allowed vs Forbidden Changes in Extension

| Allowed | Forbidden |
|---------|-----------|
| Entry point (hook) | Core offer |
| Order of ideas | Audience definition |
| Problem specificity | Ethical posture |
| Fit explicitness | Underlying promise |
| CTA friction level | Belief mixing |

---

## Reply Classification

Every reply classified into:
| Type | Description |
|------|-------------|
| Interested | Ready to engage |
| Clarification | Asking questions |
| Objection | Pushing back on specific point |
| Timing | Not now, but maybe later |
| Referral | Pointing to someone else |
| Negative | Hard no |
| Noise | Out of office, unrelated |

Classification stored with confidence score. Accuracy prioritized over speed.

---

## Services to Build

1. **Brief Generation Service** — Creates Brief + 2 Beliefs from ICP + Offer
2. **Flow Generation Service** — Creates initial email block from Belief
3. **Flow Extension Service** — Generates 5–8, 9–12, post-12 blocks
4. **Reply Classification Service** — Classifies inbound replies via AI
5. **Angle Discovery Service** — Analyzes reply patterns to surface new angles (our addition)
