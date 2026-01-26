# Project Context

> Core understanding of the Axiom project - vision, architecture, and requirements.

---

## Vision

**Axiom is a self-healing, multi-tenant marketing intelligence platform.**

Instead of building a simple email writer with hardcoded logic, Axiom is:
- A **complete SaaS platform** that Anwesh controls
- Clients get **user accounts**, not the codebase
- Built to **scale and profit** beyond the initial client
- Architecture allows Anwesh to escape the current situation by building wealth

---

## Stakeholders

| Name | Role | Notes |
|------|------|-------|
| **Tommy** | Business / Money | The client. Has the business needs and funding. |
| **Nino** | Original Developer | Built the original InMarket Traffic (IMT) system. Axiom integrates with his work. |
| **Fran** | Bridge / Connector | Anwesh's friend. Tommy's most trusted. Facilitates communication. |
| **Anwesh** | Lead Developer / Platform Owner | Building AND owning Axiom. Ultimate control. |

---

## Project Identity

- **Project Name**: AXIOM (The Intelligence Layer)
- **Client System**: InMarket Traffic (IMT)
- **Sub-Project**: MarketWriter (content generation component)

---

## Core Philosophy

> **"Writer executes. Analytics observes. KB learns."**

This is NOT an AI content generator. This is a **self-healing marketing infrastructure** with three strictly separated modules:

### The Three Pillars

| Pillar | Role | Responsibility |
|--------|------|----------------|
| **Writer** | Executes | Generates content deterministically from KB rules |
| **Analytics** | Observes | Records performance data (clicks, replies, booked calls) |
| **KB** | Learns | The ONLY place where learning happens |

**Critical Constraint:** Embeddings change KB guidance, not Writer execution.

### The Self-Healing Loop
```
KB Rules → Writer Generates → Content Deployed → Analytics Records
     ↑                                                    ↓
     └── Learning Loop Updates KB (Daily 6 AM) ←─────────┘
```

---

## System Architecture

### High-Level Overview
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AXIOM PLATFORM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    FRONTEND (Next.js 14 - Port 3000)               │ │
│  │  ├── Superadmin Panel (/superadmin/*)                              │ │
│  │  │   ├── Workflow Manager (36 node types, drag-drop)               │ │
│  │  │   ├── Engine Management (deploy, activate, execute)             │ │
│  │  │   ├── Brain Management (RAG, agents, learning)                  │ │
│  │  │   ├── Knowledge Bases (KB CRUD)                                 │ │
│  │  │   └── AI Providers (multi-provider, failover)                   │ │
│  │  ├── Brain Chat (/brain-chat)                                      │ │
│  │  ├── Brain Control (/brain-control)                                │ │
│  │  └── API Routes (/api/*)                                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    BACKEND (Express - Port 8080)                   │ │
│  │  ├── Services                                                      │ │
│  │  │   ├── workflow/workflowExecutionService.ts (2000+ lines)       │ │
│  │  │   ├── engine/engineDeploymentService.ts (427 lines)            │ │
│  │  │   ├── engine/executionService.ts (320 lines)                   │ │
│  │  │   ├── ai/aiService.ts (550 lines, multi-provider)              │ │
│  │  │   └── queue/queueService.ts (BullMQ integration)               │ │
│  │  └── Routes                                                        │ │
│  │      └── engines.ts (CRUD + execute + stats)                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    WORKERS (BullMQ - Not Deployed Yet)             │ │
│  │  ├── dream-state-worker.ts (overnight learning)                   │ │
│  │  ├── fine-tuning-worker.ts (model tuning)                         │ │
│  │  ├── learning-loop-worker.ts (daily 6AM analysis)                 │ │
│  │  ├── analytics-worker.ts (metrics aggregation)                    │ │
│  │  └── kb-worker.ts (document processing)                           │ │
│  │  STATUS: Built, needs Redis to run                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    DATABASE (Supabase/PostgreSQL)                  │ │
│  │  ├── Core Tables                                                   │ │
│  │  │   ├── workflow_templates (flow definitions)                    │ │
│  │  │   ├── engine_instances (deployed engines)                      │ │
│  │  │   ├── engine_run_logs (execution history)                      │ │
│  │  │   ├── knowledge_bases (KB content)                             │ │
│  │  │   └── organizations/users (multi-tenant)                       │ │
│  │  ├── Brain Tables                                                  │ │
│  │  │   ├── brain_templates (Echii, Pulz, Quanta)                    │ │
│  │  │   ├── embeddings (pgvector, 1536-dim)                          │ │
│  │  │   ├── agents (Writer, Analyst, Coach, Generalist)              │ │
│  │  │   └── user_feedback (RLHF)                                     │ │
│  │  └── Analytics Tables                                              │ │
│  │      ├── analytics_events (raw events)                            │ │
│  │      └── aggregated_metrics (pre-computed)                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    REFERENCE: LEKHIKA (Production Pattern)         │ │
│  │  Path: /lekhika_4_8lwy03                                           │ │
│  │  Purpose: Proven architecture to port from                         │ │
│  │  Key Files:                                                        │ │
│  │   ├── vps-worker/services/workflowExecutionService.js (1381 lines)│ │
│  │   ├── vps-worker/services/executionService.js (1443 lines)        │ │
│  │   └── vps-worker/services/aiService.js (28KB)                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## V1 Scope (From Client Requirements)

### What V1 MUST Generate:
1. ✅ **Websites** (multiple pages with structure)
2. ✅ **Email Flows** (sequences)
3. ✅ **Email Replies** (contextual responses)
4. ✅ **Social Content** (LinkedIn, X, YouTube)

### Primary Metric: **BOOKED_CALL**
- This is success!
- ~~Open rate~~ → Ignored! Use **REPLY_RATE** as proxy
- Secondary signals: REPLIES, CLICKS
- Guardrails: BOUNCES, UNSUBSCRIBES, COMPLAINTS

### Learning Loop:
- **Cadence:** Daily at 06:00 (America/New_York timezone)
- **Input Window:** PREVIOUS_CALENDAR_DAY only
- **Method:** KB updates between runs (not real-time)

### V1 Exclusions (Phase 2+):
- ❌ Autonomous optimization
- ❌ Real-time learning
- ❌ Agent coordination systems
- ❌ Predictive scoring
- ❌ Autonomous social posting (generation only)
- ❌ Identity-level personalization

---

## Knowledge Base Schema

The KB contains these libraries (from client requirements):

| Library | Purpose | Status |
|---------|---------|--------|
| Brand | Voice rules, compliance, forbidden claims | 🟡 Partial |
| ICP Library | Segments, pain points, job titles, buying triggers | 🟡 Partial |
| Offer Library | Value props, differentiators, proof points | 🟡 Partial |
| Angles Library | 6 axes: risk, speed, control, loss, upside, identity | ❌ Missing |
| CTAs Library | CTA types, labels, destinations | ❌ Missing |
| Layouts | Page structure templates | ❌ Missing |
| Email Flow Blueprints | Sequence structures, goals | ❌ Missing |
| Subject/First-Line Variants | Email subject templates | ❌ Missing |
| Reply Playbooks | Scenario-based response strategies | ❌ Missing |
| Social Pillars & Blueprints | Platform-specific content rules | ❌ Missing |
| Routing Rules | Navigation logic | ❌ Missing |
| Testing Configuration | A/B testing setup | ❌ Missing |
| Guardrails | Paused patterns, safety rules | ❌ Missing |
| Learning Preferences | What's working, what's not | 🟡 Skeleton |

---

## Multi-Tenant Architecture

### Hierarchy
```
Platform (Anwesh owns)
  └── Organizations (Clients)
       ├── Users (Team members)
       ├── Knowledge Bases
       ├── Engines (deployed workflows)
       ├── Run Logs
       └── Analytics Events
```

### Isolation
- **Row-Level Security (RLS)** on all tables
- Every query automatically scoped to org_id
- API keys isolated per organization
- No cross-tenant data leaks

### Subscription Tiers (Planned)
| Tier | KBs | Runs/Month | Team | Price |
|------|-----|------------|------|-------|
| Free | 1 | 10 | 3 | $0 |
| Starter | 3 | 100 | 10 | $99/mo |
| Pro | 10 | 500 | 25 | $299/mo |
| Enterprise | ∞ | ∞ | ∞ | Custom |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `COMPLETE_CLIENT_REQUIREMENTS.md` | Original 770-line requirements breakdown |
| `database/MULTI_TENANT_ARCHITECTURE.md` | Multi-tenant design |
| `database/WORKER_ARCHITECTURE.md` | Worker system design |
| `.agent/Plans/Active/engine-deployment-architecture.md` | Engine deployment plan |
| `Documentation/AXIOM_BRAIN_ARCHITECTURE.md` | Brain system (1180 lines) |
| `lekhika_4_8lwy03/` | Reference production architecture |

---

*Last Updated: 2026-01-26 19:23 IST*
