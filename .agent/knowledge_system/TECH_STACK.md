# Technology Stack

> Reference for all technologies used in the project.

---

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14 | App Router, SSR, API routes |
| **React** | 18 | UI components |
| **TypeScript** | 5 | Type safety |
| **React Flow** | 11 | Workflow canvas |
| **Lucide React** | Latest | Icon library |
| **CSS Variables** | - | Theming (NO Tailwind in WorkflowManager) |
| **react-hot-toast** | - | Notifications |

### Key Frontend Dirs
```
apps/frontend/src/
├── app/(superadmin)/       # Superadmin pages
├── components/
│   ├── WorkflowManager/    # 17 files, 15k+ lines
│   ├── SuperadminSidebar/  # Navigation
│   └── ThemeToggle/        # Dark/light switch
└── styles/                 # Global styles
```

---

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Express** | 4 | REST API server |
| **TypeScript** | 5 | Type safety |
| **Zod** | 3 | Request validation |
| **Supabase Client** | Latest | Database access |

### Key Backend Dirs
```
apps/backend/src/
├── routes/
│   └── engines.ts          # Workflow execution routes
├── services/
│   ├── workflow/
│   │   └── workflowExecutionService.ts  # 2000+ lines
│   └── ai/
│       └── aiService.ts    # AI provider calls
└── middleware/             # Auth, logging
```

---

## Database

| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database (via Supabase) |
| **Supabase** | Hosted Postgres + Auth + Storage |

### Key Tables
```sql
workflow_templates     -- Workflow definitions (nodes, edges)
ai_providers           -- Configured AI providers
knowledge_bases        -- Organization knowledge bases
engine_run_logs        -- Execution history
brains                 -- Brain configurations
```

---

## Queue System (Not Deployed Yet)

| Technology | Purpose |
|------------|---------|
| **Redis** | Queue backing store |
| **BullMQ** | Job queue library |

### Workers
```
apps/workers/
├── DreamStateWorker.ts
├── FineTuningWorker.ts
└── LearningLoopWorker.ts
```

**Status**: Built but not deployed. Requires Redis.

---

## AI Providers

Configured via `/superadmin/ai-providers`:

| Provider | Models |
|----------|--------|
| OpenAI | gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| Anthropic | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| Google | gemini-pro, gemini-ultra |
| Others | Via custom endpoint |

---

## Development

```bash
# Start everything
cd /Users/anweshrath/Documents/Tommy-Fran/Axiom
npm run dev

# Frontend only
cd apps/frontend && npm run dev

# Backend only
cd apps/backend && npm run dev

# TypeScript check
cd apps/frontend && npx tsc --noEmit
```

---

## Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (Express) | 8080 |
| Redis | 6379 |

---

*Last Updated: 2026-01-26 18:30 IST*
