# 06 — Market Builder Engine (Data & Information)

**Source:** Tommy's RS Operating Workflow Phase 1 + Tech Spec Section 1

---

## Purpose

Market Builder decides **WHO should be contacted and WHEN**. It is the data and identity engine.

---

## ICP Construction

### Requirements per ICP Segment
- Industry (420 taxonomy)
- Revenue band
- Seniority level
- Buying power classification
- InMarket keyword intent
- Explicit exclusions

Output: `icp` record with full `firmographics_json` and `persona_scope_json`

### ICP Governance
- Once a satellite begins ramp: ICP may NOT change mid-ramp
- If ICP must change: new segment, new Brief, new flow binding
- Signal must not be contaminated

---

## Identity Sourcing Pipeline

### Step 1: Pull
- Universal Person records by ICP criteria
- Filter by `icp_segment_id`
- Apply firmographic + persona matching

### Step 2: Hygiene (mandatory layers)
1. Global suppression merge
2. Partner suppression merge
3. Internal reject history
4. Catch-all exclusion
5. Email verification layer

Output: Deliverable identity pool

### Step 3: Contact Decision
Evaluated by Contact Decision Agent (Phase 6) or rule-based logic (Phase 3):
- ICP fit score
- Identity confidence
- Contact validation status
- Prior engagement history
- Delivery capacity state
- Partner-specific exclusions + compliance constraints

Output: Contact now / Delay / Suppress with confidence + reason codes

---

## Data Sources (to integrate)

| Source | What it provides | Priority |
|--------|-----------------|----------|
| Apollo.io API | Company + person records by firmographics | Phase 3 |
| InMarket signals | Buyer intent indicators | Phase 3 |
| SiteVisitor data | Account-level web engagement | Phase 7 |
| CRM integration | Prior engagement, meetings, deals | Phase 8 |

---

## Services to Build

1. **ICP Construction Service** — Creates structured ICP from firmographic inputs
2. **Identity Pull Service** — Fetches person records matching ICP
3. **Hygiene Pipeline** — Applies all suppression/verification layers
4. **Contact Decision Service** — Evaluates fit and outputs contact/delay/suppress
5. **Pool Management** — Tracks pool size, quality, depletion rate
