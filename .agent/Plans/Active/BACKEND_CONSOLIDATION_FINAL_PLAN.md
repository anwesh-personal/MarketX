# Backend → Workers Consolidation Plan (UPDATED)
## Based on Phase 0 Investigation Findings

**Updated**: 2026-01-27 22:26 IST  
**Estimated Effort**: 14-18 hours (increased from investigation)  
**Status**: ⏳ AWAITING FINAL APPROVAL  

---

## 🎯 OBJECTIVE

Consolidate the `apps/backend` Express service into `apps/workers` BullMQ workers on Railway, reducing infrastructure from 3 services to 2 and fixing broken async execution.

---

## 🚨 CRITICAL FINDINGS FROM INVESTIGATION

### Finding 1: Async Execution is BROKEN
**Current State**: 
- Worker calls `${BACKEND_URL}/api/internal/execute-workflow`
- This route **DOES NOT EXIST** in backend
- All async executions fail with 404

**Impact**: Async mode completely broken in production

---

### Finding 2: Queue Naming Mismatch  
**Current State**:
- Backend queues to: `workflow-execute`
- Worker listens to: `workflow-execution`
- **Jobs never processed** due to name mismatch

**Impact**: Even if route existed, queue is wrong

---

### Finding 3: Worker Has No Execution Logic
**Current State**:
- Worker receives job ✅
- Worker calls backend (broken) ❌
- Worker has NO actual execution code ❌

**Impact**: Worker is just a broken proxy, not a real worker

---

### Finding 4: Hardcoded Backend URLs
**Current State**:
- 5 locations with `localhost:8080` hardcoded
- Won't work in production
- Bypasses Next.js API layer

**Impact**: Frontend → Backend tight coupling

---

## 📊 INVESTIGATION DELIVERABLES

✅ **Phase 0 Complete** - 3 analysis documents created:

1. **`.agent/Analysis/backend-audit.md`**
   - 40 backend routes analyzed
   - 10 are duplicates (can delete)
   - 8 need to move to workers
   - 15 need frontend APIs
   - 7 can query DB directly

2. **`.agent/Analysis/frontend-backend-calls.md`**
   - 11 backend endpoints used by frontend
   - 2 critical execution paths identified
   - 6 new API routes needed
   - 10 hours frontend work estimated

3. **`.agent/Analysis/required-queues.md`**
   - All queues already exist ✅
   - Queue naming inconsistency found ❌
   - 2 workers broken/missing ❌

---

## 🛠️ REVISED IMPLEMENTATION PLAN

### PHASE 1: FIX FOUNDATIONS (4 hours)

#### Step 1.1: Fix Queue Naming (30 min)
**Problem**: Backend uses `workflow-execute`, workers use `workflow-execution`

**Files to Change**:
1. `apps/backend/src/services/queue/queueService.ts`
   - Change `WORKFLOW_EXECUTE = 'workflow-execute'`
   - To `WORKFLOW_EXECUTE = 'workflow-execution'`

2. `apps/workers/src/workers/engine-execution-worker.ts`
   - Verify listening to `workflow-execution` queue
   - Update if needed

**Validation**:
- [ ] Backend queues to `workflow-execution`
- [ ] Worker listens to `workflow-execution`
- [ ] Names match exactly

---

#### Step 1.2: Port workflowExecutionService to Workers (3 hours)
**Problem**: Worker has no execution logic

**Source**: `apps/backend/src/services/workflow/workflowExecutionService.ts` (~1000 lines)  
**Target**: `apps/workers/src/processors/workflow-execution-processor.ts` (NEW)

**What to Port**:
```typescript
// Core execution logic
async function executeWorkflow(
    nodes, edges, input, executionId,
    progressCallback, options, context
) {
    // 1. Validate workflow
    // 2. Topological sort
    // 3. Execute nodes in order
    // 4. Handle AI calls
    // 5. Pass data between nodes
    // 6. Track tokens/cost
    // 7. Return result
}
```

**Dependencies to Port**:
- Node execution logic
- Data passing between nodes
- Progress tracking
- Error handling
- Token counting

**Validation**:
- [ ] Processor executes workflows correctly
- [ ] All node types supported
- [ ] Progress updates work
- [ ] Token tracking works
- [ ] Errors handled properly

---

#### Step 1.3: Check/Port AI Service (30 min)
**Question**: Does AI service already exist in workers?

**Check**: 
```bash
find apps/workers -name "*ai*service*"
```

**If exists**: ✅ Done  
**If not**: Port from `apps/backend/src/services/ai/aiService.ts`

**Validation**:
- [ ] AI service callable from worker
- [ ] All providers supported (OpenAI, Anthropic, etc.)
- [ ] API keys loaded correctly

---

#### Step 1.4: Check/Port KB Resolution Service (30 min)
**Check**: Does KB resolution exist in workers?

**Source**: `apps/backend/src/services/kb/kbResolutionService.ts`  
**Target**: `apps/workers/src/utils/kb-resolution-service.ts`

**Validation**:
- [ ] KB loading works
- [ ] Vector search works (if applicable)
- [ ] KB data accessible from nodes

---

### PHASE 2: UPDATE WORKER (3 hours)

#### Step 2.1: Rewrite engine-execution-worker.ts (2 hours)
**Current**: Broken callback to backend  
**Target**: Direct execution using ported processor

**File**: `apps/workers/src/workers/engine-execution-worker.ts`

**New Logic**:
```typescript
async function processEngineExecution(job) {
    const { executionId, engine, input, userId, orgId } = job.data;
    
    // Update status to running
    await updateExecutionStatus(executionId, 'running');
    
    // Get workflow from engine config
    const flowConfig = engine.config.flowConfig;
    
    // Execute directly (no backend callback!)
    const result = await executeWorkflow(
        flowConfig.nodes,
        flowConfig.edges,
        input,
        executionId,
        progressCallback,
        { userId, orgId, tier: engine.tier }
    );
    
    // Update completion
    await updateExecutionStatus(executionId, 
        result.success ? 'completed' : 'failed',
        {
            result: result.lastNodeOutput?.content,
            tokensUsed: result.tokenUsage.totalTokens,
            cost: result.tokenUsage.totalCost,
            error: result.error
        }
    );
    
    return result;
}
```

**Remove**:
- ❌ All `fetch()` calls to backend
- ❌ `BACKEND_URL` references
- ❌ Internal API key stuff

**Add**:
- ✅ Direct workflow execution
- ✅ Supabase client for DB updates
- ✅ Progress pub/sub to Redis

**Validation**:
- [ ] Worker processes jobs
- [ ] No backend calls
- [ ] Execution completes
- [ ] Results stored in DB
- [ ] Progress updates work

---

#### Step 2.2: Add Progress Publishing (1 hour)
**Goal**: Publish progress to Redis for SSE streaming

**New**: `apps/workers/src/utils/progress-publisher.ts`

```typescript
export async function publishProgress(
    executionId: string,
    update: ProgressUpdate
) {
    const redis = getRedisClient();
    await redis.publish(
        `execution:${executionId}:progress`,
        JSON.stringify(update)
    );
}
```

**Integration**: Call from workflow processor on each node completion

**Validation**:
- [ ] Progress publishes to Redis
- [ ] Channel naming correct
- [ ] Data format correct

---

### PHASE 3: FRONTEND MIGRATION (5 hours)

#### Step 3.1: Create Engine Execute API (1.5 hours)
**New**: `apps/frontend/src/app/api/engines/[id]/execute/route.ts`

**Logic**:
```typescript
export async function POST(request, { params }) {
    const { id } = params;
    const { input, options } = await request.json();
    
    // Load engine
    const engine = await getEngine(id);
    
    // Create execution record
    const executionId = await createExecutionRecord(engine, input);
    
    // Queue to worker
    const job = await queues.engineExecution.add('execute', {
        executionId,
        engineId: id,
        engine,
        input,
        options
    });
    
    // Return immediately with job ID
    return NextResponse.json({
        executionId,
        jobId: job.id,
        status: 'queued'
    }, { status: 202 });
}
```

**Validation**:
- [ ] Route accessible
- [ ] Jobs queue correctly
- [ ] Execution record created
- [ ] Job ID returned

---

#### Step 3.2: Create Execution Status API (1 hour)
**New**: `apps/frontend/src/app/api/engines/executions/[id]/route.ts`

**Logic**:
```typescript
export async function GET(request, { params }) {
    const { id } = params;
    
    // Query database
    const execution = await supabase
        .from('engine_run_logs')
        .select('*')
        .eq('id', id)
        .single();
    
    return NextResponse.json({ execution });
}
```

**Validation**:
- [ ] Status retrieval works
- [ ] All statuses returned correctly
- [ ] Results included when complete

---

#### Step 3.3: Create SSE Stream API (1.5 hours)
**New**: `apps/frontend/src/app/api/engines/executions/[id]/stream/route.ts`

**Logic**:
```typescript
export async function GET(request, { params }) {
    const { id } = params;
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const redis = getRedisClient();
            const subscriber = redis.duplicate();
            
            await subscriber.subscribe(`execution:${id}:progress`);
            
            subscriber.on('message', (channel, message) => {
                const data = `data: ${message}\n\n`;
                controller.enqueue(encoder.encode(data));
            });
            
            // Handle completion
            // ...
        }
    });
    
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
```

**Validation**:
- [ ] SSE connection establishes
- [ ] Progress events stream
- [ ] Connection closes properly
- [ ] Errors handled

---

#### Step 3.4: Update Frontend Component (1 hour)
**File**: `apps/frontend/src/app/superadmin/engines/page.tsx`

**Changes**:

**Line 1010** - Replace:
```typescript
// OLD
const response = await fetch(`http://localhost:8080/api/engines/${id}/execute`, ...);

// NEW
const response = await fetch(`/api/engines/${id}/execute`, ...);
const { executionId, jobId } = await response.json();

// Start polling/streaming
const eventSource = new EventSource(`/api/engines/executions/${executionId}/stream`);
eventSource.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // Update UI with progress
};
```

**Remove all hardcoded URLs**:
- Line 1010: `localhost:8080/api/engines/${id}/execute`
- Line 1057: `localhost:8080/api/engines/executions/${id}/stop`
- Line 1096: `localhost:8080/api/keys/assign`

**Replace with**:
- `/api/engines/${id}/execute`
- `/api/engines/executions/${id}/stop`  
- `/api/keys/assign`

**Validation**:
- [ ] No hardcoded URLs remain
- [ ] Execution works via Next.js API
- [ ] Progress updates in real-time
- [ ] Results display correctly

---

### PHASE 4: CLEANUP & DELETE (2 hours)

#### Step 4.1: Delete Backend Routes (30 min)
**Files to Delete/Gut**:
1. `apps/backend/src/routes/engines.ts` - Execution routes
2. `apps/backend/src/services/engine/executionService.ts` - Core logic (moved to worker)
3. `apps/backend/src/services/workflow/workflowExecutionService.ts` - Moved to worker

**Keep** (for now):
- Other routes that aren't duplicated yet
- Can delete in follow-up cleanup

**Validation**:
- [ ] Execution routes removed
- [ ] Backend still starts (for other routes)
- [ ] Frontend doesn't call old routes

---

#### Step 4.2: Remove Environment Variables (15 min)
**Delete from all .env files**:
- `BACKEND_URL`
- `NEXT_PUBLIC_API_URL` (if only used for backend)

**Update Railway config**:
- Remove `BACKEND_URL` from workers
- Remove from frontend

**Validation**:
- [ ] No `BACKEND_URL` in codebase
- [ ] No env references to backend port

---

#### Step 4.3: Update Documentation (1 hour)
**Files to Update**:
- README.md - Remove backend service
- Architecture diagrams
- Deployment docs

**Document**:
- New execution flow
- Queue-based architecture
- SSE streaming setup

**Validation**:
- [ ] Docs accurate
- [ ] No backend references in user-facing docs

---

#### Step 4.4: Delete apps/backend (15 min)
**FINAL STEP**: Only after everything works!

```bash
rm -rf apps/backend
```

**Update**:
- Root package.json (remove backend scripts)
- Railway config (remove backend service)
- Docker configs (if any)

**Validation**:
- [ ] Folder deleted
- [ ] No references in configs
- [ ] Railway shows 1 service (workers only)

---

### PHASE 5: TESTING (4 hours)

#### Step 5.1: Unit Tests (1 hour)
**Test**:
- Workflow processor executes correctly
- Progress publishing works
- Database updates work
- Error handling works

**Commands**:
```bash
cd apps/workers
npm test
```

**Validation**:
- [ ] All worker tests pass
- [ ] No backend dependencies

---

#### Step 5.2: Integration Tests (2 hours)
**Manual Testing**:

1. **Simple Workflow** (2 nodes):
   - Execute via frontend
   - Verify queues to worker
   - Verify execution completes
   - Verify result returns

2. **Complex Workflow** (5+ nodes):
   - Test data passing
   - Test AI node execution
   - Test KB loading
   - Verify progress updates

3. **Concurrent Executions**:
   - Queue 10 jobs simultaneously
   - Verify all complete
   - Verify no race conditions
   - Check database integrity

4. **Error Scenarios**:
   - Invalid input
   - Missing KB
   - AI API failure
   - Verify errors logged
   - Verify status updates

**Validation**:
- [ ] Simple workflows work
- [ ] Complex workflows work
- [ ] Concurrent execution works
- [ ] Errors handled gracefully
- [ ] Progress streams correctly
- [ ] Results accurate

---

#### Step 5.3: Load Tests (1 hour)
**Goal**: Verify system handles production load

**Test Cases**:
1. Queue 50 jobs
2. Monitor worker performance
3. Check memory usage
4. Verify no crashes
5. Check database connections

**Validation**:
- [ ] 50 concurrent jobs complete
- [ ] Workers don't crash
- [ ] Memory stable
- [ ] DB connections stable
- [ ] Performance acceptable (<5s per simple workflow)

---

## 📅 UPDATED TIMELINE

| Phase | Duration | Prerequisites |
|-------|----------|---------------|
| 0. Investigation | **DONE** ✅ | - |
| 1. Fix Foundations | 4 hrs | Phase 0 |
| 2. Update Worker | 3 hrs | Phase 1 |
| 3. Frontend Migration | 5 hrs | Phase 2 |
| 4. Cleanup | 2 hrs | Phase 3 |
| 5. Testing | 4 hrs | Phase 4 |
| **TOTAL** | **18 hrs** | Sequential |

---

## ✅ SUCCESS CRITERIA

The consolidation is complete when:

### Functional:
- [ ] Async execution works (currently broken)
- [ ] Workers execute workflows independently
- [ ] No backend callbacks from workers
- [ ] Frontend uses Next.js API routes only
- [ ] Real-time progress works via SSE
- [ ] 50 concurrent jobs complete successfully

### Technical:
- [ ] Queue naming consistent
- [ ] No `localhost:8080` in codebase
- [ ] No `BACKEND_URL` environment variable
- [ ] `apps/backend` folder deleted
- [ ] Railway shows 1 worker service only
- [ ] Zero TypeScript errors
- [ ] All tests pass

### Documentation:
- [ ] Architecture diagrams updated
- [ ] README accurate
- [ ] Deployment docs updated

---

## 🚨 ROLLBACK PLAN

### If Critical Issues During Testing:

**Option 1: Quick Rollback**
1. `git revert <consolidation-commit>`
2. Re-deploy backend to Railway
3. Restore `BACKEND_URL` env vars
4. Deploy frontend with old URLs
5. **Time**: 15 minutes

**Option 2: Partial Rollback**
1. Keep new worker code
2. Re-enable backend service
3. Add feature flag to choose path
4. Debug in parallel
5. **Time**: 1 hour

**Option 3: Full Forward Fix**
1. Keep changes
2. Fix bugs in workers
3. Don't roll back
4. **Time**: Varies

---

## 💰 COST IMPACT

### Current Monthly Cost:
- Vercel: $20
- Railway Workers: $5-10
- Railway Backend: $5-10
- **Total: $30-40/month**

### After Consolidation:
- Vercel: $20
- Railway Workers: $10-15 (higher load)
- **Total: $30-35/month**
- **Savings: $5-10/month**

---

## ⚠️ RISKS & MITIGATION

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Breaking production workflows | CRITICAL | LOW | Thorough testing, rollback plan |
| Worker overload | HIGH | MEDIUM | Load testing, scaling config |
| Lost executions | CRITICAL | LOW | Queue persistence, retry logic |
| Database connection exhaustion | HIGH | MEDIUM | Connection pooling, limits |
| SSE connection issues | MEDIUM | MEDIUM | Fallback to polling |
| Breaking frontend | HIGH | LOW | Incremental updates, testing |

---

## 📝 FILES CHANGED SUMMARY

### Created (8 files):
1. `apps/workers/src/processors/workflow-execution-processor.ts` (~1000 lines)
2. `apps/workers/src/utils/progress-publisher.ts` (~50 lines)
3. `apps/frontend/src/app/api/engines/[id]/execute/route.ts` (~100 lines)
4. `apps/frontend/src/app/api/engines/executions/[id]/route.ts` (~50 lines)
5. `apps/frontend/src/app/api/engines/executions/[id]/stream/route.ts` (~100 lines)
6. (Possibly) `apps/workers/src/utils/ai-service.ts` (if not exists)
7. (Possibly) `apps/workers/src/utils/kb-resolution-service.ts` (if not exists)

### Modified (5+ files):
1. `apps/backend/src/services/queue/queueService.ts` (queue naming)
2. `apps/workers/src/workers/engine-execution-worker.ts` (complete rewrite)
3. `apps/frontend/src/app/superadmin/engines/page.tsx` (remove hardcoded URLs)
4. `apps/frontend/src/lib/api.ts` (audit/update)
5. Environment files (.env, Railway config)

### Deleted (3+ files):
1. `apps/backend/src/routes/engines.ts`
2. `apps/backend/src/services/engine/executionService.ts`
3. `apps/backend/src/services/workflow/workflowExecutionService.ts`  
4. Eventually: Entire `apps/backend/` folder

---

## 🎯 APPROVAL REQUIRED

**This plan is based on REAL findings, not assumptions.**

**Before proceeding, confirm you understand:**
- [ ] Async execution is currently BROKEN (will be fixed)
- [ ] Queue naming is MISMATCHED (will be fixed)
- [ ] Worker has NO execution logic (will be added)
- [ ] This will take 18 hours of careful work
- [ ] Rollback plan is acceptable
- [ ] Cost savings are worth the effort
- [ ] Risk assessment reviewed

---

## 🚀 EXECUTION RULES

Once approved, I will:

✅ **Follow this plan EXACTLY**  
✅ **No deviations without asking you**  
✅ **Report after each phase completion**  
✅ **Share validation results before proceeding**  
✅ **Stop if any critical blocker found**  
✅ **No band-aids, no shortcuts**  

---

**Awaiting your FINAL APPROVAL to proceed with Phase 1**

---

*Updated Plan Created: 2026-01-27 22:26 IST*  
*Based on: Complete Phase 0 investigation findings*  
*Status: Ready for approval*
