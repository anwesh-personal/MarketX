# Pipeline Studio (Workflow Manager) — End-to-End Forensic Report

**Date:** 2026-03-13  
**Scope:** “Pipeline Studio” = Workflow Manager at `/superadmin/workflow-manager` (visual flow builder).  
**Method:** Code-by-code trace from UI → API → queue → worker → processor → DB. No assumptions. No changes made.

---

## 1. Identity and Entry

| Item | Finding |
|------|--------|
| **Name in code** | “Pipeline Studio” does not appear as a string. The feature is **Workflow Manager** / **Flow Builder**. |
| **Route** | `/superadmin/workflow-manager` |
| **Page** | `apps/frontend/src/app/superadmin/workflow-manager/page.tsx` — renders `<WorkflowManager />`. |
| **Component** | `apps/frontend/src/components/WorkflowManager/WorkflowManager.tsx` (~1212 lines), ReactFlow, 36 V2 node types in 8 categories. |

---

## 2. UI → API (Frontend)

### 2.1 Data loading

- **List flows:** `GET /api/superadmin/workflows` (no query). Implemented in `workflows/route.ts`: reads `workflow_templates`, returns `data` array. Auth: `getSuperadmin(request)`.
- **Load one flow:** No `GET /api/superadmin/workflows?id=xxx`. The UI uses the **list** and then `handleLoadWorkflow(workflow)` with the object already in memory. Single-workflow fetch by ID is not implemented; not required for current “pick from list” UX.
- **Save:** `POST` (new) or `PATCH` (existing) to `/api/superadmin/workflows` with `{ id?, name, description, status, nodes, edges }`. Zod-validated in route. Writes to `workflow_templates`.
- **Delete:** `DELETE /api/superadmin/workflows?id=<uuid>`. Route checks for `engine_instances` with `template_id`; if any, returns 409. Then deletes from `workflow_templates`.

### 2.2 Execute

- **Trigger:** “Execute” button → `handleExecuteFlow()`.
- **Guards:** Requires `currentFlowId` (saved workflow) and blocks if `hasUnsavedChanges`.
- **Request:** `POST /api/superadmin/workflows/${currentFlowId}/execute` with `body: JSON.stringify({ input: {} })`.
- **Auth:** Uses `superadminFetch` (Bearer token from `superadmin-auth`). Execute route uses `getSuperadmin(request)`; 401 if missing/invalid.

### 2.3 Stale 503 message

- On `response.status === 503`, the UI shows: *“Backend server not running. Start it with: npm run dev:backend”*.
- **Fact:** Workflow execute does **not** use a separate backend server; it uses Next.js API route → Redis/BullMQ → workers. The execute route itself does **not** return 503 in the code.
- So this message is **stale** (likely from an old writer/backend flow). If the user ever gets 503 (e.g. from another route), the guidance is wrong for Pipeline Studio.

---

## 3. Execute API (Backend)

**File:** `apps/frontend/src/app/api/superadmin/workflows/[id]/execute/route.ts`

### 3.1 Flow

1. **Auth:** `getSuperadmin(request)` → 401 if not superadmin.
2. **Params:** `id` from route = `workflowId` (intended as `workflow_templates.id`).
3. **Template:**  
   `supabase.from('workflow_templates').select('*').eq('id', workflowId).single()`.  
   If not found, fallback: treat `workflowId` as `engine_instances.id` and load engine.
4. **Engine for template:**  
   If template found: `engine_instances` with `template_id = workflowId`, `.maybeSingle()`.  
   If none: **create** `engine_instances` row with `name: template.name`, `template_id: template.id`, `org_id: null`, `status: 'active'`, `config: { flowConfig: { nodes: template.nodes, edges: template.edges } }`.
5. **Log:** Insert `engine_run_logs`: `id = executionId` (UUID), `engine_id`, `org_id: null`, `input_data: body.input || {}`, `status: 'started'`, `started_at`.
6. **Queue:** `new Queue('engine-execution', getRedisConfig())` then `engineQueue.add('engine-execution', { executionId, engineId, engine, userId: admin.id, orgId: null, input, options })`.
7. **Response:** 200 with `{ success: true, executionId, status: 'started', message: 'Execution queued successfully' }`.

### 3.2 Dependencies

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Route uses `|| ''`; empty string can create a broken client (same class of issue as elsewhere).
- **Redis:** `getRedisConfig()` from `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`. If Redis is unreachable, `new Queue(...)` or `.add()` can throw → 500, not 503.
- **DB:** `workflow_templates`, `engine_instances`, `engine_run_logs` must exist and match expected columns (e.g. `engine_run_logs` has `engine_id`, `org_id`, `input_data`, `status`, `started_at`).

### 3.3 Execution context

- **org_id:** Always `null` when running from this execute route (superadmin test run).
- **Engine:** Created with no `kb_id`, no `constitution_id`. So when the worker loads engine data, KB and constitution are **null**.

---

## 4. Worker (Engine Execution)

**File:** `apps/workers/src/workers/engine-execution-worker.ts`

- **Queue:** `QueueName.ENGINE_EXECUTION` = `'engine-execution'`.
- **Job payload:** `executionId`, `engineId`, `engine` (id, name, config, status), `userId`, `orgId`, `input`, `options`.
- **Logic:**
  - Sets run to “running” in DB (`engine_run_logs`).
  - Reads `flowConfig = engine.config?.flowConfig` (nodes/edges). If missing/invalid, throws.
  - Calls `workflowExecutionService.executeWorkflow(flowConfig.nodes, flowConfig.edges, input, executionId, progressCallback, executionUser, options)` with `options.engineId`.
- **Result:** On success, updates `engine_run_logs` (status, completed_at, output_data, tokens_used, cost_usd, duration_ms) and publishes progress/completion to Redis. On failure, updates status and error_message.

**Supabase in worker:** Uses `SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; if either missing, `supabase` is null and DB updates are skipped (only a warning is logged).

---

## 5. Workflow Execution Processor

**File:** `apps/workers/src/processors/workflow-execution-processor.ts` (large; execution core)

### 5.1 Initialization

- At module load: builds Supabase client from env; if URL/key missing, logs FATAL but does not throw; calls `workflowExecutionService.initialize(supabase)`.
- **Engine data:** When `options.engineId` is set, `loadEngineData(engineId)` runs: selects `engine_instances` with `knowledge_bases(data)` and `constitutions(name, rules)`. For engines created by the execute route, `kb_id` and `constitution_id` are null → **kb and constitution are null** for Pipeline Studio runs.

### 5.2 Execution flow

- **Order:** `buildExecutionOrder(nodes, edges)` — topological sort (Kahn). Cycles leave some nodes unexecuted (warning only).
- **Pipeline data:** `userInput`, `nodeOutputs`, `lastNodeOutput`, `executionUser`, **kb**, **engineConfig**, **constitution**, tokenUsage, tokenLedger. For Studio: **kb = null, constitution = null**.
- **Per node:** `executeNode(node, pipelineData, executionId)` → single big `switch (node.data.nodeType)`.

### 5.3 Node type coverage (processor vs UI)

**Fully wired in processor (by name):**

- **Triggers:** trigger-webhook, trigger-schedule, trigger-manual, trigger-email-inbound (+ legacy).
- **Resolvers:** resolve-icp, resolve-offer, resolve-angle, resolve-blueprint, resolve-cta.
- **Generators:** generate-website-page, generate-website-bundle, generate-email-flow, generate-email-reply, generate-social-post.
- **Process/Enricher:** analyze-intent, enrich-web-search, enrich-company-data, enrich-contact-data, enrich-context (+ legacy).
- **Transform:** transform-locker, transform-format, transform-personalize (+ legacy).
- **Validator:** validate-quality, validate-constitution.
- **Condition/Utility:** condition-if-else, condition-switch, loop-foreach, merge-combine, delay-wait, human-review, error-handler, split-parallel (+ legacy).
- **Output:** output-webhook, output-store, output-email, output-analytics (+ legacy).
- **Other:** input-config, text-input, file-upload, retrieve-kb, live-preview, email-preview.

**In UI palette but NOT in processor switch (fall through to default = passthrough):**

- **enrich-linkedin**
- **enrich-crm**
- **enrich-email-validation**

So these three enrichers are **placeholders** in the builder: they run as “passthrough” (previous output or userInput forwarded), no real LinkedIn/CRM/email-validation logic.

### 5.4 Resolvers and KB

- **executeResolverNode** uses `pipelineData.kb`. If KB is null (Studio case), resolution uses `resolveWithoutKB` or similar; behavior is “no KB” path (e.g. placeholders or empty).
- **validate-constitution** uses `pipelineData.kb` and constitution; if both null, validation has no rules to apply.

### 5.5 Generators

- **executeGeneratorNode** builds prompt from `buildResolvedContext(pipelineData)` and calls `aiService.call(prompt, ...)`. Works with empty/minimal context when KB is null; output quality may be generic but the path is functional.

---

## 6. Database

- **workflow_templates:** id, name, description, status, nodes (JSONB), edges (JSONB), node_count, created_by, created_at, updated_at. Used by CRUD and execute.
- **engine_instances:** id, name, template_id (FK workflow_templates), org_id, kb_id, constitution_id, status, config (JSONB), etc. Execute route creates row with `config.flowConfig = { nodes, edges }`.
- **engine_run_logs:** id (executionId), engine_id, org_id, input_data, status, started_at, completed_at, output_data, error_message, tokens_used, cost_usd, duration_ms, etc. Written by API (insert) and worker (update).

Schema and usage are aligned with the code paths above.

---

## 7. Is It “100% Functional”?

### 7.1 What works end-to-end

- **CRUD:** List, create, update, delete workflows (with engine-instance guard on delete). Auth and validation in place.
- **Execute path:** Save → Execute → API creates/gets engine, writes run log, enqueues to `engine-execution` → worker runs `workflowExecutionService.executeWorkflow` with correct nodes/edges.
- **Execution:** Topological order, most node types implemented (triggers, resolvers, generators, transforms, validators, conditions, outputs, etc.), token/cost tracking, DB and Redis progress/completion updates.
- **Simple flows:** e.g. trigger-manual → generate-email-reply → output-store can run; generator uses AI with whatever context is available (null KB still yields a response).

### 7.2 What is not 100% or is conditional

| Issue | Severity | Detail |
|-------|----------|--------|
| **Workers not deployed** | Blocker for real runs | If workers + Redis are not running, jobs stay in queue; run stays “started” and never completes. |
| **Redis required for execute** | Blocker | Execute route needs Redis for BullMQ. No Redis → queue add fails → 500. |
| **Three enrichers are passthrough** | Partial | enrich-linkedin, enrich-crm, enrich-email-validation have no implementation; they behave as passthrough. |
| **Studio run has no KB/constitution** | By design | org_id null, engine has no kb_id/constitution_id → resolvers and constitution validation run with null data. Acceptable for “test run” but not full org-scoped behavior. |
| **503 message in UI** | Minor | Message refers to “Backend server” and “npm run dev:backend”; incorrect for current architecture (no separate backend for this flow). |
| **Execute route Supabase fallback** | Minor | Uses `|| ''` for URL/key; can create invalid client like other routes. |

### 7.3 Verdict

- **Code path:** Pipeline Studio (Workflow Manager) is **implemented end-to-end**: UI → workflows API (CRUD + execute) → engine_run_logs + engine-execution queue → engine-execution worker → workflow-execution-processor with correct node routing and DB/Redis updates.
- **Functional completeness:** **Not 100%** in the sense of “every palette node does real work” (3 enrichers are passthrough) and “production run with full org context” (Studio runs with no KB/constitution). For “build a flow, save, run it and see AI/output” it is **functional** provided:
  - Redis is available at execute time.
  - Workers are running and can connect to Redis + Supabase.
  - You accept null KB/constitution for superadmin test runs and passthrough behavior for the three enrichers.

---

## 8. Summary Table

| Layer | Status | Notes |
|-------|--------|--------|
| UI (WorkflowManager) | Implemented | List, load, save, delete, execute; 36 node types in palette. |
| GET/POST/PATCH/DELETE workflows | Implemented | Auth, Zod, workflow_templates. No GET-by-id (not needed for current UX). |
| POST execute | Implemented | Template → engine get/create → run log → queue; Redis required. |
| engine-execution worker | Implemented | Reads flowConfig, calls workflowExecutionService. |
| workflow-execution-processor | Implemented | Topological order, node switch, KB/constitution load when engine has IDs. |
| Node coverage | 33/36 | enrich-linkedin, enrich-crm, enrich-email-validation = passthrough. |
| Studio run context | By design | org_id null, kb/constitution null. |
| Infra | External | Redis + workers must be running for execution to complete. |

**Bottom line:** Pipeline Studio is **not** 100% functional in the strict sense (3 placeholder enrichers; execution depends on Redis and workers). As a “build, save, and run a workflow” path it is **implemented and wired end-to-end**; full functionality for all nodes and for org-scoped runs would require implementing the three enrichers and running with an engine that has kb_id/constitution_id set (e.g. from Writer or another entry point).
