# 07 — Market Surface Engine (Delivery & Distribution)

**Source:** Tommy's RS Operating Workflow Phase 3–4 + Tech Spec Section 4 + Governance Manual Section 7

---

## Purpose

Market Surface decides **HOW outreach scales without breaking economics or reputation**.

---

## Satellite Infrastructure

### Per Partner Environment
- 5 TLD domain variations
- 10 satellites per domain (= 50 satellites total capacity)
- Isolated tracking domain
- Isolated link domain
- Isolated reply routing
- Lists A/B created per belief

**No domain reuse between partners. No shared reputation contamination.**

---

## Ramp Discipline

### Rules
- One satellite activated at a time
- 10–14 day ramp period
- 3,000 sends per satellite per day maximum
- Volume throttle controlled centrally
- No forced scaling. No spike scaling.

### Scale Expansion (Phase 8+)
Only when:
- Durability is positive
- Deliverability is stable
- Revenue per 1,000 sends is healthy

Expansion sequence:
1. Activate next satellite
2. Expand domain layer
3. Move to higher offer scale tier

**Scale is horizontal before vertical.**

---

## Deliverability Governance (Section 1 Metrics)

| Metric | Formula | Window | Trigger |
|--------|---------|--------|---------|
| Inbox placement rate | Inbox Delivered ÷ Total Delivered | Rolling 7d | Drop → pause scale |
| Spam placement rate | Spam Delivered ÷ Total Delivered | Rolling 7d | Rise → reduce velocity |
| Hard bounce rate | Hard Bounces ÷ Total Sent | Rolling 14d | Rise → suppress source segment |
| Complaint rate | Complaints ÷ Total Delivered | Rolling 30d | Spike → investigate message fit |
| Domain reputation trend | Score(t) − Score(t-1) | Rolling 30d | Negative → freeze scale |

**If any Section 1 metric fails → all downstream metrics are untrusted.**

---

## Technical Testing (3 Layers, before launch)

### Layer 1: Infrastructure
- DNS verification
- SPF/DKIM/DMARC
- Spam score check
- Unsubscribe link validation

### Layer 2: Classification
- Internal reply classification testing
- Objection injection testing
- SLA response validation

### Layer 3: Approval
- Partner approval test send

**No launch without: domain verified + classification confirmed + suppression enforced + partner sign-off.**

---

## Email Provider Strategy

### v1 (Phase 4)
- Mailgun or Amazon SES as sending API
- Webhook receiver for: delivered, bounced, complained, opened, clicked
- Reply routing to dedicated inbox → reply classification pipeline

### v2 (Phase 8+)
- Self-hosted satellite management
- IP pool isolation
- Warm-up automation
- Reputation monitoring dashboard

---

## Services to Build

1. **Satellite Management Service** — Provision, warm, track satellite status
2. **Send Pacing Engine** — Enforce daily caps, ramp schedule, throttle control
3. **Deliverability Monitor** — Track Section 1 metrics, gate scaling decisions
4. **Domain Manager** — DNS verification, SPF/DKIM setup, domain health
5. **Webhook Receiver** — Ingest email provider events into signal_event
6. **Reply Router** — Route inbound replies to classification pipeline
