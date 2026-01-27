# Frontend → Backend Dependencies Analysis
**Phase 0, Step 0.2 - Frontend Integration Mapping**  
**Created**: 2026-01-27 22:24 IST

---

## 📍 BACKEND CALLS FROM FRONTEND

### Direct Backend Calls (Hardcoded):

#### 1. `/lib/api.ts` - Centralized API Client
**Base URL**: `http://localhost:8080/api`

**Endpoints Used**:
- `GET /stats` - Dashboard statistics
- `GET /kb/active` - Get active KB
- `POST /kb/upload` - Upload new KB
- `POST /run/manual` - Trigger manual run
- `GET /runs` - Fetch recent runs
- `GET /analytics/variants` - Variant performance
- `POST /analytics/event` - Track events

**Usage**: Legacy "Market Writer" functionality (seems old)

---

#### 2. `/app/superadmin/engines/page.tsx` - Engine Management
**Hardcoded URLs**:

**Line 1010**: Execute engine
```typescript
const response = await fetch(`http://localhost:8080/api/engines/${selectedEngine.id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        input: testInput,
        options: { executionMode: 'sync' }
    })
});
```

**Line 1057**: Stop execution
```typescript
await fetch(`http://localhost:8080/api/engines/executions/${executionState.executionId}/stop`, {
    method: 'POST'
});
```

**Line 1096**: Assign API key
```typescript
const keyResponse = await fetch('http://localhost:8080/api/keys/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyId: keyId })
});
```

---

#### 3. `/app/api/superadmin/workflows/[id]/execute/route.ts` - Workflow Proxy
**Line 17**: Backend URL definition
```typescript
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
```

**Line 59**: Proxies to backend
```typescript
const backendResponse = await fetch(`${BACKEND_URL}/api/engines/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        input: body.input,
        options: {
            executionMode: 'sync',
            tier: 'hobby'
        }
    })
});
```

---

## 📊 BACKEND ENDPOINTS USED BY FRONTEND

| Endpoint | Method | Usage | Frontend Location | Critical? |
|----------|--------|-------|-------------------|-----------|
| `/api/stats` | GET | Dashboard stats | lib/api.ts | ⚠️ Legacy |
| `/api/kb/active` | GET | Get active KB | lib/api.ts | ⚠️ Legacy |
| `/api/kb/upload` | POST | Upload KB | lib/api.ts | ⚠️ Legacy |
| `/api/run/manual` | POST | Trigger run | lib/api.ts | ⚠️ Legacy |
| `/api/runs` | GET | List runs | lib/api.ts | ⚠️ Legacy |
| `/api/analytics/variants` | GET | Analytics | lib/api.ts | ⚠️ Legacy |
| `/api/analytics/event` | POST | Track event | lib/api.ts | ⚠️ Legacy |
| `/api/engines/:id/execute` | POST | **Execute engine** | superadmin/engines | ✅ **CRITICAL** |
| `/api/engines/executions/:id/stop` | POST | Stop execution | superadmin/engines | ⚠️ Nice-to-have |
| `/api/keys/assign` | POST | Assign key | superadmin/engines | ❓ Unknown |
| `/api/engines/workflows/:id/execute` | POST | **Execute workflow** | api/superadmin/workflows | ✅ **CRITICAL** |

---

## 🎯 CRITICAL PATHS TO MIGRATE

### Path 1: Engine Execution (MOST CRITICAL)
**Current Flow**:
```
Frontend (superadmin/engines/page.tsx)
  → Direct fetch to localhost:8080/api/engines/:id/execute
  → Backend executionService 
  → Returns result synchronously
```

**Target Flow**:
```
Frontend (superadmin/engines/page.tsx)
  → POST /api/engines/[id]/execute/route.ts (NEW)
  → Queue job to worker
  → Return job ID
  → Poll /api/engines/executions/[id]/route.ts (NEW)
  → Worker executes, updates DB
  → Frontend gets result
```

---

### Path 2: Workflow Execution (CRITICAL)
**Current Flow**:
```
Frontend component
  → POST /api/superadmin/workflows/[id]/execute/route.ts
  → Proxies to backend localhost:8080/api/engines/workflows/:id/execute
  → Backend executes
  → Returns result
```

**Target Flow**:
```
Frontend component
  → POST /api/workflows/[id]/execute/route.ts (UPDATED)
  → Queue job to worker
  → Return job ID
  → Poll status
  → Worker executes, updates DB
  → Frontend gets result
```

---

### Path 3: Legacy API Calls (LOW PRIORITY)
**Current**: `/lib/api.ts` calls various backend endpoints

**Options**:
1. Port to frontend API routes (query DB directly)
2. Delete if unused (check usage first)
3. Leave for now (not blocking consolidation)

**Recommendation**: Audit usage, likely can delete or port to frontend

---

## ⚠️ HARDCODED URLs PROBLEM

**Issue**: Frontend has hardcoded `localhost:8080` URLs

**Locations**:
1. `/lib/api.ts` - Line 6
2. `/app/superadmin/engines/page.tsx` - Lines 1010, 1057, 1096
3. `/app/api/superadmin/workflows/[id]/execute/route.ts` - Line 17

**Problem**:
- Won't work in production
- Bypasses Next.js API routes
- Direct backend dependency

**Solution** (during migration):
1. Replace with Next.js API routes
2. API routes queue to workers
3. Remove all `localhost:8080` references

---

## 📋 FRONTEND CHANGES REQUIRED

### New API Routes to Create:

1. **`/app/api/engines/[id]/execute/route.ts`**
   - Replaces direct backend call
   - Queues job to `ENGINE_EXECUTION` queue
   - Returns job ID

2. **`/app/api/engines/executions/[id]/route.ts`**
   - Get execution status
   - Query `engine_run_logs` table

3. **`/app/api/engines/executions/[id]/stream/route.ts`**
   - SSE stream for real-time updates
   - Subscribe to Redis pub/sub

4. **`/app/api/workflows/[id]/execute/route.ts`** (update existing)
   - Remove backend proxy
   - Queue directly to worker
   - Return job ID

5. **`/app/api/kb/upload/route.ts`** (optional)
   - Port KB upload endpoint
   - Queue to KB worker

---

### Frontend Component Updates:

1. **`/app/superadmin/engines/page.tsx`**
   - **Line 1010**: Replace hardcoded URL with `/api/engines/${id}/execute`
   - **Line 1057**: Replace with `/api/engines/executions/${id}/stop`
   - **Line 1096**: Replace with `/api/keys/assign` (or delete if unused)
   - Add polling logic for async execution
   - Add SSE connection for real-time updates

2. **`/lib/api.ts`**
   - Audit all functions
   - Replace with Next.js API routes OR delete if unused

---

## 🔍 ENVIRONMENT VARIABLES

**Current**:
- `BACKEND_URL` - Points to Express backend (localhost:8080 or Railway)
- `NEXT_PUBLIC_API_URL` - Also points to backend

**After Migration**:
- ❌ DELETE `BACKEND_URL`
- ❌ DELETE `NEXT_PUBLIC_API_URL`
- ✅ All API calls go through Next.js routes

---

## 📊 MIGRATION IMPACT SUMMARY

| Component | Change Required | Effort | Risk |
|-----------|----------------|--------|------|
| `/api/engines/[id]/execute/route.ts` | CREATE | 2 hrs | Medium |
| `/api/engines/executions/[id]/route.ts` | CREATE | 1 hr | Low |
| `/api/engines/executions/[id]/stream/route.ts` | CREATE | 2 hrs | Medium |
| `/api/workflows/[id]/execute/route.ts` | UPDATE | 1 hr | Low |
| `/app/superadmin/engines/page.tsx` | UPDATE | 2 hrs | High |
| `/lib/api.ts` | AUDIT + DELETE/PORT | 2 hrs | Low |

**Total**: ~10 hours frontend work

---

## ✅ VALIDATION CRITERIA

After migration, verify:
- [ ] No `localhost:8080` references in codebase
- [ ] No `BACKEND_URL` environment variable used
- [ ] All engine executions go through Next.js routes
- [ ] Polling/SSE works for async status
- [ ] Workers process jobs from queue
- [ ] Frontend gets results correctly

---

*Phase 0, Step 0.2 Complete*
