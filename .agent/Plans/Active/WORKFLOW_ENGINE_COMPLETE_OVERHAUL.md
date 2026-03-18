# WORKFLOW ENGINE — COMPLETE OVERHAUL PLAN

**Status:** ACTIVE — NOT STARTED
**Priority:** P0 — This is the core product pipeline
**Audited by:** Zara (AI Agent), March 18 2026
**Valuation context:** $40M SaaS — every node MUST work dynamically, no hardcoded bullshit

---

## EXECUTIVE SUMMARY

The Workflow Manager UI looks premium but the execution engine underneath is ~3% functional in terms of config wiring. The visual builder collects 120+ config keys across all node types — **only 4 actually flow to the execution engine**. Parallel execution, loops, and conditional branching are fake. The bundle → client deployment pipeline is 90% there but the last mile (client actually using it) is broken.

Three layers need fixing, in order:

1. **Config Wiring** — Make UI configs actually reach the executor
2. **Execution Logic** — Fix broken control flow (loops, parallel, conditions)
3. **Bundle Pipeline** — Fix the save → bundle → deploy → client use chain

---

## LAYER 1: CONFIG WIRING (UI → Execution)

### The Problem

The UI config components (`AIConfig.tsx`, `TriggerConfig.tsx`, etc.) were built independently from the execution processor (`workflow-execution-processor.ts`). There is no shared contract/schema. Result:

- **AI Config structural mismatch**: UI sends `aiConfig: [{providerId, model, ...}]` (array of entries with fallbacks). Executor reads `config.provider` (flat string). Every AI node silently falls back to hardcoded `openai/gpt-4o`.
- **camelCase vs snake_case**: UI stores `icpId`, `buyerStage`, `jobTitleHint`. Executor reads `icp_id`, `buyer_stage`, `job_title`. All resolver hints silently ignored.
- **Key name mismatches everywhere**: `emailTo` vs `to`, `webhookMethod` vs `method`, `storeTable` vs `tableName`, `gatePercentage` vs `percentage`, etc.

### Config Gap Table — EVERY Node Type

#### Triggers (0% functional)
```
UI Keys (ALL IGNORED):
  authType, apiKeyHeader, apiKeyValue, bearerToken, hmacSecret,
  payloadValidation, expectedSchema, frequency, cronExpression,
  timezone, enabled, inputFields[], testMode, testValues,
  mailboxId, filterFrom, filterSubject, parseAttachments,
  extractFields[], autoReply, autoReplyTemplate

Executor: Returns pipelineData.userInput as passthrough. Reads NOTHING from config.
```

#### Generators (0% functional — AI mismatch)
```
STRUCTURAL MISMATCH:
  UI: config.aiConfig = [{providerId: 'openai', model: 'gpt-4o', temperature: 0.7, maxTokens: 2048}]
  Executor: config.provider (flat string), config.model (flat string)

ALL IGNORED:
  systemPrompt, outputFormat, qualityThreshold, replyStyle,
  includeSignature, maxLength, sequenceLength, daysBetween,
  flowGoal, pageType, seoOptimize, includeSections[],
  platforms[], emojiLevel, postLength, bundlePages[],
  navigationStyle, linkStrategy
```

#### Validators (0% functional — AI mismatch + key mismatches)
```
STRUCTURAL MISMATCH: Same aiConfig array vs flat keys issue

KEY MISMATCHES:
  UI: forbiddenTermsList[] → Executor: config.rules[]
  UI: constitutionId → Executor: uses KB lookup instead

ALL IGNORED:
  passThreshold, failAction, retryCount, checkGrammar,
  checkReadability, checkBrandVoice, minReadabilityScore,
  targetGradeLevel, customChecks[], strictMode,
  requiredElementsList[], intentCategories[], minConfidence,
  extractEntities, entityTypes[]
```

#### Resolvers (~7% functional)
```
camelCase → snake_case MISMATCHES:
  UI: icpId → Executor: icp_id
  UI: industryHint → Executor: industry / industry_niche
  UI: jobTitleHint → Executor: job_title / target_role
  UI: companySizeHint → Executor: company_size / revenue_band
  UI: offerId → Executor: offer_id
  UI: offerCategory → Executor: offer_category
  UI: buyerStage → Executor: buyer_stage
  UI: preferredAxis → Executor: angle_axis
  UI: contentType → Executor: content_type
  UI: pageType → Executor: page_type
  UI: flowGoal → Executor: flow_goal
  UI: ctaType → Executor: cta_type

ONLY MATCH: platform → platform (by coincidence)

COMPLETELY IGNORED: selectionMode, fallbackBehavior, cacheResults, defaultValue
```

#### Transforms (0% functional — key mismatches)
```
transform-locker:
  UI: unlockMethod ('email_capture') → Executor: lockerType ('email')
  UI: gatePercentage → Executor: percentage
  UI: lockerTitle → Executor: ctaText
  UI: lockerDescription → Executor: ctaDescription
  Missing from UI: position (executor expects 'start'/'middle'/'end')

transform-format:
  UI: inputFormat → Executor: from
  UI: outputFormat → Executor: to

transform-personalize:
  UI: variableMappings[] (array of objects) → Executor: variables (flat Record)
  UI: customVariablePattern → Executor: pattern
```

#### Outputs (0% functional — key mismatches)
```
output-webhook:
  UI: webhookMethod → Executor: method
  UI: webhookHeaders[] (array) → Executor: headers (flat object)
  UI: webhookAuth.type → Executor: authType (flat)
  UI: webhookAuth.bearerToken → Executor: authToken (flat)
  UI: webhookBodyTemplate → Executor: customPayload

output-store:
  UI: storeTable → Executor: tableName

output-email:
  UI: emailTo → Executor: to
  UI: emailSubjectTemplate → Executor: subject
  UI: emailBodyTemplate → Executor: htmlTemplate
  UI: emailFromName + emailFromAddress → Executor: from (single string)

output-analytics:
  UI: analyticsEventName → Executor: eventName
```

#### Conditions/Utility (~30% — only loop-foreach keys match)
```
condition-if-else:
  UI: field (flat) → Executor: condition.field (nested)
  UI: operator ('eq','neq') → Executor: condition.type ('equals','greaterThan')

condition-switch:
  UI: cases[] (array of {id,pattern,matchType}) → Executor: cases (Record<value, branch>)

delay-wait:
  UI: duration + unit (separate) → Executor: delayMs (expects milliseconds)

human-review:
  UI: approvers[] → Executor: reviewers
  UI: timeout → Executor: timeoutMs

error-handler:
  UI: retryDelay → Executor: retryDelayMs
  Missing from UI: errorAction (executor expects 'retry'/'skip'/'fallback'/'stop')

split-parallel:
  UI: branchNames[] → Executor: branches

merge-combine:
  UI: waitMode ('all'/'any') → Executor: strategy ('waitAll')
  UI: mergeStrategy ('combine'/'last') → Executor: mergeType ('concat'/'array')

WORKING (loop-foreach): arrayField ✓, itemVariable ✓, indexVariable ✓
```

### Fix Strategy

**Option A (Recommended): Config Adapter in Executor**

Add a `normalizeNodeConfig(nodeType, rawConfig)` function at the top of `executeWorkflow()` that transforms UI config shape into what the executor expects. This way:
- UI doesn't need to change (no risk of breaking the builder)
- Adapter is one centralized place
- Easy to test

```
function normalizeNodeConfig(nodeType: string, config: Record<string, any>): Record<string, any> {
    // 1. Extract AI config from array → flat
    if (config.aiConfig?.[0]) {
        config.provider = config.aiConfig[0].providerId;
        config.model = config.aiConfig[0].model;
        config.temperature = config.aiConfig[0].temperature;
        config.maxTokens = config.aiConfig[0].maxTokens;
    }

    // 2. camelCase → snake_case for resolvers
    if (nodeType.startsWith('resolve-')) {
        config.icp_id = config.icpId ?? config.icp_id;
        config.buyer_stage = config.buyerStage ?? config.buyer_stage;
        // ... etc
    }

    // 3. Per-node key mapping
    // ... switch on nodeType for specific key renames
}
```

**Option B: Fix UI to match executor** — Higher risk, more files to change, breaks saved workflows.

---

## LAYER 2: EXECUTION LOGIC (Broken Control Flow)

### CRITICAL: 5 Broken Core Features

#### 2.1 Condition Results Ignored (shouldContinue)

**Location:** Main `for` loop in `executeWorkflow()` (~line 414)
**Problem:** After executing a condition node, the result includes `shouldContinue: false` but the main loop NEVER checks this flag. All nodes execute regardless of condition outcomes.

**Fix:** After each node execution, check:
```
if (result.type === 'condition' && result.shouldContinue === false) {
    // Skip nodes that are downstream of the false branch
    // Need: build a "reachability map" from condition node edges
}
```

This requires graph-aware execution — not just linear loop.

#### 2.2 loop-foreach Doesn't Iterate

**Location:** `executeConditionNode()` → case `loop-foreach` (~line 2280-2309)
**Problem:** Sets `pipelineData.loopContext = { items, currentIndex, itemVariable }` but never actually iterates. The loop body nodes are never re-executed.

**Fix:** Need to:
1. Identify loop body nodes (downstream until merge/end)
2. For each item in array, re-execute body nodes with item in context
3. Collect all outputs
4. Continue after loop

#### 2.3 split-parallel Doesn't Fork

**Location:** `executeConditionNode()` → case `split-parallel` (~line 2433-2451)
**Problem:** Sets parallel context in pipelineData but never actually creates concurrent execution paths.

**Fix:** Need to:
1. Identify branches from edges
2. For each branch, execute branch nodes with `Promise.all()`
3. Collect results per branch
4. merge-combine reads branch results

#### 2.4 merge-combine Dead Code

**Location:** `executeConditionNode()` → case `merge-combine` (~line 2456-2507)
**Problem:** Depends on `split-parallel` populating `parallelResults` which never happens.

**Fix:** Once split-parallel works, merge-combine should work. Verify merge strategies (concat, array, object).

#### 2.5 No Real Resume from Checkpoint

**Location:** `resumeWorkflow()` (~line 3571-3593)
**Problem:** Just toggles state flag to 'running'. No re-execution from checkpoint.

**Fix:** Need to:
1. Load checkpoint from DB (`engine_run_logs.execution_data`)
2. Restore pipelineData state
3. Find failed node index
4. Re-execute from that point

### HIGH: Security & Correctness

#### 2.6 `Function()` Constructor in Expression Eval

**Location:** `safeEval()` (~line 2573)
**Problem:** `condition-if-else` with `expression` type uses `new Function()` — potential code injection.

**Fix:** Replace with `expr-eval` library or a safe expression parser.

#### 2.7 `web-search` is LLM Hallucination

**Location:** `executeProcessNode()` → case `web-search` (~line 2067-2071)
**Problem:** No real HTTP search. LLM generates fake "research" with made-up sources.

**Fix:** Integrate Perplexity API (already supported in aiService) or add a dedicated search API (Tavily, Serper, etc.).

#### 2.8 `seo-optimize` Case Mismatch Bug

**Location:** Main switch uses `seo-optimize`, handler switch uses `seo-optimizer`
**Problem:** Falls to default generic handler.

**Fix:** Add `case 'seo-optimize':` alias in the handler switch.

#### 2.9 All 4 `enrich-*` Nodes are Stubs

**Location:** `enrich-web-search`, `enrich-company-data`, `enrich-contact-data`, `enrich-context`
**Problem:** All fall to default case in `executeProcessNode()` — generic AI with no enrichment logic.

**Fix:** Wire real APIs or at minimum use specialized prompts per enrichment type.

#### 2.10 Engine API Keys Not Passed to aiService

**Location:** All `aiService.call()` invocations
**Problem:** `aiService` supports `engineContext.providerMappings` for per-engine API key routing, but the processor never sends it.

**Fix:** Pass `engineContext` from the engine instance config to all AI calls.

### MEDIUM: Quality Issues

| # | Issue | Location |
|---|-------|----------|
| 11 | `contentGeneratorService` imported but never used | Line 19 (dead import) |
| 12 | `file-upload` input = passthrough, no file handling | `executeInputNode()` |
| 13 | `output-export` generates content but never saves it | `executeOutputNode()` |
| 14 | `output-schedule` is a stub — no actual scheduling | `executeOutputNode()` |
| 15 | Quality validation JSON parse failure returns score 70 — masks AI failures | `executeValidatorNode()` |
| 16 | `lastNodeOutput` only updates for `ai_generation` and `output` types — resolver/transform outputs invisible | Main loop line 462-464 |
| 17 | In-memory ExecutionStateManager lost on worker restart | All state ephemeral |
| 18 | No timeout on `fetch()` in webhook output | Could hang indefinitely |
| 19 | Markdown↔HTML conversion is basic regex | Will break on complex content |

---

## LAYER 3: BUNDLE → CLIENT PIPELINE

### What Works (90% of Steps 1-4)

| Step | Status |
|------|--------|
| Save workflow template | FULLY FUNCTIONAL |
| Create engine instance | FULLY FUNCTIONAL |
| Bundle creation UI (3-tab wizard) | FULLY FUNCTIONAL (beautiful) |
| Deploy to org (snapshot, brain agent clone, API key gen) | FULLY FUNCTIONAL |
| Deploy modal + Customize modal | FULLY FUNCTIONAL |

### What's Broken (Step 3 bug + Step 5 gaps)

#### 3.1 CRITICAL: Bundle POST Doesn't Save `agents_config` / `default_llm`

**Location:** `/api/superadmin/engine-bundles` POST handler
**Problem:** Frontend collects full agent specs (LLM, prompts, tools, RAG, memory per agent) + default LLM fallback. The API route INSERT statement only saves: `name`, `description`, `slug`, `brain_template_id`, `workflow_template_id`, `email_provider_id`, `default_api_key_mode`, `tier`, `config`, `status`. It does NOT include `agents_config` or `default_llm` columns.

**Impact:** Deploy route later reads `bundle.agents_config` and `bundle.default_llm` — these are always empty/null. The entire agent configuration system is dead at storage level.

**Fix:** Add `agents_config` and `default_llm` to the INSERT statement.

#### 3.2 CRITICAL: No API Key Authentication Middleware

**Location:** `/api/engines/[id]/execute`
**Problem:** Deploy flow generates `axm_live_<random>` API keys with hashes stored in DB. But there is ZERO middleware that:
- Accepts `Authorization: Bearer axm_live_xxx` or `x-api-key: axm_live_xxx`
- Looks up `engine_instances` by `api_key_hash`
- Authorizes the request

**Impact:** Generated API keys are display-only. Clients cannot use them.

**Fix:** Build API key auth middleware that validates against `engine_instances.api_key_hash`.

#### 3.3 HIGH: No Org/User Scoping on Engine Execution

**Location:** `/api/engines/[id]/execute`
**Problem:** Any authenticated user can execute any engine by ID. No ownership validation.

**Fix:** Check `engine.org_id === user.org_id` or `engine.assigned_user_id === user.id`.

#### 3.4 HIGH: Worker Ignores Snapshot Agent Config at Runtime

**Location:** `engine-execution-worker.ts`
**Problem:** Worker reads `engine.config.flowConfig` for nodes/edges but NEVER reads `snapshot.agents` (LLM provider/model, prompts, tools, RAG config). The carefully constructed agent configuration from the bundle is stored in the snapshot but never used.

**Fix:** Worker must read snapshot agents config and pass it to the execution processor as `engineContext`.

#### 3.5 MEDIUM: No Client-Facing Portal

**Problem:** Everything is superadmin-only. No `/portal` or `/app` where clients can:
- See their assigned engines
- View API keys
- Execute engines via UI
- See execution history
- Monitor usage

#### 3.6 LOW: No RLS on Engine Tables

**Problem:** No Row Level Security policies on `engine_instances`, `engine_bundles`, `engine_run_logs`, `engine_bundle_deployments`. All access via service role key.

---

## EXECUTION PHASES

### Phase 1: Config Wiring (Foundation) — PRIORITY: P0

**Goal:** Make every config key from UI actually reach the executor.

| Task | Files | Complexity |
|------|-------|-----------|
| Build `normalizeNodeConfig()` adapter function | `workflow-execution-processor.ts` | Medium |
| AI config: array → flat extraction | Same | Low |
| Resolver: camelCase → snake_case mapping | Same | Low |
| Generator: wire systemPrompt, outputFormat, type-specific configs | Same | Medium |
| Validator: wire passThreshold, failAction, custom rules | Same | Medium |
| Transform: fix all key name mismatches | Same | Low |
| Output: fix all key name mismatches + structural transforms | Same | Medium |
| Condition/Utility: fix nested config + value mappings | Same | Medium |

**Estimated effort:** 1 focused session

### Phase 2: Execution Logic (Control Flow) — PRIORITY: P0

**Goal:** Loops, parallel, conditions, and branching actually work.

| Task | Files | Complexity |
|------|-------|-----------|
| Main loop: respect `shouldContinue` from conditions | `workflow-execution-processor.ts` | High |
| Implement real `loop-foreach` with body re-execution | Same | High |
| Implement `split-parallel` with `Promise.all()` | Same | High |
| Verify `merge-combine` works after split fix | Same | Low |
| Fix `seo-optimize` case mismatch | Same | Trivial |
| Replace `Function()` with safe expression parser | Same + add `expr-eval` dep | Medium |
| Fix `web-search` → real Perplexity/search API | Same | Medium |
| Wire engine API keys to aiService | Same | Low |

**Estimated effort:** 1-2 focused sessions

### Phase 3: Bundle Pipeline (Last Mile) — PRIORITY: P1

**Goal:** Save → Bundle → Deploy → Client Use works end-to-end.

| Task | Files | Complexity |
|------|-------|-----------|
| Fix bundle POST: save agents_config + default_llm | `/api/superadmin/engine-bundles/route.ts` | Trivial |
| Build API key auth middleware | New middleware file | Medium |
| Add org/user scoping to engine execute | `/api/engines/[id]/execute/route.ts` | Low |
| Wire snapshot agent config to execution runtime | `engine-execution-worker.ts` | Medium |
| Add RLS policies for engine tables | New migration | Medium |

**Estimated effort:** 1 focused session

### Phase 4: Polish & Client Portal — PRIORITY: P2

**Goal:** Real enrichment, client-facing UI, production hardening.

| Task | Complexity |
|------|-----------|
| Real enricher nodes (web search, company data, contact data) | Medium per node |
| Output-export: actual file storage | Low |
| Output-schedule: actual scheduling system | Medium |
| Client portal: engine list, execute, history, usage | High (new feature) |
| Checkpoint resume from DB | Medium |
| Redis-backed ExecutionStateManager | Medium |
| Fetch timeouts on webhook outputs | Low |

**Estimated effort:** 2-3 sessions

---

## NODE EXECUTION STATUS MATRIX

Quick reference for any agent picking this up:

| Node Type | Executes? | Config Wired? | Notes |
|-----------|-----------|--------------|-------|
| trigger-webhook | Passthrough | No config read | All triggers identical |
| trigger-schedule | Passthrough | No config read | No cron validation |
| trigger-manual | Passthrough | No config read | — |
| trigger-email-inbound | Passthrough | No config read | No email parsing |
| input-config | Passthrough | Schema stored, never validated | — |
| file-upload | Passthrough | N/A | No file handling |
| retrieve-kb | **REAL DB** | **query, topK, section** | Solid implementation |
| resolve-icp | **REAL KB** | camelCase mismatch | — |
| resolve-offer | **REAL KB** | camelCase mismatch | — |
| resolve-angle | **REAL KB** | camelCase mismatch | — |
| resolve-blueprint | **REAL KB** | camelCase mismatch | — |
| resolve-cta | **REAL KB** | camelCase mismatch | — |
| generate-website-page | **REAL AI** | AI config mismatch | Falls to openai/gpt-4o |
| generate-website-bundle | **REAL AI** | AI config mismatch | Same |
| generate-email-flow | **REAL AI** | AI config mismatch | No JSON validation |
| generate-email-reply | **REAL AI** | AI config mismatch | — |
| generate-social-post | **REAL AI** | AI config mismatch | Platform not parameterized |
| analyze-intent | **REAL AI** | AI config mismatch | Good prompt |
| generate-llm | **REAL AI** | AI config mismatch | Core gen, 10 writer styles |
| web-search | **FAKE** | N/A | LLM hallucination, no real search |
| seo-optimize | **BUG** | N/A | Case mismatch → generic handler |
| enrich-web-search | **STUB** | Ignored | Generic AI, no enrichment |
| enrich-company-data | **STUB** | Ignored | Generic AI, no enrichment |
| enrich-contact-data | **STUB** | Ignored | Generic AI, no enrichment |
| enrich-context | **STUB** | Ignored | Generic AI, no enrichment |
| transform-locker | **REAL** | Key mismatches | Works with wrong keys |
| transform-format | **REAL** | Key mismatches | Basic regex conversion |
| transform-personalize | **REAL** | Structural mismatch | Variables format differs |
| validate-quality | **REAL AI** | AI config mismatch | JSON parse failure = score 70 |
| validate-constitution | **REAL AI** | AI config mismatch | Well-implemented otherwise |
| condition-if-else | **REAL** | Nesting mismatch | **Results ignored by main loop** |
| condition-switch | **REAL** | Structural mismatch | **Results ignored by main loop** |
| loop-foreach | **BROKEN** | Keys match | **Never iterates** |
| delay-wait | **REAL** | Key mismatch | No max-delay guard |
| human-review | **PARTIAL** | Key mismatches | In-memory only, no notifications |
| error-handler | **STUB** | Key mismatches | Reports action, doesn't execute it |
| split-parallel | **BROKEN** | Key mismatch | **No actual parallel execution** |
| merge-combine | **BROKEN** | Key+value mismatch | Depends on broken split |
| output-webhook | **REAL HTTP** | Key+structural mismatches | No fetch timeout |
| output-store | **REAL DB** | Key mismatch | — |
| output-email | **REAL EMAIL** | Key+structural mismatches | Hardcoded from address |
| output-analytics | **REAL DB** | Key mismatch | — |
| output-export | **PARTIAL** | N/A | Content generated, never saved |
| output-schedule | **STUB** | N/A | No actual scheduling |
| live-preview | Passthrough | N/A | — |
| email-preview | Passthrough | N/A | — |

---

## KEY FILES

| Purpose | Path |
|---------|------|
| Execution processor (3622 lines) | `apps/workers/src/processors/workflow-execution-processor.ts` |
| Engine execution worker | `apps/workers/src/workers/engine-execution-worker.ts` |
| Node definitions (36 nodes) | `apps/frontend/src/components/WorkflowManager/v2-node-definitions.ts` |
| Node types/interfaces | `apps/frontend/src/components/WorkflowManager/types.ts` |
| Workflow Manager component | `apps/frontend/src/components/WorkflowManager/WorkflowManager.tsx` |
| V2 Workflow Node | `apps/frontend/src/components/WorkflowManager/V2WorkflowNode.tsx` |
| Add Node Modal | `apps/frontend/src/components/WorkflowManager/AddNodeModal.tsx` |
| AI Config | `apps/frontend/src/components/WorkflowManager/AIConfig.tsx` |
| Trigger Config | `apps/frontend/src/components/WorkflowManager/TriggerConfig.tsx` |
| Resolver Config | `apps/frontend/src/components/WorkflowManager/ResolverConfig.tsx` |
| Generator Config | `apps/frontend/src/components/WorkflowManager/GeneratorConfig.tsx` |
| Validator Config | `apps/frontend/src/components/WorkflowManager/ValidatorConfig.tsx` |
| Output Config | `apps/frontend/src/components/WorkflowManager/OutputConfig.tsx` |
| Enricher Config | `apps/frontend/src/components/WorkflowManager/EnricherConfig.tsx` |
| Transform Config | `apps/frontend/src/components/WorkflowManager/TransformConfig.tsx` |
| Utility Config | `apps/frontend/src/components/WorkflowManager/UtilityConfig.tsx` |
| Workflows CRUD API | `apps/frontend/src/app/api/superadmin/workflows/route.ts` |
| Workflow execute API | `apps/frontend/src/app/api/superadmin/workflows/[id]/execute/route.ts` |
| Engine bundles API | `apps/frontend/src/app/api/superadmin/engine-bundles/route.ts` |
| Bundle deploy API | `apps/frontend/src/app/api/superadmin/engine-bundles/[id]/deploy/route.ts` |
| Bundle instances API | `apps/frontend/src/app/api/superadmin/engine-bundles/[id]/instances/[instanceId]/route.ts` |
| Client engine execute | `apps/frontend/src/app/api/engines/[id]/execute/route.ts` |
| Engine deployment service (FE) | `apps/frontend/src/services/engine/engineDeploymentService.ts` |
| Engine deployment service (BE) | `apps/backend/src/services/engine/engineDeploymentService.ts` |
| AI Service | `apps/workers/src/services/ai-service.ts` (or similar) |
| KB Resolution Service | Referenced in processor, location TBD |
| Workflow CSS | `apps/frontend/src/components/WorkflowManager/workflow-manager.css` |
| Engine bundles page | `apps/frontend/src/app/superadmin/engine-bundles/page.tsx` |
| Engines page | `apps/frontend/src/app/superadmin/engines/page.tsx` |

---

## RULES FOR ANY AGENT WORKING ON THIS

1. **NO hardcoded values** — everything from config, DB, or environment
2. **NO breaking the UI** — config adapter goes in the executor, not the frontend
3. **Theme-aware** — all CSS uses `var(--color-*)` variables
4. **Test after every change** — save a workflow, execute it, verify config flows
5. **Preserve backwards compatibility** — old saved workflows must still work
6. **Check the gap table above** before touching any node — know what's broken first
7. **This is a $40M app** — code quality must be enterprise-grade
