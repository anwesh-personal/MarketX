# Technology Stack

> Complete reference for all technologies used in Axiom.

---

## Core Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14 | App Router, SSR, API routes |
| **React** | 18 | UI components |
| **TypeScript** | 5 | Type safety |
| **React Flow** | 11 | Workflow canvas (drag-drop, connect) |
| **Lucide React** | Latest | Icon library |
| **CSS Variables** | - | Theming (NO Tailwind in WorkflowManager) |
| **react-hot-toast** | - | Notifications |
| **react-markdown** | - | Markdown rendering in chat |
| **react-syntax-highlighter** | - | Code blocks in chat |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Express** | 4 | REST API server |
| **TypeScript** | 5 | Type safety |
| **Zod** | 3 | Request validation |
| **Supabase Client** | Latest | Database access |

### Database
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database (via Supabase) |
| **Supabase** | Hosted Postgres + Auth + Storage |
| **pgvector** | Vector embeddings (1536-dim) |
| **RLS** | Row-Level Security for multi-tenancy |

### Queue System
| Technology | Purpose | Status |
|------------|---------|--------|
| **Redis** | Queue backing store | ❌ Not running locally |
| **BullMQ** | Job queue library | ✅ Configured |

### AI Providers (Configured)
| Provider | Models | Status |
|----------|--------|--------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-4-turbo | ✅ Active |
| **Anthropic** | Claude 3.5 Sonnet, Opus, Haiku | ✅ Active |
| **Google** | Gemini 1.5 Pro, Flash | ✅ Active |
| **Perplexity** | Sonar Large | ✅ Active |

---

## Directory Structure

### Frontend (`apps/frontend/src/`)
```
apps/frontend/src/
├── app/
│   ├── (main)/                    # Main app routes
│   │   ├── brain-chat/            # Chat interface
│   │   └── brain-control/         # Brain control center
│   ├── api/                       # API routes (55+ files)
│   │   ├── brain/                 # Brain APIs
│   │   ├── superadmin/            # Superadmin APIs
│   │   └── engines/               # Engine APIs
│   ├── login/                     # Auth pages
│   └── superadmin/                # Superadmin pages (15 dirs)
│       ├── workflow-manager/      # ✅ Complete
│       ├── engines/               # ✅ Complete
│       ├── ai-providers/          # ✅ Complete
│       ├── brains/                # ✅ Complete
│       └── knowledge-bases/       # ✅ Complete
├── components/
│   ├── WorkflowManager/           # 17 files, 15k+ lines
│   │   ├── WorkflowManager.tsx    # Main component
│   │   ├── V2WorkflowNode.tsx     # Node renderer
│   │   ├── NodePalette.tsx        # Node picker
│   │   ├── types.ts               # Shared types
│   │   ├── *Config.tsx            # 8 config components
│   │   └── workflow-manager.css   # 5,600+ lines
│   ├── SuperadminSidebar/         # Navigation
│   └── ThemeToggle/               # Dark/light switch
├── services/
│   └── brain/                     # Brain services (4,100+ lines)
│       ├── BrainConfigService.ts
│       ├── VectorStore.ts
│       ├── RAGOrchestrator.ts
│       └── agents/
└── styles/                        # Global styles
```

### Backend (`apps/backend/src/`)
```
apps/backend/src/
├── index.ts                       # Entry point (4,868 bytes)
├── config/                        # Configuration
├── core/                          # Core modules (17 files)
├── db/                            # Database client
├── middleware/                    # Auth, logging
├── routes/
│   ├── engines.ts                 # Engine routes (290 lines)
│   └── ...                        # Other routes
├── schemas/                       # Zod schemas (7 files)
├── seed/                          # Seed data (11 files)
├── services/
│   ├── ai/
│   │   └── aiService.ts           # 550 lines, multi-provider
│   ├── engine/
│   │   ├── engineDeploymentService.ts  # 427 lines
│   │   └── executionService.ts    # 320 lines
│   ├── workflow/
│   │   └── workflowExecutionService.ts # 910 lines
│   ├── queue/
│   │   └── queueService.ts        # 230 lines
│   ├── kb/
│   └── apiKey/
└── utils/
```

### Workers (`apps/workers/src/`)
```
apps/workers/src/
├── index.ts                       # Entry point
├── config/                        # Worker config
├── processors/                    # Job processors
├── utils/                         # Utilities
└── workers/                       # Worker definitions
    ├── dream-state-worker.ts
    ├── fine-tuning-worker.ts
    ├── learning-loop-worker.ts
    ├── analytics-worker.ts
    ├── kb-worker.ts
    └── conversation-worker.ts
```

### Database (`database/`)
```
database/
├── migrations/                    # 16 SQL files
│   ├── 000_brain_system_complete.sql
│   ├── 000_platform_admins.sql
│   ├── 001_brain_system.sql
│   ├── 002_vector_system.sql
│   ├── 003_rag_system.sql
│   ├── 004_agent_system.sql
│   ├── 005_worker_system.sql
│   ├── 006_ai_provider_system.sql
│   ├── 007_worker_management.sql
│   ├── 008_default_brain_templates.sql
│   ├── 009_vps_server_management.sql
│   ├── 010_worker_templates_seed.sql
│   ├── 011_brain_missing_tables.sql
│   ├── 012_agent_specific_memory.sql
│   ├── workflow-engine-tables.sql      # 35KB
│   └── workflow-v2-templates.sql       # 17KB
├── MULTI_TENANT_ARCHITECTURE.md
├── WORKER_ARCHITECTURE.md
├── SUPABASE_SETUP.md
└── init.sql                       # Initial schema
```

### Reference: Lekhika (`lekhika_4_8lwy03/`)
```
lekhika_4_8lwy03/
├── src/                           # Frontend (370 files)
├── vps-worker/                    # Backend worker (89 files)
│   └── services/
│       ├── executionService.js    # 1,443 lines
│       ├── workflowExecutionService.js # 1,381 lines
│       ├── aiService.js           # 28KB
│       └── workflow/handlers/     # Node handlers
└── supabase/                      # Migrations (87 files)
```

---

## Development Commands

```bash
# Start everything (from repo root)
cd /Users/anweshrath/Documents/Tommy-Fran/Axiom
npm run dev

# Frontend only
cd apps/frontend && npm run dev

# Backend only
cd apps/backend && npm run dev

# TypeScript check (frontend)
cd apps/frontend && npx tsc --noEmit

# TypeScript check (backend)
cd apps/backend && npx tsc --noEmit
```

---

## Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (Express) | 8080 |
| Redis | 6379 |

---

## Environment Variables

### Required for Backend
```bash
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_KEY="..."

# AI Providers (at least one)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_KEY="..."
```

### Required for Workers
```bash
REDIS_URL="redis://localhost:6379"
# Plus all above
```

---

## Key Patterns

### 1. No Tailwind in WorkflowManager
- Use CSS variables only
- Theme-aware via `var(--color-name)`
- All styles in `workflow-manager.css`

### 2. Callback Pattern for Node Communication
- Parent passes `onConfigure` callback via node data
- Node calls callback when clicked
- No CustomEvent, no global state

### 3. Types from Single Source
- All types in `types.ts`
- Import from there, never duplicate

### 4. Multi-Provider AI Service
- Single `aiService.call()` method
- Provider selected at runtime
- Fallback logic built-in
- Token tracking per call

---

*Last Updated: 2026-01-26 19:23 IST*
