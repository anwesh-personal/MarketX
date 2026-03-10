# 08 — Measurement & Dashboards

**Source:** Tommy's Measurement & Dashboard System (Canonical) + Dashboard Architecture + Belief Tracking Dashboard

---

## Governing Principle

"If a metric is not defined here, it does not exist. If a metric is defined here, it must be calculated and interpreted exactly as written."

No downstream metric is trusted unless all upstream layers are healthy.

---

## The 12-Section Measurement System

Sections are intentionally ordered. Earlier sections gate later ones.

| Section | Purpose | Build Phase |
|---------|---------|-------------|
| 1 | Delivery & Inbox Health | Phase 2 |
| 2 | Capacity & Scale | Phase 5 |
| 3 | Data & Targeting (Who/When) | Phase 5 |
| 4 | Engagement (Person-Level) | Phase 2 |
| 5 | Repeat & Intensity | Phase 5 |
| 6 | Account-Level Breadth | Phase 5 |
| 7 | Account Momentum | Phase 5 |
| 8 | Conversion & Booked Calls | Phase 2 |
| 9 | MW Testing & Learning | Phase 2 |
| 10 | Sales & CRM Impact | Phase 8 |
| 11 | Economic Outcomes | Phase 8 |
| 12 | System Health & Retention | Phase 8 |

---

## Per-Metric Specification Format

For every metric:
- What it measures (plain language)
- Leading or lagging
- Who owns it
- Formula
- Time window
- Minimum sample
- Action trigger
- Danger/misleading flag

---

## Dashboard Hierarchy

### Level 1 — System Health (Superadmin)
- API health, worker capacity, queue backlog
- Infrastructure status across all partners

### Level 2 — Deliverability (Superadmin + Partner)
- Inbox placement, spam rate, bounce rate, reputation trend
- Per-domain, per-satellite breakdown

### Level 3 — Belief Tracking (Superadmin + Partner)
- Confidence scores, promotion states, allocation weights
- Belief competition status per Brief
- Angle class performance aggregate

### Level 4 — Campaign Performance (Partner)
- Reply quality, click-to-reply, engagement depth
- Flow extension status
- Sequence drop-off analysis

### Level 5 — Revenue & Economics (Partner + Superadmin)
- Booked calls, show rate, revenue per 1,000 sends
- Pipeline value, deal progression
- Cost per signal, cost per booked call

---

## Rollup Strategy

Dashboards read from materialized rollups, NOT raw `signal_event` queries.

### belief_daily_rollup
Computed nightly. Aggregates per belief per day:
- sends, opens, clicks, replies, positive_replies
- booked_calls, qualified_booked_calls, revenue
- complaint_rate, unsubscribe_rate, bounce_rate

### partner_weekly_rollup (Phase 8)
Aggregates per partner per week:
- Total sends, total replies, total bookings
- Revenue, revenue per 1,000 sends
- Active beliefs, active satellites
- Section 1 health summary

### angle_rollup (Phase 5)
Aggregates per angle_class across beliefs:
- Performance by angle across partners
- Candidate for global knowledge promotion

---

## What Gets Locked vs What Evolves

**Locked:**
- Metric definitions, formulas, measurement windows
- Ownership, danger flags

**Evolves carefully:**
- Thresholds, alerting logic
- Prioritization rules, automation responses
