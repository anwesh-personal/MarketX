# 🏗️ AXIOM ARCHITECTURE — THE BRAIN ENGINE
## Technical Architecture for the $28M System

---

## 🧠 THE CORE CONCEPT

Axiom is a **Constitutional AI Content Engine** with three distinct layers:

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║                        AXIOM BRAIN ENGINE                         ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║   Layer 3: OUTPUT GENERATION                                      ║
║   ┌─────────────────────────────────────────────────────────┐     ║
║   │  • Email Copy                                           │     ║
║   │  • Email Replies (per Constitution)                     │     ║
║   │  • Landing Pages                                        │     ║
║   │  • Social Content                                       │     ║
║   └─────────────────────────────────────────────────────────┘     ║
║                              ↑                                    ║
║   ════════════════════════════════════════════════════════════    ║
║                                                                   ║
║   Layer 2: INTELLIGENCE                                           ║
║   ┌─────────────────────────────────────────────────────────┐     ║
║   │                                                         │     ║
║   │   ┌────────────┐  ┌────────────┐  ┌────────────┐       │     ║
║   │   │    RAG     │  │  WORKFLOW  │  │  LEARNING  │       │     ║
║   │   │   Engine   │  │   Engine   │  │   LOOP     │       │     ║
║   │   │ (Retrieve) │  │  (Execute) │  │  (Improve) │       │     ║
║   │   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘       │     ║
║   │         │               │               │               │     ║
║   │         └───────────────┴───────────────┘               │     ║
║   │                         │                               │     ║
║   │                  ┌──────┴──────┐                        │     ║
║   │                  │ VALIDATOR   │                        │     ║
║   │                  │(Constitution)│                       │     ║
║   │                  └─────────────┘                        │     ║
║   │                                                         │     ║
║   └─────────────────────────────────────────────────────────┘     ║
║                              ↑                                    ║
║   ════════════════════════════════════════════════════════════    ║
║                                                                   ║
║   Layer 1: KNOWLEDGE                                              ║
║   ┌─────────────────────────────────────────────────────────┐     ║
║   │                                                         │     ║
║   │   ┌────────────┐  ┌────────────┐  ┌────────────┐       │     ║
║   │   │     KB     │  │   RULES    │  │ ANALYTICS  │       │     ║
║   │   │ (Content)  │  │  (Const.)  │  │  (Stats)   │       │     ║
║   │   │ - Brand    │  │ - Guardrails│  │ - Clicks  │       │     ║
║   │   │ - ICP      │  │ - Structure │  │ - Replies │       │     ║
║   │   │ - Offers   │  │ - Abort     │  │ - Bounces │       │     ║
║   │   │ - Angles   │  │             │  │ - Calls   │       │     ║
║   │   └────────────┘  └────────────┘  └────────────┘       │     ║
║   │                                                         │     ║
║   └─────────────────────────────────────────────────────────┘     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 🔧 COMPONENT BREAKDOWN

### 1. RAG Engine (Retrieval Augmented Generation)

```
┌─────────────────────────────────────────────────────────────┐
│                      RAG ENGINE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   INPUT: Query or context                                   │
│                                                             │
│         ↓                                                   │
│                                                             │
│   ┌─────────────┐                                           │
│   │  EMBEDDING  │  Convert query to vector                  │
│   │   Service   │  (OpenAI, Cohere, or local)               │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ↓                                                  │
│                                                             │
│   ┌─────────────┐                                           │
│   │   VECTOR    │  Search pgvector for similar content      │
│   │   Search    │  Hybrid: vector + full-text               │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ↓                                                  │
│                                                             │
│   ┌─────────────┐                                           │
│   │  RERANKER   │  Optional: rerank by relevance            │
│   │  (Cohere)   │  Improves precision                       │
│   └──────┬──────┘                                           │
│          │                                                  │
│          ↓                                                  │
│                                                             │
│   OUTPUT: Relevant KB chunks for context                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Workflow Engine (Multi-Agent Pipeline)

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW ENGINE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   WHY WORKFLOW?                                             │
│   - Different models excel at different tasks               │
│   - Each step is independently tunable                      │
│   - Easier to debug and improve                             │
│   - Matches their cognitive sequence requirement            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   EXAMPLE: Email Reply Workflow                             │
│                                                             │
│   ┌────────────┐                                            │
│   │   NODE 1   │  ANALYZE                                   │
│   │  (Claude)  │  - Parse incoming email                    │
│   │            │  - Identify scenario                       │
│   │            │  - Detect intent level                     │
│   └─────┬──────┘                                            │
│         │                                                   │
│         ↓                                                   │
│                                                             │
│   ┌────────────┐                                            │
│   │   NODE 2   │  RETRIEVE                                  │
│   │   (RAG)    │  - Get relevant KB sections                │
│   │            │  - Load Constitution rules                 │
│   │            │  - Fetch applicable angles                 │
│   └─────┬──────┘                                            │
│         │                                                   │
│         ↓                                                   │
│                                                             │
│   ┌────────────┐                                            │
│   │   NODE 3   │  GENERATE                                  │
│   │  (Gemini)  │  - Draft reply following sequence          │
│   │            │  - Apply cognitive structure               │
│   │            │  - Include/exclude CTA based on rules      │
│   └─────┬──────┘                                            │
│         │                                                   │
│         ↓                                                   │
│                                                             │
│   ┌────────────┐                                            │
│   │   NODE 4   │  VALIDATE                                  │
│   │ (Validator)│  - Check against Constitution              │
│   │            │  - Verify no guardrail violations          │
│   │            │  - Approve or REJECT output                │
│   └─────┬──────┘                                            │
│         │                                                   │
│         ↓                                                   │
│                                                             │
│   OUTPUT: Approved reply OR rejection with reason           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Learning Loop

```
┌─────────────────────────────────────────────────────────────┐
│                     LEARNING LOOP                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SCHEDULE: Daily at 06:00 AM Eastern                       │
│   INPUT WINDOW: Previous calendar day only                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌────────────────────────────────────────────────────┐    │
│   │  1. INGEST ANALYTICS                               │    │
│   │     - Fetch stats from Mailwiz                     │    │
│   │     - Clicks, replies, bounces, unsubscribes       │    │
│   │     - Booked calls (primary metric)                │    │
│   └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ↓                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │  2. EVALUATE PERFORMANCE                           │    │
│   │     - Group by: ICP, Offer, Angle, Variant         │    │
│   │     - Calculate: booked_call_rate, reply_rate      │    │
│   │     - Check: guardrail thresholds                  │    │
│   └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ↓                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │  3. APPLY RULES                                    │    │
│   │                                                    │    │
│   │     PROMOTION RULES:                               │    │
│   │     - Top N performers → add to KB preferences     │    │
│   │     - "This angle works for Enterprise ICP"        │    │
│   │                                                    │    │
│   │     DEMOTION RULES:                                │    │
│   │     - Bottom N performers → reduce weight          │    │
│   │     - "This CTA underperforms for SMB"             │    │
│   │                                                    │    │
│   │     SAFETY RULES:                                  │    │
│   │     - Guardrail breach → PAUSE pattern             │    │
│   │     - "High bounce rate → pause this template"     │    │
│   │                                                    │    │
│   └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ↓                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │  4. UPDATE KB                                      │    │
│   │     - Create preference records                    │    │
│   │     - Add to paused_patterns if needed             │    │
│   │     - Log history for audit trail                  │    │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   RESULT: Tomorrow's content generation uses today's        │
│           learnings. The system gets smarter every day.     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Constitutional Validator

```
┌─────────────────────────────────────────────────────────────┐
│                  CONSTITUTIONAL VALIDATOR                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   EVERY output passes through this before release           │
│                                                             │
│   CHECK 1: Structure Compliance                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  □ Has Reflection step?                             │   │
│   │  □ Has Clarification step?                          │   │
│   │  □ Has Reframe step?                                │   │
│   │  □ Has Choice step (optional)?                      │   │
│   │  □ No steps skipped?                                │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   CHECK 2: Claim Safety                                     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  □ No guaranteed outcomes?                          │   │
│   │  □ No specific ROI promises?                        │   │
│   │  □ No "guaranteed" language?                        │   │
│   │  □ No deterministic claims?                         │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   CHECK 3: Psychological Safety                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  □ No urgency tactics?                              │   │
│   │  □ No scarcity tactics?                             │   │
│   │  □ No fear tactics?                                 │   │
│   │  □ No manipulative social proof?                    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   CHECK 4: Link Qualification                               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  IF link included:                                  │   │
│   │  □ Stated who IMT is for?                           │   │
│   │  □ Stated who IMT is not for?                       │   │
│   │  □ Explained what clicking means?                   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   RESULT:                                                   │
│   ├── ALL PASS → Output approved                            │
│   └── ANY FAIL → Output REJECTED with specific reason       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API INTEGRATION (Per Nino's Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                    IMT ↔ AXIOM API                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   FLOW:                                                     │
│                                                             │
│   1. IMT receives incoming email                            │
│          │                                                  │
│          ↓                                                  │
│   2. IMT calls: POST /api/brain/input                       │
│      {                                                      │
│        "type": "email_reply",                               │
│        "incoming_email": "...",                             │
│        "sender_info": {...},                                │
│        "context": {...}                                     │
│      }                                                      │
│          │                                                  │
│          ↓                                                  │
│   3. Axiom returns: { "job_id": "xxx" }                     │
│          │                                                  │
│          ↓                                                  │
│   4. IMT polls: GET /api/brain/status/{job_id}              │
│      Returns: { "status": "pending|processing|done|failed" }│
│          │                                                  │
│          ↓ (when status = done)                             │
│                                                             │
│   5. IMT fetches: GET /api/brain/output/{job_id}            │
│      Returns: {                                             │
│        "reply": "...",                                      │
│        "metadata": {...}                                    │
│      }                                                      │
│          │                                                  │
│          ↓                                                  │
│   6. IMT sends reply via Mailwiz                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 DATABASE SCHEMA OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE TABLES                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   KNOWLEDGE BASE                                            │
│   ├── kb_brand           (voice, compliance, forbidden)    │
│   ├── kb_icps            (segments, titles, pain points)   │
│   ├── kb_offers          (value props, differentiators)    │
│   ├── kb_angles          (narrative primitives)            │
│   ├── kb_ctas            (call-to-action library)          │
│   └── kb_preferences     (learned preferences)             │
│                                                             │
│   CONTENT LIBRARY                                           │
│   ├── email_flow_blueprints                                 │
│   ├── email_reply_playbooks                                 │
│   ├── page_blueprints                                       │
│   ├── social_post_blueprints                                │
│   └── subject_firstline_variants                            │
│                                                             │
│   RUNTIME                                                   │
│   ├── generation_runs    (job tracking)                     │
│   ├── generated_content  (output storage)                   │
│   └── content_variants   (A/B test variants)                │
│                                                             │
│   ANALYTICS                                                 │
│   ├── events             (clicks, replies, calls)           │
│   ├── daily_stats        (aggregated metrics)               │
│   └── learning_history   (what the loop learned)            │
│                                                             │
│   VECTOR STORE                                              │
│   ├── kb_embeddings      (vectorized KB for RAG)            │
│   └── content_embeddings (vectorized generated content)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ TECH STACK

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, TailwindCSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Queue** | BullMQ + Redis |
| **AI Providers** | OpenAI, Anthropic (Claude), Google (Gemini) |
| **Embeddings** | OpenAI, Cohere |
| **Auth** | Supabase Auth + JWT |

---

*Document: Technical Architecture | January 23rd, 2026*
