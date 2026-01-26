# Axiom Engine Deployment Architecture
## Complete Port from Lekhika - No Shortcuts

**Created:** 2026-01-24
**Status:** PLANNING - Requires Full Understanding Before Implementation

---

## 🎯 GOALS

1. **Deploy Workflow as Engine** - Clone a workflow template into a runnable "Engine Instance"
2. **Execute Engine** - Process inputs through nodes sequentially with AI calls
3. **Track Execution** - Full logging, progress updates, token tracking
4. **Worker System** - Background processing via queue-based workers

---

## 📐 LEKHIKA ARCHITECTURE (SOURCE OF TRUTH)

### Core Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LEKHIKA ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   Frontend   │───▶│  Edge Func   │───▶│      Redis Queue         │  │
│  │  (Trigger)   │    │  (enqueue)   │    │  (BullMQ - workflow.*)   │  │
│  └──────────────┘    └──────────────┘    └───────────┬──────────────┘  │
│                                                      │                  │
│                                                      ▼                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     VPS-WORKER (port 3001)                        │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────────┐   ┌────────────────────┐                     │  │
│  │  │  queueWorker.js │──▶│ executionService.js│                     │  │
│  │  │  (BullMQ proc)  │   │  (orchestration)   │                     │  │
│  │  └─────────────────┘   └─────────┬──────────┘                     │  │
│  │                                  │                                 │  │
│  │                                  ▼                                 │  │
│  │  ┌────────────────────────────────────────────────────────────┐   │  │
│  │  │              workflowExecutionService.js                   │   │  │
│  │  │  - Builds execution order from nodes/edges                 │   │  │
│  │  │  - Loops through nodes sequentially                        │   │  │
│  │  │  - Calls node handlers based on type                       │   │  │
│  │  │  - Passes data through pipelineData                        │   │  │
│  │  │  - Tracks tokens, costs, progress                          │   │  │
│  │  │  - Saves checkpoints for resume                            │   │  │
│  │  └─────────────────────────┬──────────────────────────────────┘   │  │
│  │                            │                                       │  │  
│  │           ┌────────────────┼────────────────┐                     │  │
│  │           ▼                ▼                ▼                     │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌────────────────┐         │  │
│  │  │inputHandler │  │contentGenHandler│  │conditionHandler│  ...    │  │
│  │  │             │  │(calls aiService)│  │                │         │  │
│  │  └─────────────┘  └────────┬────────┘  └────────────────┘         │  │
│  │                            │                                       │  │
│  │                            ▼                                       │  │
│  │  ┌────────────────────────────────────────────────────────────┐   │  │
│  │  │                    aiService.js                            │   │  │
│  │  │  - OpenAI, Claude, Gemini, Perplexity, etc.               │   │  │
│  │  │  - Token counting, cost calculation                        │   │  │
│  │  │  - Retry logic, rate limiting                              │   │  │
│  │  └────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lekhika File Structure (vps-worker/services/)

```
services/
├── executionService.js         # Main orchestrator (1443 lines)
├── workflowExecutionService.js # Node-by-node execution (1381 lines)
├── aiService.js                # AI provider calls (28KB)
├── aiProviders.js              # Provider configurations
├── queue/                      # BullMQ queue management
├── workflow/
│   ├── handlers/
│   │   ├── inputNodeHandler.js      # Input nodes
│   │   ├── contentGenerationHandler.js  # AI generation (34KB!)
│   │   ├── contentRefinementHandler.js  # Refinement
│   │   ├── conditionHandler.js      # Logic gates
│   │   ├── outputHandler.js         # Output nodes
│   │   ├── previewHandler.js        # Preview nodes
│   │   ├── processNodeRouter.js     # Routes to correct handler
│   │   └── imageGenerationHandler.js # Image gen
│   ├── helpers/
│   │   ├── tokenHelpers.js          # Token tracking
│   │   ├── resumeHelpers.js         # Checkpoint resume
│   │   ├── contentHelpers.js        # Content utilities
│   │   └── outputHelpers.js         # Output formatting
│   ├── utils/
│   │   ├── executionOrderBuilder.js # DAG ordering
│   │   ├── dependencyBuilder.js     # Edge mapping
│   │   ├── conditionHelpers.js      # Condition logic
│   │   ├── workflowUtils.js         # Validation
│   │   └── ...
│   └── state/
│       └── executionStateManager.js # In-memory state
└── supabase.js                 # DB client + token ops
```

### Key Data Structures

**Engine Instance (ai_engines / engine_instances):**
```json
{
  "id": "uuid",
  "name": "Email Reply Engine",
  "template_id": "workflow_template_uuid",
  "org_id": "org_uuid",
  "flow_config": {
    "nodes": [...],
    "edges": [...],
    "models": [...]
  },
  "status": "active",
  "tier": "pro",
  "config": {
    "constitution_id": "uuid",
    "kb_id": "uuid"
  }
}
```

**Execution Record (engine_executions / engine_run_logs):**
```json
{
  "id": "execution_uuid",
  "engine_id": "engine_uuid",
  "user_id": "user_uuid",
  "status": "running|completed|failed",
  "input_data": { "emailBody": "...", "sender": "..." },
  "execution_data": {
    "nodeResults": {},
    "progress": 75,
    "currentNode": "generate-llm",
    "processingSteps": [],
    "tokenUsage": { "totalTokens": 1234 }
  },
  "tokens_used": 1234,
  "cost_estimate": 0.025,
  "execution_time_ms": 45000
}
```

**Pipeline Data (passed between nodes):**
```javascript
{
  userInput: { /* original user input */ },
  nodeOutputs: {
    "trigger-1": { type: "trigger", content: {...} },
    "analyze-1": { type: "ai_generation", content: "...", aiMetadata: {...} },
    "generate-1": { type: "ai_generation", content: "Generated email...", tokens: 500 }
  },
  lastNodeOutput: { /* most recent content node output */ },
  executionUser: { id: "user_id", tier: "pro" },
  tokenUsage: { totalTokens: 1234, totalCost: 0.025 }
}
```

---

## 📋 AXIOM PORTING PLAN

### What Axiom Already Has ✅

| Component | Location | Status |
|-----------|----------|--------|
| Workflow Builder UI | `apps/frontend/src/components/WorkflowBuilder/` | ✅ Working |
| Node Types (UI) | `AxiomNodes.tsx`, `AxiomSubNodes.tsx` | ✅ 20 types |
| Workflow Templates Table | Migration SQL | ✅ Defined |
| Engine Instances Table | Migration SQL | ✅ Defined |
| Engine Run Logs Table | Migration SQL | ✅ Defined |
| API Routes (CRUD) | `api/superadmin/workflows/`, `api/superadmin/engines/` | ✅ Exist |
| Engines Page (UI) | `superadmin/engines/page.tsx` | ✅ Exists |
| AI Providers Table | `ai_providers` table | ✅ Exists |
| Writer Personas | `axiomNodeDefaults.ts` | ✅ 10 personas |

### What Axiom NEEDS to Port 🔴

#### Phase 1: Engine Deployment Service
Port: `lekhika_4_8lwy03/src/services/engineDeploymentService.js`
Target: `apps/backend/src/services/engineDeploymentService.ts` OR `apps/frontend/src/services/engineDeploymentService.ts`

**Functions to port:**
- `deployEngine(engineConfig)` - Create engine from workflow
- `getEngines()` / `getAllEngines()` - List engines
- `updateEngine(id, updates)` - Update engine
- `deleteEngine(id)` - Delete engine
- `duplicateEngine(id)` - Clone engine
- `getEngineStats()` - Analytics

#### Phase 2: Workflow Execution Service
Port: `lekhika_4_8lwy03/vps-worker/services/workflowExecutionService.js`
Target: `apps/backend/src/services/workflowExecutionService.ts`

**Core functions:**
- `executeWorkflow(nodes, edges, input, workflowId, progressCallback, user)`
- `executeNode(node, pipelineData, workflowId, progressCallback)`
- `buildExecutionOrder(nodes, edges)` - Topological sort
- `stopWorkflow(workflowId)`
- `pauseWorkflow(workflowId)`
- `resumeExecution(executionId, nodes, edges, progressCallback)`

#### Phase 3: Node Handlers
Port: `lekhika_4_8lwy03/vps-worker/services/workflow/handlers/`
Target: `apps/backend/src/services/workflow/handlers/`

**Handlers needed:**
1. `inputNodeHandler.ts` - Handle input nodes
2. `contentGenerationHandler.ts` - AI generation (CRITICAL - 34KB)
3. `conditionHandler.ts` - Logic gates, routing  
4. `outputHandler.ts` - Output processing
5. `previewHandler.ts` - Preview generation
6. `processNodeRouter.ts` - Route to correct handler

#### Phase 4: AI Service
Port: `lekhika_4_8lwy03/vps-worker/services/aiService.js`
Target: `apps/backend/src/services/aiService.ts`

**Functions:**
- `callAI(prompt, options)` - Universal AI caller
- `countTokens(text)` - Token counting
- `calculateCost(tokens, model)` - Cost calculation
- Provider-specific implementations (OpenAI, Claude, Gemini)

#### Phase 5: Execution Service (Orchestrator)
Port: `lekhika_4_8lwy03/vps-worker/services/executionService.js`
Target: `apps/backend/src/services/executionService.ts`

**Functions:**
- `executeWorkflow(params)` - Main entry point
- `updateExecutionStatus(executionId, status, data)`
- Token deduction from user balance
- Progress tracking and DB updates

#### Phase 6: Worker System (Optional for MVP)
If async processing needed:
- Queue service (BullMQ or similar)
- Queue worker process
- Job management

---

## 🔀 EXECUTION FLOW

```
1. User clicks "Deploy as Engine" on workflow
   └── API: POST /api/superadmin/engines/deploy
       └── engineDeploymentService.deployEngine()
           └── INSERT into engine_instances (cloned from template)

2. User/System triggers engine execution
   └── API: POST /api/engines/{id}/execute
       └── executionService.executeWorkflow()
           ├── Create engine_run_logs record (status: 'running')
           ├── Load engine config (nodes, edges, models)
           └── workflowExecutionService.executeWorkflow()
               ├── Build execution order (topological sort)
               ├── Initialize pipelineData
               └── FOR each node in order:
                   ├── executeNode(node, pipelineData)
                   │   ├── inputNodeHandler (input nodes)
                   │   ├── contentGenerationHandler (AI nodes)
                   │   │   └── aiService.callAI()
                   │   │       └── OpenAI/Claude/Gemini API
                   │   ├── conditionHandler (logic nodes)
                   │   └── outputHandler (output nodes)
                   ├── Update pipelineData with nodeOutput
                   ├── Update execution_data (progress, results)
                   └── Call progressCallback (real-time updates)
               └── Return final results

3. Execution completes
   └── UPDATE engine_run_logs (status: 'completed')
   └── Deduct tokens from user balance
   └── Return results to caller
```

---

## 🚦 IMPLEMENTATION STATUS

### ✅ COMPLETED (This Session)

1. **Engine Deployment Service** - `apps/backend/src/services/engine/engineDeploymentService.ts` (427 lines)
   - `deployEngine()` - Create engine from workflow config
   - `getEngines()` / `getAllEngines()` - List engines with filters
   - `getEngine()` - Get single engine by ID
   - `updateEngine()` - Update engine config/status
   - `deleteEngine()` - Delete engine
   - `duplicateEngine()` - Clone engine with new name
   - `getEngineStats()` - Analytics (runs, tokens, costs)
   - `startEngineRun()` / `completeEngineRun()` - Execution tracking

2. **AI Service** - `apps/backend/src/services/ai/aiService.ts` (550 lines)
   - Universal `call()` method for all providers
   - OpenAI integration (GPT-4o, GPT-4o-mini, GPT-4-turbo)
   - Anthropic integration (Claude 3.5 Sonnet, Opus, Haiku)
   - Google integration (Gemini 1.5 Pro, Flash)
   - Perplexity integration (Sonar Large)
   - Token counting and cost calculation
   - API key management from database or environment

3. **Workflow Execution Service** - `apps/backend/src/services/workflow/workflowExecutionService.ts` (910 lines)
   - `executeWorkflow()` - Main execution orchestrator
   - `buildExecutionOrder()` - Topological sort for DAG execution
   - `executeNode()` - Route to appropriate handler
   - Node handlers for: trigger, input, process (AI), KB, condition, preview, output
   - Prompt builders for: intent analysis, generation, validation, web search, SEO
   - `ExecutionStateManager` - In-memory state with checkpointing
   - Progress callbacks for real-time updates
   - `saveCheckpointToDatabase()` - Resume on failure

4. **Execution Service (Orchestrator)** - `apps/backend/src/services/engine/executionService.ts` (320 lines)
   - `executeEngine()` - Main entry point (sync & async modes)
   - Queue integration for async execution
   - Token deduction and logging
   - Execution status tracking
   - `getExecutionStatus()` - Check progress
   - `stopExecution()` - Stop running workflows
   - `getActiveExecutions()` - List running executions

5. **Queue Service** - `apps/backend/src/services/queue/queueService.ts` (230 lines)
   - In-memory queue (upgradeable to Redis/BullMQ)
   - `process()` - Register queue processors
   - `add()` - Add jobs to queue
   - Concurrency control
   - Retry logic with configurable delays
   - Job status tracking

6. **API Routes** - `apps/backend/src/routes/engines.ts` (290 lines)
   - `GET /api/engines` - List engines
   - `GET /api/engines/:id` - Get engine
   - `POST /api/engines/deploy` - Deploy new engine
   - `PATCH /api/engines/:id` - Update engine
   - `DELETE /api/engines/:id` - Delete engine
   - `POST /api/engines/:id/duplicate` - Clone engine
   - `POST /api/engines/:id/activate` - Activate engine
   - `POST /api/engines/:id/deactivate` - Deactivate engine
   - `POST /api/engines/:id/execute` - Execute engine
   - `GET /api/engines/executions/:executionId` - Get execution status
   - `POST /api/engines/executions/:executionId/stop` - Stop execution
   - `GET /api/engines/stats` - Get statistics

7. **Service Index** - `apps/backend/src/services/index.ts`
   - Clean exports for all services and types

8. **Backend Integration** - `apps/backend/src/index.ts`
   - Database pool initialization
   - Service initialization on startup
   - Engine routes mounted at `/api/engines`

### 🔄 NEXT STEPS (Future Sessions)

1. **Node Handlers** - Separate handler files under `handlers/`
   - `inputNodeHandler.ts` - Detailed input processing
   - `contentGenerationHandler.ts` - Full AI generation with persona, constitution
   - `conditionHandler.ts` - Rich condition evaluation
   - `outputHandler.ts` - Output formatting and publishing
   - `previewHandler.ts` - Preview generation

2. **Knowledge Base Integration**
   - Vector search for KB retrieval nodes
   - Context injection into prompts

3. **Frontend Integration**
   - "Deploy as Engine" button in Workflow Builder
   - Engine Management UI enhancements
   - Real-time execution progress display

4. **Production Worker System** (if needed)
   - Redis/BullMQ integration
   - Separate worker process
   - PM2 deployment configuration

---

## 📁 PROPOSED AXIOM STRUCTURE

```
apps/backend/src/
├── services/
│   ├── engine/
│   │   ├── engineDeploymentService.ts   # Deploy, CRUD
│   │   ├── engineExecutionService.ts    # Main orchestrator
│   │   └── engineStatsService.ts        # Analytics
│   ├── workflow/
│   │   ├── workflowExecutionService.ts  # Node-by-node execution
│   │   ├── executionStateManager.ts     # State tracking
│   │   └── handlers/
│   │       ├── inputHandler.ts
│   │       ├── contentGenerationHandler.ts
│   │       ├── conditionHandler.ts
│   │       ├── outputHandler.ts
│   │       └── processNodeRouter.ts
│   ├── ai/
│   │   ├── aiService.ts                 # Universal AI caller
│   │   ├── providers/
│   │   │   ├── openaiProvider.ts
│   │   │   ├── claudeProvider.ts
│   │   │   └── geminiProvider.ts
│   │   └── tokenCounter.ts
│   └── queue/ (optional)
│       ├── queueService.ts
│       └── queueWorker.ts

apps/frontend/src/
├── services/
│   └── engineDeploymentService.ts       # Frontend API calls
└── components/
    └── WorkflowBuilder/
        └── DeployEngineButton.tsx       # Deploy button component
```

---

## ⚠️ CRITICAL NOTES

1. **No Shortcuts** - Every handler must be properly ported
2. **Token Tracking** - Must track tokens at each node for billing
3. **Error Handling** - Must support pause/resume on failure
4. **Progress Updates** - Real-time progress via callbacks or SSE
5. **Type Safety** - Port to TypeScript with proper types
6. **Environment Parity** - Works same in dev and production

---

## ✅ CONFIRMATION

I understand:
- The FULL architecture from Lekhika
- Every component that needs porting
- The execution flow from trigger to output
- The worker system structure
- The data structures (pipelineData, nodeOutputs)
- Token tracking throughout execution

**Ready to begin systematic porting when you approve.**
