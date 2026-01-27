# Backend Service Audit
**Phase 0, Step 0.1 - Investigation**  
**Created**: 2026-01-27 22:15 IST

---

## 📁 BACKEND SERVICE STRUCTURE

### Routes (5 files):
1. `api.ts` - Core API routes (593 lines)
2. `apiKeys.ts` - API key management
3. `auth-superadmin.ts` - Superadmin auth
4. `engines.ts` - Engine CRUD + execution (517+ lines)
5. `superadmin.ts` - Superadmin panel endpoints

### Services (9 files):
1. `ai/aiService.ts` - AI provider integrations
2. `apiKey/apiKeyService.ts` - API key service
3. `content/contentGeneratorService.ts` - Content generation
4. `engine/engineDeploymentService.ts` - Engine deployment
5. `engine/executionService.ts` - Execution logic
6. `kb/kbResolutionService.ts` - KB resolution
7. `queue/queueService.ts` - BullMQ queue management
8. `workflow/workflowExecutionService.ts` - Workflow execution
9. `index.ts` - Service exports

---

## 🔍 ROUTE ANALYSIS

### `api.ts` Routes (17 endpoints):

#### Analytics/Stats (3):
- `GET /api/stats` - Dashboard charts (30 days)
- `GET /api/analytics/variants` - Variant performance
- `POST /api/analytics/event` - Track events

#### Knowledge Base (2):
- `GET /api/kb/active` - Get active KB
- `POST /api/kb/upload` - Upload new KB

#### Runs (2):
- `POST /api/run/manual` - Force trigger run
- `GET /api/runs` - List recent runs

#### Brain System (6):
- `GET /api/brain/status` - Overall status
- `POST /api/brain/dream/trigger` - Manual trigger
- `GET /api/brain/dream/cycles` - Recent cycles
- `GET /api/brain/dream/jobs` - Dream jobs
- `GET /api/brain/healing/patterns` - Error patterns
- `GET /api/brain/analytics` - Analytics summary

#### Brain Templates (4):
- `GET /api/brain/templates` - Available templates
- `POST /api/conversations/:id/push-to-brain` - Push conversation
- `GET /api/brain/:brainId/conversations` - Brain conversations
- `GET /api/brain/:brainId/learning-history` - Learning history

#### Worker Triggers (4):
- `POST /api/workers/dream-state` - Queue dream job
- `POST /api/workers/fine-tuning` - Queue tuning job
- `POST /api/workers/learning-loop` - Queue learning job
- `GET /api/workers/status` - Worker queue status

**Analysis**: Worker trigger endpoints (`/api/workers/*`) are **DUPLICATES** - workers already exist on Railway and have their own API on port 3100.

---

### `engines.ts` Routes (20+ endpoints):

#### Engine CRUD (6):
- `GET /api/engines` - List all engines
- `GET /api/engines/stats` - Engine statistics
- `GET /api/engines/:id` - Get single engine
- `GET /api/engines/:id/stats` - Single engine stats
- `POST /api/engines/deploy` - Deploy new engine
- `PUT /api/engines/:id` - Update engine
- `DELETE /api/engines/:id` - Delete engine
- `POST /api/engines/:id/activate` - Activate engine
- `POST /api/engines/:id/deactivate` - Deactivate engine

#### Workflow CRUD (6):
- `GET /api/engines/workflows` - List workflows
- `GET /api/engines/workflows/:id` - Get workflow
- `POST /api/engines/workflows/deploy` - Deploy workflow
- `PUT /api/engines/workflows/:id` - Update workflow
- `DELETE /api/engines/workflows/:id` - Delete workflow

#### Execution (8+):
- `POST /api/engines/:id/execute` - Execute engine
- `POST /api/engines/workflows/:id/execute` - Execute workflow
- `GET /api/engines/executions` - List executions
- `GET /api/engines/executions/:id` - Get execution
- `GET /api/engines/executions/:id/logs` - Get logs
- `GET /api/engines/executions/:id/stream` - Stream progress (SSE)
- And more...

**Analysis**: These are the CORE routes that need to be migrated. Most execution logic should move to workers.

---

## ❌ DUPLICATE FUNCTIONALITY

### Routes that already exist elsewhere:

1. **Worker Triggers** (`/api/workers/*`)
   - Workers already have their own API on port 3100
   - These backend routes just add to queue
   - **ACTION**: Can be DELETED or moved to frontend

2. **Superadmin Routes** (`auth-superadmin.ts`, `superadmin.ts`)
   - Already implemented in frontend `/api/superadmin/*`
   - **ACTION**: Verify frontend has everything, DELETE from backend

---

## ✅ UNIQUE FUNCTIONALITY (Must be migrated)

### 1. Engine Execution Routes
**Current**: `POST /api/engines/:id/execute`  
**Action**: Move logic to workers, create queue-based frontend API

### 2. Workflow Execution Routes
**Current**: `POST /api/engines/workflows/:id/execute`  
**Action**: Move logic to workers, create queue-based frontend API

### 3. Execution Status/Logs
**Current**: `GET /api/engines/executions/:id/*`  
**Action**: Keep as frontend API, query database directly

### 4. SSE Streaming
**Current**: `GET /api/engines/executions/:id/stream`  
**Action**: Create new frontend SSE endpoint, subscribe to Redis

### 5. Brain System Status
**Current**: `/api/brain/*` endpoints  
**Action**: Query database directly from frontend API

### 6. KB Upload
**Current**: `POST /api/kb/upload`  
**Action**: Move to frontend API + queue KB processing worker

---

## 📋 SERVICES TO MIGRATE

### To Workers Utils:
1. `ai/aiService.ts` → `apps/workers/src/utils/ai-service.ts` (may already exist)
2. `kb/kbResolutionService.ts` → `apps/workers/src/utils/kb-resolution.ts`
3. `content/contentGeneratorService.ts` → `apps/workers/src/utils/content-generator.ts`

### To Frontend APIs:
1. `engine/engineDeploymentService.ts` → Frontend `/api/engines/` routes
2. `workflow/workflowExecutionService.ts` → Part stays frontend, part to workers

### Already Exists:
1. `queue/queueService.ts` - Workers already have queue config

---

## 🎯 MIGRATION STRATEGY

### Phase 1: Duplicate Removal
- DELETE `/api/workers/*` routes (already in workers)
- DELETE superadmin routes (already in frontend)
- **Impact**: None (duplicates)

### Phase 2: Move to Workers
- Port `executionService.ts` to new worker
- Port `workflowExecutionService.ts` logic
- Add new queue types: `ENGINE_EXECUTION`, `WORKFLOW_EXECUTION`

### Phase 3: Frontend APIs
- Create `/api/engines/[id]/execute/route.ts` (queues job)
- Create `/api/engines/executions/[id]/route.ts` (status)
- Create `/api/engines/executions/[id]/stream/route.ts` (SSE)
- Create `/api/workflows/[id]/execute/route.ts`

### Phase 4: Database Direct Access
- Brain status → Query database
- Execution logs → Query database
- Stats → Query database

---

## 📊 SUMMARY

| Category | Count | Action |
|----------|-------|--------|
| **Total Backend Routes** | ~40 | |
| Duplicates (DELETE) | ~10 | Delete entirely |
| Move to Workers | ~8 | Port to worker processors |
| Move to Frontend APIs | ~15 | Create new Next.js routes |
| Database Direct Query | ~7 | Frontend queries DB directly |

---

## ⚠️ CRITICAL FINDING

**The backend is doing TWO things**:
1. **Queue Management** - Queueing jobs to workers
2. **Execution** - Actually running engines/workflows

**Problem**: #2 (Execution) should ALREADY be in workers, but it's not!

**This means**: We need to not just "move" backend to workers, we need to **actually implement** execution in workers properly.

---

## 🚨 BLOCKER IDENTIFIED

Before proceeding, need to answer:
1. Are engines/workflows currently executing via backend or workers?
2. If backend: Why aren't workers handling this?
3. If workers: Why does backend have execution routes?

**RECOMMENDATION**: Pause and verify current execution path before continuing migration.

---

*Phase 0, Step 0.1 Complete - Awaiting direction*
