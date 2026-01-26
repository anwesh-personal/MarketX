# Project State

> Current status of the Axiom project. Updated as major milestones are hit.

---

## Project Overview
- **Name**: Axiom
- **Purpose**: Self-healing, multi-tenant marketing intelligence platform
- **Stack**: Next.js 14, Express, PostgreSQL, Redis, BullMQ

---

## Current Status

### ✅ FULLY COMPLETE

| Component | Status | Files/Lines | Notes |
|-----------|--------|-------------|-------|
| **Theme System** | ✅ 100% | 3 themes | Dark/Light mode, CSS variables |
| **Superadmin Sidebar** | ✅ 100% | - | Navigation, routing |
| **Workflow Builder Canvas** | ✅ 100% | ReactFlow | Drag-drop, connect, pan/zoom |
| **V2 Node Definitions** | ✅ 100% | 36 types | All categories covered |
| **Node Configuration Forms** | ✅ 100% | 9,400+ lines | Production forms for all 36 nodes |
| **Shared Types System** | ✅ 100% | 217 lines | types.ts - single source of truth |
| **Workflow CRUD API** | ✅ 100% | - | Save/Load/Delete |
| **AI Provider Management** | ✅ 100% | - | Multi-provider, add/configure |
| **Engine Deployment Service** | ✅ 100% | 427 lines | Deploy, CRUD, stats |
| **AI Service** | ✅ 100% | 550 lines | OpenAI, Anthropic, Google, Perplexity |
| **Workflow Execution Service** | ✅ 100% | 910 lines | Execute, state, handlers |

### 🟡 IN PROGRESS / PARTIAL

| Component | Status | Blocker | Notes |
|-----------|--------|---------|-------|
| **Execution Progress UI** | 🟡 30% | Need WebSocket/SSE | Backend executes, no live feedback |
| **Variable Picker** | 🟡 0% | Phase 4 item | Manual `{{node.field}}` typing |
| **Workers Deployment** | 🟡 Built | Need Redis | 6 workers ready, need infra |
| **KB Libraries** | 🟡 30% | Need schema work | Brand, ICP, Offer partial; others missing |
| **Learning Loop** | 🟡 10% | Need policies | Skeleton exists, needs full implementation |
| **Constitution Validation** | 🟡 Skeleton | Need integration | Tables exist, not wired |

### ❌ NOT STARTED

| Component | Notes | Priority |
|-----------|-------|----------|
| **Production Deployment** | Need VPS/Railway setup | P1 |
| **MailWiz Integration** | External trigger system | P2 |
| **Full Analytics Pipeline** | Aggregation, metrics | P2 |
| **A/B Testing Framework** | Tables exist, no UI | P3 |
| **Undo/Redo** | Workflow builder UX | P4 |
| **Keyboard Shortcuts** | Only Delete works | P4 |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    AXIOM CURRENT STATE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FRONTEND (Next.js 14 - Port 3000)          STATUS: ✅ 90%      │
│  ├── /superadmin/workflow-manager           ✅ COMPLETE         │
│  ├── /superadmin/engines                    ✅ COMPLETE         │
│  ├── /superadmin/ai-providers               ✅ COMPLETE         │
│  ├── /superadmin/brains                     ✅ COMPLETE         │
│  ├── /superadmin/knowledge-bases            ✅ COMPLETE         │
│  ├── /brain-chat                            ✅ COMPLETE         │
│  └── /brain-control                         ✅ COMPLETE         │
│                                                                  │
│  API ROUTES (Next.js API)                   STATUS: ✅ 90%      │
│  ├── /api/superadmin/workflows              ✅ CRUD + Execute   │
│  ├── /api/superadmin/ai-providers           ✅ Provider mgmt    │
│  ├── /api/superadmin/brains                 ✅ Brain CRUD       │
│  ├── /api/brain/*                           ✅ Chat, RAG, etc   │
│  └── /api/engines/*                         ✅ Engine ops       │
│                                                                  │
│  BACKEND (Express - Port 8080)              STATUS: ✅ 85%      │
│  ├── workflowExecutionService.ts            ✅ 910 lines        │
│  ├── engineDeploymentService.ts             ✅ 427 lines        │
│  ├── executionService.ts                    ✅ 320 lines        │
│  ├── aiService.ts                           ✅ 550 lines        │
│  └── queueService.ts                        ✅ 230 lines        │
│                                                                  │
│  DATABASE (Supabase/PostgreSQL)             STATUS: ✅ 90%      │
│  ├── 16 migration files                     ✅ Defined          │
│  ├── workflow_templates                     ✅ Active           │
│  ├── engine_instances                       ✅ Active           │
│  ├── brain_templates                        ✅ 3 seeded         │
│  ├── embeddings (pgvector)                  ✅ Active           │
│  └── engine_run_logs                        ✅ Active           │
│                                                                  │
│  WORKERS (BullMQ)                           STATUS: 🟡 BUILT    │
│  ├── dream-state-worker.ts                  ✅ Built            │
│  ├── fine-tuning-worker.ts                  ✅ Built            │
│  ├── learning-loop-worker.ts                ✅ Built            │
│  ├── analytics-worker.ts                    ✅ Built            │
│  ├── kb-worker.ts                           ✅ Built            │
│  └── REDIS                                  ❌ NOT RUNNING      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Directories

| Directory | Purpose | Lines |
|-----------|---------|-------|
| `apps/frontend/src/components/WorkflowManager/` | Workflow builder | 15,500+ |
| `apps/frontend/src/app/superadmin/` | Superadmin pages | - |
| `apps/frontend/src/services/brain/` | Brain services | 4,100+ |
| `apps/backend/src/services/` | Backend services | 2,500+ |
| `apps/workers/src/` | Worker definitions | - |
| `database/migrations/` | 16 SQL files | - |
| `.agent/Plans/Active/` | Current work items | - |
| `.agent/Sessions/` | Session logs + handovers | - |

---

## Known Issues

| Issue | Impact | Notes |
|-------|--------|-------|
| **Redis Not Running** | Workers can't start | Install + start Redis locally |
| **No Real-time Progress** | UX gap | Execution works, no live feedback |
| **MyFlowsSidebar.tsx** | Technical debt | Orphaned component, unused |
| **AI Provider Required** | Generator nodes fail | Must configure in /superadmin/ai-providers |

---

## Recent Milestones

| Date | Milestone |
|------|-----------|
| 2026-01-26 | ✅ Knowledge system comprehensive review |
| 2026-01-26 | ✅ Workflow Manager V2 - All 36 node configs complete |
| 2026-01-26 | ✅ Full audit + type safety improvements |
| 2026-01-25 | ✅ Theme system polish |
| 2026-01-24 | ✅ Basic workflow execution wiring |
| 2026-01-24 | ✅ Engine deployment architecture planned |
| 2026-01-15 | ✅ Brain system complete (services, API, UI) |
| 2026-01-15 | ✅ Database migrations (20 tables) |

---

## Code Quality Metrics (Workflow Manager)

| Metric | Value |
|--------|-------|
| Total Files | 17 |
| Total Lines | 15,556 |
| CSS Lines | 5,646 |
| TypeScript Errors | 0 |
| `any` Types | 0 |
| TODO Comments | 0 |
| Console.log | 0 |
| **Rating** | **10/10** |

---

*Last Updated: 2026-01-26 19:23 IST*
