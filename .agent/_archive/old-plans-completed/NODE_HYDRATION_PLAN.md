# NODE HYDRATION PLAN
**Created:** 2026-01-27 13:05 IST
**Last Updated:** 2026-01-27 13:32 IST
**Status:** ✅ ALL PHASES COMPLETE

---

## 🎯 OBJECTIVE

Make every node REAL and POWERFUL. No passthrough bullshit. No bandaids.

---

## ✅ PHASE 1: OUTPUT NODES - COMPLETE

| Node | Implementation | Status |
|------|---------------|--------|
| `output-webhook` | HTTP POST with auth (bearer, API key, HMAC), custom payloads | ✅ |
| `output-store` | INSERT to Supabase with metadata, tags, timestamps | ✅ |
| `output-email` | Resend API integration with recipient configuration | ✅ |
| `output-analytics` | Event logging to analytics_events table | ✅ |
| `output-export` | JSON, MD, HTML, CSV file generation | ✅ |
| `output-schedule` | Queue for future delivery | ✅ |

## ✅ PHASE 2: CONDITION NODES - COMPLETE

| Node | Implementation | Status |
|------|---------------|--------|
| `condition-if-else` | 13 condition types (contains, regex, equals, expression, etc.) | ✅ |
| `condition-switch` | Multi-branch routing with cases and default | ✅ |
| `loop-foreach` | Iteration context with item/index variables | ✅ |
| `delay-wait` | Real async sleep with configurable duration | ✅ |
| `human-review` | Pause workflow, store pending review state | ✅ |
| `error-handler` | Retry, skip, fallback, stop actions | ✅ |
| `split-parallel` | Fork with parallel context management | ✅ |
| `merge-combine` | Wait and merge strategies (concat, deep, array) | ✅ |

---

## ✅ PHASE 3: TRIGGER SYSTEM - COMPLETE

### Trigger Service Implementation

Created comprehensive trigger system at `apps/workers/src/triggers/triggerService.ts`:

| Component | Description |
|-----------|-------------|
| **TriggerRegistry** | In-memory registry with webhook path indexing |
| **TriggerService** | Handles trigger registration, validation, and firing |
| **Webhook Router** | Express router for `/webhook/:triggerId` endpoints |
| **Schedule Triggers** | BullMQ repeatable jobs with cron expressions |
| **Email Triggers** | MailWiz webhook handler with subject/sender filters |
| **Auth Support** | None, API Key, Bearer, HMAC signature validation |
| **Input Mapping** | Map incoming payload fields to workflow input |

### API Endpoints

```
GET  /api/triggers          - List registered triggers
POST /api/triggers          - Register new trigger
DELETE /api/triggers/:id    - Delete trigger
ALL  /api/webhook/:triggerId - Webhook trigger endpoint
```

---

## ✅ PHASE 4: TRANSFORM NODES - COMPLETE

### `executeTransformNode` Implementation

| Node | Implementation | Status |
|------|---------------|--------|
| `transform-locker` | Insert content locker HTML (email, paywall, social) at start/middle/end/percentage | ✅ |
| `transform-format` | MD↔HTML, JSON→text, plain strip, auto-detect format | ✅ |
| `transform-personalize` | Variable substitution with 4 patterns ({{var}}, ${var}, {var}, %var%) | ✅ |

### Features
- Locker types: email gate, paywall, social share
- Brand color and style customization
- Full HTML templates with inline styles
- Recursive JSON-to-text conversion
- Variable merging from config, user input, and defaults

---

## ✅ PHASE 5: KB RETRIEVAL - COMPLETE

### `executeKBNode` Implementation

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Embedding Generation** | OpenAI text-embedding-3-small (1536 dims) | ✅ |
| **Vector Search** | pgvector cosine distance (`<=>`) | ✅ |
| **Similarity Threshold** | Configurable (default 0.7) | ✅ |
| **Text Fallback** | PostgreSQL full-text search if vector fails | ✅ |
| **Source Formatting** | Numbered sources with similarity scores | ✅ |

### aiService Additions
- `generateEmbedding(text)` - Single text embedding
- `generateEmbeddingsBatch(texts)` - Batch embedding with index preservation

---

## 📁 FILES MODIFIED

### Backend (`apps/backend/`)
- `src/services/workflow/workflowExecutionService.ts`
  - Hydrated all output nodes (webhook, store, email, analytics, export, schedule)
  - Hydrated all condition nodes (if-else, switch, loops, delays, error handling)
  - Added `executeTransformNode()` with locker, format, personalize
  - Replaced placeholder KB node with real pgvector search
- `src/services/ai/aiService.ts`
  - Added `generateEmbedding()` method
  - Added `generateEmbeddingsBatch()` method

### Workers (`apps/workers/`)
- Created `src/triggers/triggerService.ts` - Complete trigger system (514 lines)
- Created `src/triggers/index.ts` - Module exports
- Fixed `src/config/queues.ts` - Standalone queue definitions
- Fixed `src/config/redis.ts` - Standalone Redis configuration
- Integrated trigger router into worker API server
- Fixed all worker files for proper BullMQ connection config
- Fixed TypeScript issues in fine-tuning and learning-loop workers
- Exported job interfaces for proper type inference

---

## 📋 PIPELINE DATA FLOW

```typescript
// Every node receives:
pipelineData = {
  userInput: { ...originalInput },           // NEVER LOST
  nodeOutputs: { [nodeId]: output, ... },    // All previous outputs
  lastNodeOutput: NodeOutput | null,         // Previous node's output
  kb: KnowledgeBase | null,                  // Full KB if engine has KB
  constitution: { ... } | null,              // Rules
  tokenUsage: { ... },                       // Token tracking
  tokenLedger: { ... },                      // Cost tracking per node
}

// Condition nodes return shouldContinue for flow control
// Output nodes perform real actions (HTTP, DB, email, etc.)
// Transform nodes modify content without AI
// KB nodes perform vector similarity search
```

---

## 🧪 BUILD STATUS

```bash
# Workers module
npm run typecheck ✅ (clean)

# Backend module  
npx tsc --noEmit ⚠️ (5 pre-existing errors in executionService.ts and index.ts - NOT related to hydration work)
```

---

*Plan Complete | All Nodes Hydrated | Professional End-to-End Implementation*
