# Project State

> Current status of the Axiom project. Updated as major milestones are hit.

---

## Project Overview
- **Name**: Axiom
- **Purpose**: AI-powered workflow engine for content generation
- **Stack**: Next.js 14, Express, PostgreSQL, Redis, BullMQ

---

## Current Status

### ✅ Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Theme System | ✅ Complete | Full dark/light mode, CSS variables |
| Superadmin UI | ✅ Complete | Sidebar, routing, components |
| Workflow Builder Canvas | ✅ Complete | ReactFlow, drag-drop, connect |
| V2 Node Definitions | ✅ Complete | 36 node types |
| Node Configuration Forms | ✅ Complete | All 36 nodes have production forms |
| Workflow CRUD API | ✅ Complete | Save/Load/Delete via API |
| AI Provider Management | ✅ Complete | Add/configure providers |
| Basic Execution | ✅ Complete | Trigger workflow, backend executes |

### 🟡 In Progress

| Feature | Status | Blocker |
|---------|--------|---------|
| Execution Progress UI | 🟡 Partial | Need real-time WebSocket |
| Variable Picker | 🟡 Planned | Phase 4 item |
| Engine Deployment | 🟡 Planned | Needs Redis + Workers |

### ❌ Not Started

| Feature | Notes |
|---------|-------|
| Production Deployment | Infra needed |
| MailWiz Integration | - |
| Feedback Loop | - |
| Undo/Redo | UX enhancement |
| Keyboard Shortcuts | UX enhancement |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    AXIOM ARCHITECTURE                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FRONTEND (Next.js 14 - Port 3000)                      │
│  ├── /superadmin/workflow-manager   ← COMPLETE          │
│  ├── /superadmin/ai-providers       ← COMPLETE          │
│  ├── /superadmin/brains             ← COMPLETE          │
│  └── /superadmin/knowledge-bases    ← COMPLETE          │
│                                                          │
│  API ROUTES (Next.js API)                               │
│  ├── /api/superadmin/workflows      ← CRUD + Execute    │
│  └── /api/superadmin/ai-providers   ← Provider mgmt     │
│                                                          │
│  BACKEND (Express - Port 8080)                          │
│  ├── /api/engines/workflows/:id/execute                 │
│  └── workflowExecutionService.ts    ← 2000+ lines       │
│                                                          │
│  DATABASE (Supabase/PostgreSQL)                         │
│  ├── workflow_templates             ← Flow definitions  │
│  ├── ai_providers                   ← Configured AIs    │
│  ├── knowledge_bases                ← KB data           │
│  └── engine_run_logs                ← Execution logs    │
│                                                          │
│  WORKERS (BullMQ - Not deployed yet)                    │
│  └── Requires Redis                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/frontend/src/components/WorkflowManager/` | Workflow builder (17 files) |
| `apps/frontend/src/app/(superadmin)/` | Superadmin pages |
| `apps/backend/src/services/workflow/` | Execution engine |
| `.agent/Plans/Active/` | Current work items |
| `.agent/Plans/Completed/` | Done plans |
| `.agent/Sessions/` | Session logs + handovers |

---

## Known Issues

1. **Redis Not Running** - Connection spam in logs when Redis not started
2. **No Real-time Progress** - Execution happens but no live feedback
3. **MyFlowsSidebar.tsx** - Orphaned component (unused)

---

## Recent Milestones

| Date | Milestone |
|------|-----------|
| 2026-01-26 | ✅ Workflow Manager V2 - All 36 node configs complete |
| 2026-01-26 | ✅ Full audit + type safety improvements |
| 2026-01-25 | ✅ Theme system polish |
| 2026-01-24 | ✅ Basic workflow execution wiring |

---

*Last Updated: 2026-01-26 18:30 IST*
