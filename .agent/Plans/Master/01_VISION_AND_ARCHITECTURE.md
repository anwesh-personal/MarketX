# 01 — Vision & Architecture

## What MarketX Is

MarketX is a **self-improving acquisition operating system** that manufactures booked calls and revenue for B2B partners through belief-driven outbound email, governed by data, measured by signal, and compounded by learning.

It is NOT:
- A mail merge tool with an LLM
- A generic AI chatbot platform
- A campaign management dashboard
- A CRM

It IS:
- A revenue-share machine that gets smarter with every send, reply, booking, and revenue event
- A multi-tenant system where each partner gets isolated intelligence that compounds locally
- A network that discovers transferable structural truths across partners and promotes them globally

---

## The Three Engines

MarketX operates through three coordinated engines under the platform name **Market Maker**:

### Market Builder (Data & Information Engine)
**Responsibility:** Decide WHO should be contacted and WHEN.
- ICP construction (420 taxonomy segmentation)
- Identity sourcing (Universal Person records)
- Hygiene enforcement (suppression, verification, catch-all exclusion)
- InMarket and SiteVisitor signal integration
- Contact decision governance

### Market Writer (Conversion & Belief Engine)
**Responsibility:** Decide WHAT must happen in the buyer's mind next.
- Brief generation (immutable hypothesis container)
- Belief competition (Champion vs Challenger, always exactly 2 per ICP)
- Angle system (7 starting angles per offer)
- Flow generation (email sequences bound to beliefs)
- Flow extension (progressive refinement, not experimentation)
- Asset production (emails, pages, social posts — all bound to Brief_ID + Belief_ID + ICP_ID)

### Market Surface (Delivery & Distribution Engine)
**Responsibility:** Decide HOW outreach scales without breaking economics.
- Satellite infrastructure (5 TLDs × 10 satellites per partner)
- Send pacing (3,000/satellite/day max, one satellite ramp at a time)
- Deliverability governance (inbox placement, reputation, complaint rate)
- Domain isolation (no shared reputation contamination)

---

## The Signal Engine

Cuts across all three engines. Captures:
- Sends, replies, reply types, clicks, booked calls, show rates, revenue
- All attributable to Belief_ID + ICP_ID
- Weekly confidence score recalculation
- Hybrid gating before any allocation change

---

## The Promotion Engine

Beliefs move through a promotion ladder:
```
HYP → TEST → SW → IW → RW → GW
```
- **HYP** = Hypothesis (initial belief concept)
- **TEST** = In-Test (active traffic allocation)
- **SW** = Segment Winner (durable in one segment)
- **IW** = ICP Winner (transferable across ICPs)
- **RW** = Revenue Winner (cross revenue bands)
- **GW** = Global Winner (platform-wide truth)

Promotion requires: durability + transferability + statistical confidence. Single-run performance does not qualify.

---

## Multi-Tenant Architecture

```
Platform (MarketX)
├── Superadmin
│   ├── Partner management
│   ├── Brain template builder
│   ├── Prompt library
│   ├── Tool registry
│   ├── Workflow builder
│   └── System health dashboards
│
├── Partner Tier (per rev-share partner)
│   ├── Isolated Local KB
│   ├── Dedicated Mastery Agent stack
│   ├── Own ICP, Beliefs, Flows, Signals
│   ├── Own delivery infrastructure
│   └── Partner dashboard (Belief, Angle, Revenue)
│
└── Network Layer
    ├── Candidate Global (review layer)
    ├── Global KB (validated structural truths)
    └── Governance engine (promotion/demotion/revalidation/rollback)
```

### Tenant Isolation via Supabase RLS
- Every table is scoped by `partner_id` (maps to `organizations.id`)
- Row-Level Security enforces isolation at the database level
- Partners cannot see each other's data, beliefs, or learning
- Global KB is read-only for partners; write-only for governance

---

## Service Tiers

| Feature | Basic | Medium | Enterprise |
|---------|-------|--------|------------|
| Brain trained on their data | ✓ | ✓ | ✓ |
| We manage full email flow | ✓ | ✓ | ✓ |
| Lead insights dashboard | Basic metrics | Rich + trends | Full 12-section |
| Chat with your Brain | ✗ | ✓ | ✓ |
| Manual brain training | ✗ | ✓ | ✓ |
| Write/edit emails yourself | ✗ | ✗ | ✓ |
| Feed brain custom data | ✗ | ✗ | ✓ |
| Flow builder access | ✗ | ✗ | ✓ |
| Full Mastery Agent visibility | ✗ | ✗ | ✓ |

---

## The North Star Metric

**Revenue per 1,000 Sends**

This single number proves the whole machine works. It compounds when:
- Beliefs get smarter (better angles win)
- Targeting gets tighter (better ICP fit)
- Delivery stays healthy (inbox placement stable)
- Learning persists (winners compound, losers fade)

Everything in the system exists to improve this number durably.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Database | Supabase (PostgreSQL + RLS) |
| Frontend | Next.js 14 (App Router) |
| Workers | BullMQ on Railway |
| AI Providers | OpenAI, Anthropic, Google (via provider abstraction) |
| Email Delivery | Self-hosted (Mailgun/SES as fallback) |
| Hosting | Vercel (frontend) + Railway (workers) |
| Theme System | 5-variant CSS token system (Obsidian, Aurora, Ember, Arctic, Velvet) |
| Monitoring | Signal Engine + 12-section measurement system |
