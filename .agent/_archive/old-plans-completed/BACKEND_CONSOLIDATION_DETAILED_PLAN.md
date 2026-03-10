# Backend → Workers Consolidation Plan
## DETAILED IMPLEMENTATION PLAN - REQUIRES APPROVAL

**Created**: 2026-01-27 22:12 IST  
**Estimated Effort**: 12-16 hours  
**Status**: ⏳ AWAITING APPROVAL  

---

## 🎯 OBJECTIVE

Consolidate the separate `apps/backend` service into the existing `apps/workers` service on Railway, reducing infrastructure from 3 services to 2.

### Current State:
```
Vercel (Frontend) ──┐
                    ├──→ Supabase (Database)
Railway (Backend) ──┤
Railway (Workers) ──┘
```

### Target State:
```
Vercel (Frontend) ──┐
                    ├──→ Supabase (Database)
Railway (Workers) ──┘
  ↑ (contains all execution logic)
```

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting, verify:
- [ ] Workers are running on Railway
- [ ] Backend is running on Railway
- [ ] Frontend is on Vercel
- [ ] Database backup exists
- [ ] Can roll back if needed

---

## 🔍 PHASE 0: INVESTIGATION (2 hours)

### Step 0.1: Audit Backend Service
**Goal**: Understand what the backend actually does

**Tasks**:
1. List all routes in `apps/backend/src/routes/`
2. List all services in `apps/backend/src/services/`
3. Map each route to its dependencies
4. Identify which are duplicates of worker functionality
5. Identify which are truly unique

**Expected Output**: A markdown file listing:
- All backend endpoints
- Which can be deleted (already in workers)
- Which need to be moved
- Which need to be refactored

**Deliverable**: `.agent/Analysis/backend-audit.md`

---

### Step 0.2: Map Frontend Dependencies
**Goal**: Find all frontend code calling the backend

**Tasks**:
1. Grep for `BACKEND_URL` in frontend
2. Grep for `/api/backend/` in frontend
3. List all components making backend calls
4. Document expected request/response formats

**Expected Output**: A list of all frontend→backend integrations

**Deliverable**: `.agent/Analysis/frontend-backend-calls.md`

---

### Step 0.3: Identify Queue Gaps
**Goal**: Determine what new queues are needed

**Tasks**:
1. Review current queues in `apps/workers/src/config/queues.ts`
2. Compare against backend routes
3. Identify missing queue types

**Expected Output**: List of new queues to create

**Deliverable**: `.agent/Analysis/required-queues.md`

---

## 🛠️ PHASE 1: PREPARATION (3 hours)

### Step 1.1: Create New Queue Definitions
**File**: `apps/workers/src/config/queues.ts`

**Tasks**:
1. Add `WORKFLOW_EXECUTION` queue (if not exists)
2. Add `ENGINE_EXECUTION` queue (if not exists)  
3. Add `SCHEDULED_TASK` queue (if not exists)
4. Define job interfaces for each

**Validation**:
- [ ] Queue names follow naming convention
- [ ] Job interfaces are typed
- [ ] No duplicate queue names

---

### Step 1.2: Port Shared Services
**Goal**: Move reusable backend services to workers

**Files to Move**:
- `apps/backend/src/services/ai/aiService.ts` → `apps/workers/src/utils/ai-service.ts`
- `apps/backend/src/services/kb/kbResolutionService.ts` → `apps/workers/src/utils/kb-resolution.ts`

**Tasks**:
1. Copy files to workers
2. Update import paths
3. Remove Express dependencies
4. Make database connections use pool instead of single client

**Validation**:
- [ ] Services work standalone (no Express)
- [ ] Database connections use proper pooling
- [ ] All imports resolve

---

### Step 1.3: Create Worker Processors
**Goal**: Create new worker files for backend functionality

**New Files**:
1. `apps/workers/src/workers/workflow-execution-worker.ts` (if not exists)
2. `apps/workers/src/workers/engine-execution-worker.ts` (if not exists)

**Tasks**:
1. Port workflow execution logic from backend
2. Port engine execution logic from backend
3. Wrap in BullMQ worker pattern
4. Add proper error handling
5. Add progress reporting

**Validation**:
- [ ] Workers follow existing patterns
- [ ] Error handling is robust
- [ ] Progress updates work
- [ ] Results stored in database

---

## 🔄 PHASE 2: FRONTEND MIGRATION (4 hours)

### Step 2.1: Create Queue API Routes
**Goal**: Replace backend HTTP endpoints with queue-based endpoints

**New Files**:
- `apps/frontend/src/app/api/workflows/[id]/execute/route.ts`
- `apps/frontend/src/app/api/engines/[id]/execute/route.ts`
- `apps/frontend/src/app/api/executions/[id]/route.ts` (status check)
- `apps/frontend/src/app/api/executions/[id]/stream/route.ts` (SSE)

**Tasks**:
1. Create route that queues job to BullMQ
2. Return job ID immediately (202 Accepted)
3. Create status endpoint for polling
4. Create stream endpoint for real-time updates

**Validation**:
- [ ] Routes queue jobs correctly
- [ ] Job IDs are returned
- [ ] Status endpoint works
- [ ] Stream endpoint sends SSE

---

### Step 2.2: Update Frontend Components
**Goal**: Change frontend to use new queue-based APIs

**Files to Update**:
- All components calling `${BACKEND_URL}/api/...`
- Replace with `/api/workflows/...` or `/api/engines/...`

**Tasks**:
1. Find all backend API calls
2. Replace with new queue-based calls
3. Update to handle async responses (job IDs)
4. Add polling or SSE for status updates

**Validation**:
- [ ] All backend calls replaced
- [ ] No more `BACKEND_URL` references
- [ ] UI handles async properly
- [ ] Loading states work

---

### Step 2.3: Add Real-Time Progress
**Goal**: Use Redis pub/sub for execution progress

**Tasks**:
1. Workers publish progress to Redis channel
2. Create SSE endpoint in frontend
3. Frontend subscribes via EventSource
4. UI updates in real-time

**Validation**:
- [ ] Progress events publish correctly
- [ ] SSE endpoint streams events
- [ ] Frontend receives updates
- [ ] UI updates smoothly

---

## ⏰ PHASE 3: SCHEDULED TASKS (2 hours)

### Step 3.1: Replace node-cron with Railway Cron
**Goal**: Move scheduled tasks from backend to Railway

**Tasks**:
1. Document all cron jobs in backend
2. Create Railway cron scripts in workers
3. Configure Railway cron schedule
4. Test cron triggers

**New Files**:
- `apps/workers/src/cron/learning-loop.ts`
- `apps/workers/src/cron/cleanup.ts`
- `apps/workers/src/cron/health-check.ts`

**Railway Cron Config**:
```
Schedule: 0 11 * * * (6 AM EST)
Command: npm run cron:learning-loop

Schedule: 0 8 * * * (3 AM EST)
Command: npm run cron:cleanup

Schedule: */15 * * * * (Every 15 min)
Command: npm run cron:health-check
```

**Validation**:
- [ ] All cron tasks identified
- [ ] Scripts created
- [ ] Railway configured
- [ ] Crons trigger correctly

---

## 🗑️ PHASE 4: CLEANUP (2 hours)

### Step 4.1: Remove Backend References
**Goal**: Remove all backend-related code and config

**Tasks**:
1. Delete `apps/backend/` folder entirely
2. Remove `BACKEND_URL` from `.env` files
3. Remove backend scripts from `package.json`
4. Update Railway config (remove backend service)
5. Update documentation

**Validation**:
- [ ] Backend folder deleted
- [ ] No BACKEND_URL in codebase
- [ ] Scripts updated
- [ ] Railway only has workers service
- [ ] Docs updated

---

### Step 4.2: Update Worker Index
**Goal**: Ensure all workers start properly

**File**: `apps/workers/src/index.ts`

**Tasks**:
1. Import all workers (including new ones)
2. Start all workers
3. Update banner/console output
4. Ensure graceful shutdown works

**Validation**:
- [ ] All workers listed
- [ ] All workers start
- [ ] Console output accurate
- [ ] Shutdown works

---

## ✅ PHASE 5: TESTING (3 hours)

### Step 5.1: Unit Tests
**Tasks**:
1. Test each worker individually
2. Test queue job processing
3. Test utilities/services
4. Verify error handling

**Validation**:
- [ ] All workers process jobs
- [ ] Errors are caught
- [ ] Results stored correctly

---

### Step 5.2: Integration Tests
**Tasks**:
1. Execute workflow end-to-end
2. Execute engine end-to-end
3. Test cron jobs
4. Test real-time progress
5. Test concurrent executions (10+)

**Validation**:
- [ ] Workflows execute successfully
- [ ] Engines execute successfully
- [ ] Crons trigger on schedule
- [ ] Progress updates in real-time
- [ ] Concurrent jobs work

---

### Step 5.3: Load Tests
**Tasks**:
1. Queue 100 jobs simultaneously
2. Monitor worker performance
3. Check database connections
4. Verify no crashes

**Validation**:
- [ ] 100 jobs complete successfully
- [ ] No worker crashes
- [ ] DB connections stable
- [ ] Performance acceptable

---

## 📊 SUCCESS CRITERIA

The consolidation is complete when:
- [ ] Backend service deleted from Railway
- [ ] All backend functionality works via workers
- [ ] Frontend uses queue-based APIs
- [ ] Cron jobs run on schedule
- [ ] Real-time progress works
- [ ] Load tests pass (100 concurrent jobs)
- [ ] Zero TypeScript errors
- [ ] Zero runtime errors in production

---

## 🚨 ROLLBACK PLAN

If anything breaks:

### Immediate Rollback:
1. Revert git commit
2. Re-deploy backend to Railway
3. Update frontend env to use BACKEND_URL
4. Deploy frontend fix

### Partial Rollback:
1. Keep new workers
2. Re-enable backend service
3. Use feature flag to choose execution path

---

## 📅 TIMELINE

| Phase | Duration | Prerequisites |
|-------|----------|---------------|
| 0. Investigation | 2 hrs | None |
| 1. Preparation | 3 hrs | Phase 0 |
| 2. Frontend Migration | 4 hrs | Phase 1 |
| 3. Scheduled Tasks | 2 hrs | Phase 1 |
| 4. Cleanup | 2 hrs | Phases 2-3 |
| 5. Testing | 3 hrs | Phase 4 |
| **TOTAL** | **16 hrs** | Sequential |

---

## 💰 COST SAVINGS

### Current:
- Vercel: $20/mo
- Railway Workers: $5-10/mo
- Railway Backend: $5-10/mo
- **Total: $30-40/mo**

### After Consolidation:
- Vercel: $20/mo
- Railway Workers: $5-15/mo (slightly higher usage)
- **Total: $25-35/mo**
- **Savings: $5-10/mo**

---

## 🎯 END STATE VALIDATION

After completion, verify:
1. ✅ `apps/backend/` folder does not exist
2. ✅ No `BACKEND_URL` in codebase
3. ✅ Railway dashboard shows 1 service (workers only)
4. ✅ All workflows execute successfully
5. ✅ All engines execute successfully
6. ✅ Cron jobs run on schedule
7. ✅ Real-time progress works
8. ✅ 100 concurrent jobs complete
9. ✅ TypeScript compiles clean
10. ✅ No runtime errors in logs

---

## ⚠️ RISK ASSESSMENT

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking workflows | HIGH | Thorough testing, rollback plan |
| Lost scheduled tasks | MEDIUM | Document all crons, verify Railway setup |
| Frontend breaks | HIGH | Update incrementally, feature flags |
| Database overload | MEDIUM | Connection pooling, load testing |
| Worker crashes | MEDIUM | Error handling, graceful shutdown |

---

## 📝 APPROVAL REQUIRED

**Before proceeding, confirm:**
- [ ] Database backup exists and is verified
- [ ] Rollback plan is acceptable
- [ ] Timeline is acceptable (16 hours)
- [ ] Risk assessment reviewed
- [ ] Cost savings are worth the effort

**Approved by**: ________________  
**Date**: ________________

---

*Plan created: 2026-01-27 22:12 IST*  
*Status: AWAITING YOUR APPROVAL TO PROCEED*

---

## 🚀 NEXT STEPS AFTER APPROVAL

1. You approve this plan
2. I execute Phase 0 (Investigation)
3. I share findings with you
4. You approve Phase 1
5. I proceed sequentially through all phases
6. I report completion of each phase
7. I verify all success criteria
8. Done!

**NO DEVIATIONS FROM THIS PLAN UNLESS APPROVED BY YOU**
