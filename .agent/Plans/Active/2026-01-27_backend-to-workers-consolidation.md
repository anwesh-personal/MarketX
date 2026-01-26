# Backend → Workers Consolidation Plan
## Lifetime Architecture - Cost Effective, Scalable, Optimized

> **Created**: 2026-01-27 03:14 IST  
> **Goal**: Eliminate redundant backend service, merge into workers  
> **Result**: 2 services (Vercel + Railway) instead of 3

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend)                        │
│  - Next.js 14 App Router                                        │
│  - All UI components                                             │
│  - API routes that QUEUE jobs to Redis                          │
│  - Returns immediately with job ID                              │
│  - Webhook endpoints for external triggers                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Queue jobs via BullMQ
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS (Upstash/Railway)                       │
│  - Job queues (BullMQ)                                          │
│  - Pub/sub for real-time progress                               │
│  - Session cache                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Workers pull jobs
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RAILWAY (Workers)                           │
│                                                                  │
│  CORE WORKERS:                                                   │
│  ├── kb-worker (5 concurrent)                                   │
│  ├── conversation-worker (3 concurrent)                         │
│  ├── analytics-worker (2 concurrent)                            │
│  │                                                               │
│  BRAIN WORKERS:                                                  │
│  ├── dream-state-worker (2 concurrent)                          │
│  ├── fine-tuning-worker (1 concurrent)                          │
│  ├── learning-loop-worker (1 concurrent)                        │
│  │                                                               │
│  NEW - EXECUTION WORKERS:                                        │
│  ├── workflow-execution-worker (10 concurrent) ← FROM BACKEND   │
│  └── engine-execution-worker (5 concurrent)    ← FROM BACKEND   │
│                                                                  │
│  CRON (Railway native):                                          │
│  ├── 6:00 AM EST - Daily Learning Loop                          │
│  ├── 3:00 AM EST - Cleanup                                      │
│  └── Every 15 min - Health Check                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Read/Write
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE (Database)                        │
│  - PostgreSQL                                                   │
│  - All tables                                                   │
│  - Connection pooling via Supavisor                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: New Queue Types

### 1.1 Add Queue Definitions

**File: `apps/frontend/src/lib/worker-queues.ts`**

Add new queue types:
```typescript
export enum QueueName {
    // Existing
    KB_PROCESSING = 'kb-processing',
    CONVERSATION_SUMMARY = 'conversation-summary',
    ANALYTICS = 'analytics',
    LEARNING_LOOP = 'learning-loop',
    DREAM_STATE = 'dream-state',
    FINE_TUNING = 'fine-tuning',
    
    // NEW - From Backend
    WORKFLOW_EXECUTION = 'workflow-execution',
    ENGINE_EXECUTION = 'engine-execution',
    SCHEDULED_TASK = 'scheduled-task',
}
```

### 1.2 Queue Job Interfaces

```typescript
interface WorkflowExecutionJob {
    workflowId: string;
    executionId: string;
    input: Record<string, any>;
    userId: string;
    orgId?: string;
    tier: 'hobby' | 'pro' | 'enterprise';
}

interface EngineExecutionJob {
    engineId: string;
    executionId: string;
    input: Record<string, any>;
    userId: string;
    orgId?: string;
    tier: 'hobby' | 'pro' | 'enterprise';
    options?: {
        engineConfig?: Record<string, any>;
        preloadedKb?: Record<string, any>;
    };
}

interface ScheduledTaskJob {
    taskType: 'learning-loop' | 'cleanup' | 'health-check' | 'dream-state-idle';
    orgId?: string;
    triggeredBy: 'cron' | 'manual' | 'idle';
}
```

---

## Phase 2: Move Services to Workers

### 2.1 Files to Move (Copy & Adapt)

| From Backend | To Workers | Changes Needed |
|--------------|------------|----------------|
| `services/workflow/workflowExecutionService.ts` | `workers/workflow-execution-worker.ts` | Remove Express, add BullMQ wrapper |
| `services/engine/executionService.ts` | `workers/engine-execution-worker.ts` | Remove Express, add BullMQ wrapper |
| `services/ai/aiService.ts` | `utils/ai-service.ts` | Already portable |
| `services/kb/kbResolutionService.ts` | `utils/kb-resolution.ts` | Already portable |
| `core/ops.scheduler.ts` | Use Railway Cron | Replace node-cron with Railway cron jobs |
| `core/dreamState/*` | Already in workers | KEEP workers version, DELETE backend version |
| `core/selfHealing/*` | `utils/self-healing.ts` | Move circuit breaker logic |

### 2.2 Create Workflow Execution Worker

**File: `apps/workers/src/workers/workflow-execution-worker.ts`**

```typescript
import { Worker, Job } from 'bullmq';
import { QueueName } from '../config/queues';
import { redisConfig } from '../config/redis';
import { Pool } from 'pg';

// Port the entire workflowExecutionService.ts here
// Key changes:
// 1. Remove Express routing
// 2. Job comes from BullMQ, not HTTP
// 3. Progress updates via job.updateProgress()
// 4. Results stored in Supabase, returned via job completion

interface WorkflowExecutionJob {
    workflowId: string;
    executionId: string;
    input: Record<string, any>;
    userId: string;
    orgId?: string;
    tier: 'hobby' | 'pro' | 'enterprise';
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function executeWorkflow(job: Job<WorkflowExecutionJob>) {
    const { workflowId, executionId, input, userId, tier, orgId } = job.data;
    
    // Fetch workflow from DB
    const { rows } = await pool.query(
        'SELECT * FROM workflow_templates WHERE id = $1',
        [workflowId]
    );
    
    if (rows.length === 0) {
        throw new Error('Workflow not found');
    }
    
    const workflow = rows[0];
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];
    
    // ... PORT workflowExecutionService.executeWorkflow() logic here
    // Use job.updateProgress() for progress updates
    // Store results in engine_run_logs table
    
    return {
        success: true,
        executionId,
        // ... full result
    };
}

const worker = new Worker(QueueName.WORKFLOW_EXECUTION, executeWorkflow, {
    ...redisConfig,
    concurrency: 10, // Higher concurrency for workflow execution
    limiter: {
        max: 20,
        duration: 1000,
    },
});

// Event handlers
worker.on('completed', (job) => {
    console.log(`✅ Workflow ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Workflow ${job?.id} failed:`, err.message);
});

worker.on('progress', (job, progress) => {
    console.log(`⏳ Workflow ${job.id}: ${JSON.stringify(progress)}`);
});

console.log('🚀 Workflow Execution Worker started');

export default worker;
```

### 2.3 Create Engine Execution Worker

Similar pattern for engine execution with additional features:
- API key validation
- Rate limiting per tier
- Webhook callbacks for async results

---

## Phase 3: Update Frontend API Routes

### 3.1 Change Execute Route to Queue Job

**File: `apps/frontend/src/app/api/superadmin/workflows/[id]/execute/route.ts`**

BEFORE (proxies to backend):
```typescript
const backendResponse = await fetch(`${BACKEND_URL}/api/engines/workflows/${workflowId}/execute`, {...});
```

AFTER (queues to Redis):
```typescript
import { queues, QueueName } from '@/lib/worker-queues';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest, context: RouteContext) {
    const { id: workflowId } = await context.params;
    const executionId = `exec-${uuidv4()}`;
    const body = await request.json().catch(() => ({}));
    
    // Queue the job
    const job = await queues.workflowExecution.add('execute', {
        workflowId,
        executionId,
        input: body.input || {},
        userId: admin.id,
        orgId: admin.orgId,
        tier: 'enterprise',
    }, {
        jobId: executionId,
        removeOnComplete: 100,
        removeOnFail: 1000,
    });
    
    // For sync execution, wait for result
    if (!body.async) {
        const result = await job.waitUntilFinished(queueEvents, 120000); // 2 min timeout
        return NextResponse.json(result);
    }
    
    // For async execution, return job ID
    return NextResponse.json({
        success: true,
        executionId,
        status: 'queued',
        message: 'Workflow execution queued',
    }, { status: 202 });
}
```

### 3.2 Add Status Check Endpoint

**File: `apps/frontend/src/app/api/superadmin/workflows/executions/[executionId]/route.ts`**

```typescript
export async function GET(request: NextRequest, context: RouteContext) {
    const { executionId } = await context.params;
    
    // Check job status in Redis
    const job = await queues.workflowExecution.getJob(executionId);
    
    if (!job) {
        // Check database for completed jobs
        const { data } = await supabase
            .from('engine_run_logs')
            .select('*')
            .eq('execution_id', executionId)
            .single();
        
        if (data) {
            return NextResponse.json({
                status: data.status,
                result: data.node_outputs,
                error: data.error,
            });
        }
        
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }
    
    const state = await job.getState();
    const progress = job.progress;
    
    return NextResponse.json({
        status: state,
        progress,
        ...(state === 'completed' ? { result: job.returnvalue } : {}),
        ...(state === 'failed' ? { error: job.failedReason } : {}),
    });
}
```

---

## Phase 4: Railway Cron Setup

### 4.1 Remove node-cron from Backend

Delete `apps/backend/src/core/ops.scheduler.ts` usage.

### 4.2 Add Railway Cron Jobs

In Railway project settings, add cron jobs:

| Schedule | Command | Description |
|----------|---------|-------------|
| `0 11 * * *` | `npm run cron:learning-loop` | 6 AM EST Daily Learning |
| `0 8 * * *` | `npm run cron:cleanup` | 3 AM EST Cleanup |
| `*/15 * * * *` | `npm run cron:health-check` | Every 15 min Health Check |

### 4.3 Create Cron Scripts

**File: `apps/workers/src/cron/learning-loop.ts`**

```typescript
import { queues } from '../config/queues';

async function triggerLearningLoop() {
    console.log('🕕 [CRON] Triggering Daily Learning Loop...');
    
    // Queue job for all active orgs
    await queues.learningLoop.add('daily', {
        taskType: 'learning-loop',
        triggeredBy: 'cron',
    });
    
    console.log('✅ [CRON] Learning Loop queued');
    process.exit(0);
}

triggerLearningLoop();
```

---

## Phase 5: Delete Backend

### 5.1 Files to Delete

After all functionality is moved:

```
apps/backend/
├── src/
│   ├── core/                    # DELETE (moved to workers)
│   ├── routes/                  # DELETE (moved to frontend API + workers)
│   ├── services/                # DELETE (moved to workers)
│   ├── middleware/              # DELETE (API key auth moves to workers)
│   └── index.ts                 # DELETE
├── package.json                 # DELETE
└── ...                          # DELETE entire folder
```

### 5.2 Update Package.json Scripts

**File: `package.json` (root)**

BEFORE:
```json
{
  "scripts": {
    "dev:frontend": "cd apps/frontend && npm run dev",
    "dev:backend": "cd apps/backend && npm run dev",
    "dev:workers": "cd apps/workers && npm run dev"
  }
}
```

AFTER:
```json
{
  "scripts": {
    "dev": "cd apps/frontend && npm run dev",
    "dev:workers": "cd apps/workers && npm run dev"
  }
}
```

### 5.3 Update Frontend Environment

**File: `apps/frontend/.env.local`**

REMOVE:
```
BACKEND_URL=http://localhost:8080
```

ADD (if not already):
```
REDIS_URL=redis://...
```

---

## Phase 6: Real-Time Progress

### 6.1 Use Redis Pub/Sub for Progress

Instead of HTTP progress callbacks, use Redis pub/sub:

**Workers publish:**
```typescript
import { getRedisConnection } from '../config/redis';

// In workflow execution
job.updateProgress({
    nodeId: node.id,
    nodeName: node.data.label,
    status: 'running',
    progress: 45,
});

// Also publish for real-time
const redis = await getRedisConnection();
await redis.publish(`execution:${executionId}`, JSON.stringify({
    type: 'progress',
    nodeId: node.id,
    progress: 45,
}));
```

**Frontend subscribes (via API route streaming):**
```typescript
// apps/frontend/src/app/api/superadmin/workflows/executions/[executionId]/stream/route.ts
export async function GET(request: NextRequest, context: RouteContext) {
    const { executionId } = await context.params;
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const redis = await getRedisConnection();
            await redis.subscribe(`execution:${executionId}`);
            
            redis.on('message', (channel, message) => {
                controller.enqueue(encoder.encode(`data: ${message}\n\n`));
            });
        },
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

---

## Phase 7: Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Document current API endpoints
- [ ] List all environment variables

### Phase 1-2: Move Code
- [ ] Add new queue types to worker-queues.ts
- [ ] Create workflow-execution-worker.ts
- [ ] Create engine-execution-worker.ts
- [ ] Move aiService to workers
- [ ] Move kbResolutionService to workers
- [ ] Move selfHealing to workers

### Phase 3: Update Frontend
- [ ] Change /execute route to queue jobs
- [ ] Add /executions/[id] status endpoint
- [ ] Add /executions/[id]/stream for SSE
- [ ] Remove BACKEND_URL references

### Phase 4: Railway Cron
- [ ] Create cron scripts
- [ ] Configure Railway cron jobs
- [ ] Test cron triggers

### Phase 5: Delete Backend
- [ ] Remove apps/backend folder
- [ ] Update root package.json
- [ ] Update deployment configs

### Phase 6: Test Everything
- [ ] Test workflow execution
- [ ] Test engine execution
- [ ] Test cron jobs
- [ ] Test real-time progress
- [ ] Load test with 100 concurrent executions

---

## Cost Analysis

### Current (3 services)
- Vercel: $20/mo (Pro)
- Railway Workers: $5/mo
- Railway Backend: $5/mo (if deployed)
- **Total: ~$30/mo**

### After Consolidation (2 services)
- Vercel: $20/mo (Pro)
- Railway Workers: $5-10/mo (slightly higher due to more work)
- **Total: ~$25-30/mo**

### At 1M Users
- Vercel: $100/mo (scale as needed)
- Railway Workers: $50-100/mo (auto-scale)
- **Total: ~$150-200/mo**

Much cheaper than running a dedicated VPS cluster.

---

## Estimated Timeline

| Phase | Effort | Dependency |
|-------|--------|------------|
| Phase 1: Queue Types | 1 hour | None |
| Phase 2: Move Services | 4-6 hours | Phase 1 |
| Phase 3: Update Frontend | 2-3 hours | Phase 2 |
| Phase 4: Railway Cron | 1 hour | Phase 2 |
| Phase 5: Delete Backend | 30 min | Phases 2-4 |
| Phase 6: Real-Time | 2 hours | Phase 3 |
| Phase 7: Testing | 2-3 hours | All |

**Total: 12-16 hours of focused work**

---

## Risk Mitigation

1. **Keep backend running** during migration - switch over when ready
2. **Feature flag** for new execution path vs old
3. **Database rollback** script ready
4. **Monitoring** on Railway for worker health

---

*Plan Created: 2026-01-27 03:14 IST*
*Status: READY FOR EXECUTION*
