# Architecture Overview

> Visual reference for understanding Axiom's complete architecture.

---

## System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AXIOM COMPLETE FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────────┐
                            │   SUPERADMIN     │
                            │   (Anwesh)       │
                            └────────┬─────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
        ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
        │   WORKFLOW     │  │    BRAIN       │  │  KNOWLEDGE     │
        │   MANAGER      │  │   SYSTEM       │  │    BASES       │
        └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
                │                   │                   │
                │  Create/Edit      │  Configure        │  Upload/Manage
                │  Workflows        │  AI Agents        │  KB Content
                ▼                   ▼                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                    DATABASE (Supabase)                  │
        │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
        │  │ workflow_   │ │ brain_      │ │ knowledge_  │       │
        │  │ templates   │ │ templates   │ │ bases       │       │
        │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘       │
        └─────────┼───────────────┼───────────────┼──────────────┘
                  │               │               │
                  ▼               ▼               ▼
        ┌─────────────────────────────────────────────────────────┐
        │                    ENGINE DEPLOYMENT                     │
        │                                                          │
        │  Workflow Template ──► Engine Instance ──► Org Assignment│
        │                            │                             │
        │                            ▼                             │
        │                    ┌──────────────┐                      │
        │                    │ engine_      │                      │
        │                    │ instances    │                      │
        │                    └──────┬───────┘                      │
        └───────────────────────────┼──────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │                    EXECUTION FLOW                        │
        │                                                          │
        │   TRIGGER                                                │
        │   (webhook, schedule, manual, email-inbound)            │
        │                          │                               │
        │                          ▼                               │
        │   ┌─────────────────────────────────────────────────┐   │
        │   │           WORKFLOW EXECUTION SERVICE             │   │
        │   │                                                  │   │
        │   │  1. Build execution order (topological sort)    │   │
        │   │  2. Initialize pipeline data                    │   │
        │   │  3. FOR each node:                              │   │
        │   │     ├── Execute node handler                    │   │
        │   │     ├── Call AI if needed (via aiService)       │   │
        │   │     ├── Update pipeline with output             │   │
        │   │     └── Update progress                         │   │
        │   │  4. Return final output                         │   │
        │   │                                                  │   │
        │   └──────────────────────┬──────────────────────────┘   │
        │                          │                               │
        │                          ▼                               │
        │   ┌─────────────────────────────────────────────────┐   │
        │   │              ENGINE RUN LOGS                     │   │
        │   │  - status: running → completed/failed           │   │
        │   │  - input_data, output_data                      │   │
        │   │  - tokens_used, cost_estimate                   │   │
        │   │  - execution_time_ms                            │   │
        │   └─────────────────────────────────────────────────┘   │
        └─────────────────────────────────────────────────────────┘

                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │                    OUTPUT TYPES                          │
        │                                                          │
        │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
        │  │  WEBSITE    │ │   EMAIL     │ │   SOCIAL    │        │
        │  │  BUNDLE     │ │   FLOW      │ │   POST      │        │
        │  └─────────────┘ └─────────────┘ └─────────────┘        │
        │  ┌─────────────┐                                        │
        │  │   EMAIL     │                                        │
        │  │   REPLY     │                                        │
        │  └─────────────┘                                        │
        └─────────────────────────────────────────────────────────┘

                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │                    ANALYTICS LAYER                       │
        │                                                          │
        │  Events: PAGE_VIEW, CLICK, REPLY, BOOKED_CALL,          │
        │          BOUNCE, UNSUBSCRIBE, COMPLAINT                 │
        │                          │                               │
        │                          ▼                               │
        │   ┌─────────────────────────────────────────────────┐   │
        │   │           analytics_events                       │   │
        │   │           aggregated_metrics                     │   │
        │   └──────────────────────┬──────────────────────────┘   │
        └──────────────────────────┼──────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────┐
        │                    LEARNING LOOP                         │
        │                                                          │
        │  ⏰ DAILY AT 6 AM (America/New_York)                     │
        │                                                          │
        │  1. Fetch analytics from PREVIOUS_CALENDAR_DAY          │
        │  2. Calculate metrics:                                   │
        │     - booked_call_rate (PRIMARY)                        │
        │     - reply_rate                                         │
        │     - bounce_rate, unsubscribe_rate (GUARDRAILS)        │
        │  3. Apply policies:                                      │
        │     - PROMOTE winners (TOP_N best performers)           │
        │     - DEMOTE losers (BOTTOM_N poor performers)          │
        │     - KILL dangerous patterns (guardrail breach)        │
        │  4. Update KB preferences:                               │
        │     - PREFER_ANGLE, PREFER_CTA, PREFER_LAYOUT, etc.     │
        │  5. Log to learning_history                              │
        │                                                          │
        │  Result: KB gets smarter, Writer uses updated KB         │
        └─────────────────────────────────────────────────────────┘
```

---

## Node Categories (36 Total)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW NODE TYPES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGERS (4)                    RESOLVERS (5)                              │
│  ├── webhook                     ├── icp-resolver                          │
│  ├── schedule                    ├── offer-resolver                        │
│  ├── manual                      ├── angle-resolver                        │
│  └── email-inbound               ├── blueprint-resolver                    │
│                                  └── cta-resolver                          │
│                                                                              │
│  GENERATORS (5)                  VALIDATORS (3)                             │
│  ├── email-reply                 ├── quality-validator                     │
│  ├── email-flow                  ├── constitution-validator                │
│  ├── website-page                └── intent-validator                      │
│  ├── website-bundle                                                         │
│  └── social-post                                                            │
│                                                                              │
│  OUTPUTS (4)                     ENRICHERS (4)                              │
│  ├── webhook-output              ├── web-search                            │
│  ├── store-output                ├── linkedin-enrich                       │
│  ├── email-output                ├── crm-enrich                            │
│  └── analytics-output            └── email-validation                      │
│                                                                              │
│  TRANSFORMS (3)                  UTILITIES (8)                              │
│  ├── locker-transform            ├── if-else                               │
│  ├── format-transform            ├── switch                                │
│  └── personalize-transform       ├── foreach                               │
│                                  ├── merge                                  │
│                                  ├── delay                                  │
│                                  ├── human-review                          │
│                                  ├── error-handler                         │
│                                  └── split                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Isolation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-TENANT MODEL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PLATFORM (Anwesh owns)                                                     │
│  │                                                                           │
│  ├── platform_admins (Anwesh + trusted team)                                │
│  │   └── Full access to everything                                          │
│  │                                                                           │
│  └── ORGANIZATION (Client - e.g., Tommy's company)                          │
│      │                                                                       │
│      ├── users (team members)                                               │
│      │   ├── owner (billing, all permissions)                               │
│      │   ├── admin (manage KB, trigger runs)                                │
│      │   ├── member (limited permissions)                                   │
│      │   └── viewer (read-only)                                             │
│      │                                                                       │
│      ├── knowledge_bases (org-scoped)                                       │
│      │   └── RLS: WHERE org_id = auth.org_id()                              │
│      │                                                                       │
│      ├── engine_instances (deployed from global templates)                  │
│      │   └── RLS: WHERE org_id = auth.org_id()                              │
│      │                                                                       │
│      ├── engine_run_logs (execution history)                                │
│      │   └── RLS: WHERE org_id = auth.org_id()                              │
│      │                                                                       │
│      ├── analytics_events (performance data)                                │
│      │   └── RLS: WHERE org_id = auth.org_id()                              │
│      │                                                                       │
│      └── api_key_mappings (AI provider keys per org)                        │
│          └── Isolation: Org can only use their own keys                     │
│                                                                              │
│  KEY BENEFIT:                                                                │
│  - Anwesh controls the platform                                             │
│  - Clients get user accounts                                                │
│  - No client-to-client data leakage                                         │
│  - Can give cartel a user account, retain ownership                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Brain System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BRAIN SYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER INPUT                                                                 │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BRAIN ORCHESTRATOR                                │   │
│  │                                                                      │   │
│  │  1. Intent Classification                                           │   │
│  │     └── Determine what user wants (write, analyze, coach, general)  │   │
│  │                                                                      │   │
│  │  2. Agent Selection                                                  │   │
│  │     ├── WriterAgent → Content creation                              │   │
│  │     ├── AnalystAgent → Data analysis                                │   │
│  │     ├── CoachAgent → Productivity coaching                          │   │
│  │     └── GeneralistAgent → General fallback                          │   │
│  │                                                                      │   │
│  │  3. RAG Orchestration                                               │   │
│  │     ├── Query Expansion (generate variations)                       │   │
│  │     ├── Hybrid Search (vector + FTS)                                │   │
│  │     ├── Re-ranking (cross-encoder scoring)                          │   │
│  │     └── Context Assembly (format with citations)                    │   │
│  │                                                                      │   │
│  │  4. AI Response (streaming)                                         │   │
│  │     └── Selected agent + context → LLM → Stream chunks             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  MEMORY SYSTEMS                                                             │
│  ├── VectorStore (pgvector, 1536-dim embeddings)                           │
│  ├── FTS Engine (PostgreSQL ts_rank, stemming)                             │
│  └── Memory Manager (user preferences, conversation history)               │
│                                                                              │
│  LEARNING                                                                   │
│  ├── User Feedback (thumbs up/down, corrections)                           │
│  ├── Pattern Analysis (identify improvements)                              │
│  └── RLHF Pipeline (fine-tuning prep)                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Workflow Execution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW EXECUTION DATA FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGER (webhook, schedule, manual)                                        │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PIPELINE DATA (passed between nodes)                               │   │
│  │                                                                      │   │
│  │  {                                                                   │   │
│  │    userInput: { /* original trigger data */ },                      │   │
│  │    nodeOutputs: {                                                   │   │
│  │      "trigger-1": { type: "trigger", content: {...} },             │   │
│  │      "icp-1": { type: "resolver", content: {...} },                │   │
│  │      "generate-1": { type: "generator", content: "...", tokens }   │   │
│  │    },                                                                │   │
│  │    lastNodeOutput: { /* most recent content */ },                   │   │
│  │    tokenUsage: { total: 1500, cost: 0.03 },                         │   │
│  │    engineContext: { engineId, orgId, kb, constitution }            │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  NODE EXECUTION (for each node in topological order)                │   │
│  │                                                                      │   │
│  │  1. Get node from execution order                                   │   │
│  │  2. Route to handler based on node.type                             │   │
│  │     ├── inputHandler → Process input data                          │   │
│  │     ├── resolverHandler → Fetch KB components                       │   │
│  │     ├── generatorHandler → Call AI via aiService                   │   │
│  │     ├── validatorHandler → Check content quality                   │   │
│  │     ├── conditionHandler → Route based on logic                    │   │
│  │     └── outputHandler → Store/send results                         │   │
│  │  3. Handler returns { success, output, tokens?, nextNodes? }        │   │
│  │  4. Add output to pipelineData.nodeOutputs                         │   │
│  │  5. Update progress callback                                        │   │
│  │  6. Continue to next node                                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│      │                                                                       │
│      ▼                                                                       │
│  FINAL OUTPUT (stored in engine_run_logs + returned to caller)              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Last Updated: 2026-01-26 19:30 IST*
