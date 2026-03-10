# Required Queues Analysis
**Phase 0, Step 0.3 - Queue Gap Identification**  
**Created**: 2026-01-27 22:25 IST

---

## ✅ EXISTING QUEUES (in workers/src/config/queues.ts)

| Queue Name | Status | Worker Exists | Purpose |
|------------|--------|---------------|---------|
| `kb-processing` | ✅ EXISTS | ✅ YES | KB worker |
| `conversation-summary` | ✅ EXISTS | ✅ YES | Conversation worker |
| `analytics` | ✅ EXISTS | ✅ YES | Analytics worker |
| `learning-loop` | ✅ EXISTS | ✅ YES | Brain learning loop |
| `dream-state` | ✅ EXISTS | ✅ YES | Brain dream state |
| `fine-tuning` | ✅ EXISTS | ✅ YES | Brain fine-tuning |
| `workflow-execution` | ✅ EXISTS | ❌ **NO WORKER** | **MISSING** |
| `engine-execution` | ✅ EXISTS | ⚠️ **BROKEN WORKER** | **NEEDS FIX** |
| `scheduled-task` | ✅ EXISTS | ❌ **NO WORKER** | **MISSING** |

---

## 🚨 CRITICAL FINDINGS

### 1. `engine-execution` Queue
**Status**: ❌ **BROKEN**

**Queue**: Exists (line 152 in queues.ts)  
**Worker**: Exists BUT calls back to non-existent backend route  
**Problem**: Worker has no actual execution logic

**Current Worker** (`engine-execution-worker.ts`):
- Receives job from queue ✅
- Calls `${BACKEND_URL}/api/internal/execute-workflow` ❌ (doesn't exist)
- Fails with 404 ❌

**What Needs to Happen**:
- Port `workflowExecutionService.ts` from backend to worker
- Worker executes workflow directly
- Worker updates database directly
- Remove backend callback

---

### 2. `workflow-execution` Queue
**Status**: ❌ **NO WORKER**

**Queue**: Exists (line 143 in queues.ts)  
**Worker**: **DOES NOT EXIST**  
**Problem**: Queue defined but nothing processes it

**Possible Confusion**:
- There's `engine-execution` worker
- There's `workflow-execution-worker.ts` in workers folder
- But `workflow-execution-worker.ts` doesn't listen to `workflow-execution` queue

**What Needs to Happen**:
- Either consolidate into single execution worker
- Or create separate workflow execution worker
- Ensure queue + worker are properly connected

---

### 3. `scheduled-task` Queue
**Status**: ❌ **NO WORKER**

**Queue**: Exists (line 161 in queues.ts)  
**Worker**: **DOES NOT EXIST**  
**Usage**: Not currently used anywhere

**Options**:
- Create worker for scheduled tasks
- OR remove queue if not needed
- OR defer to Phase 3 (cron jobs)

**Recommendation**: Defer to Phase 3 (Railway cron)

---

## 📋 QUEUE NAMING CONFUSION

**Current Situation**:
- Queue: `workflow-execute` (used by backend queueService)
- Queue: `workflow-execution` (defined in worker queues.ts)
- Queue: `engine-execution` (defined in worker queues.ts)

**Problem**: Inconsistent naming!

**Backend** (`backend/src/services/queue/queueService.ts`) uses:
```typescript
export enum QueueName {
    WORKFLOW_EXECUTE = 'workflow-execute', // ← Different!
    // ...
}
```

**Workers** (`workers/src/config/queues.ts`) defines:
```typescript
export enum QueueName {
    WORKFLOW_EXECUTION = 'workflow-execution', // ← Different!
    ENGINE_EXECUTION = 'engine-execution',
    // ...
}
```

**Result**: Backend queues to `workflow-execute`, worker listens to `workflow-execution` → **JOBS NEVER PROCESSED!**

---

## 🎯 QUEUES THAT NEED TO BE CREATED

### NONE! All queues already exist.

**BUT** we need to:
1. ✅ Use existing queues correctly
2. ✅ Fix naming inconsistency
3. ✅ Create/fix missing workers

---

## 🔧 REQUIRED ACTIONS

### Action 1: Fix Queue Naming (CRITICAL)
**Problem**: Backend and workers use different queue names

**Solution**:
- Standardize on one naming convention
- Option A: Use `workflow-execution` everywhere
- Option B: Use `workflow-execute` everywhere

**Recommendation**: Use `workflow-execution` (matches worker config)

**Changes Needed**:
- Update backend `queueService.ts` to use `workflow-execution`
- OR update worker queues.ts to use `workflow-execute`
- Ensure consistency across codebase

---

### Action 2: Create/Fix Execution Worker (CRITICAL)
**Current**: `engine-execution-worker.ts` is broken

**Required**:
1. Port `workflowExecutionService.ts` logic to worker
2. Remove backend callback
3. Worker executes workflows directly
4. Worker uses Supabase client for DB updates

**Files to Port**:
- `backend/src/services/workflow/workflowExecutionService.ts` (1000+ lines)
- `backend/src/services/ai/aiService.ts` (may already exist in workers)
- `backend/src/services/kb/kbResolutionService.ts` (may already exist)

---

### Action 3: Consolidate Execution Workers (OPTIONAL)
**Current**: Separate queues for `engine-execution` and `workflow-execution`

**Options**:
1. Keep separate (one worker per queue)
2. Consolidate to single execution worker (both queues)

**Recommendation**: Start with single worker for both, split later if needed

---

### Action 4: Handle Scheduled Tasks (DEFER)
**Current**: Queue exists, no worker

**Recommendation**: 
- Phase 3 will implement Railway cron
- Don't need queue-based scheduled tasks
- Can remove `scheduled-task` queue OR keep for future

---

## 📊 QUEUE REQUIREMENTS SUMMARY

| Requirement | Status | Action |
|-------------|--------|--------|
| Engine execution queue | ✅ EXISTS | Fix worker |
| Workflow execution queue | ✅ EXISTS | Fix naming + create/fix worker |
| Queue naming consistency | ❌ BROKEN | Standardize names |
| Scheduled task queue | ⚠️ UNUSED | Remove or defer |

---

## ✅ NO NEW QUEUES NEEDED

**Good News**: All required queues already exist!

**Work Required**:
1. Fix naming inconsistency
2. Create proper worker logic (port from backend)
3. Remove broken backend callbacks

---

*Phase 0, Step 0.3 Complete*
