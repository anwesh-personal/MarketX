# Oraya Brain — Comprehensive Audit
**Date:** March 2026  
**Source:** `/Users/anweshrath/Documents/Cursor/Neeva Pilot/Oraya/src-tauri/`  
**What it is:** A Tauri desktop app (Rust backend + React frontend). The Rust backend IS the Brain.

---

## TL;DR — What Oraya Has That MarketX's Brain Doesn't

| Capability | Oraya (RUST) | MarketX Brain (JS) |
|---|---|---|
| Real agentic loop (tool calls → observe → loop) | ✅ Up to 25 turns | ❌ One shot |
| Real tool registry (DB-loaded, not hardcoded) | ✅ Dynamic from DB | ❌ Hardcoded per-agent |
| Hallucination interceptor (fake tool detection) | ✅ InterceptorChain | ❌ None |
| Knowledge gap tracking | ✅ knowledge_gaps table per agent | ❌ None |
| Self-reflection after conversations | ✅ triggered at 5 msgs or 800 chars | ❌ None |
| Dream state (real LLM consolidation) | ✅ triggered on consciousness state | ❌ Stub (hardcoded string) |
| Memory with emotional valence + arousal | ✅ per memory in agent DB | ❌ None |
| Resonance engine (semantic memory linking) | ✅ cosine + jaccard + temporal + emotional | ❌ None |
| Realtime memory injection (<500ms, LRU cache) | ✅ RealtimeResonance | ❌ None |
| Per-agent isolated DB (not shared) | ✅ each agent has own memory.db | ❌ Shared embeddings table |
| Local AI (llama.cpp + Ollama + GPU detection) | ✅ full local inference | ❌ None |
| Multi-provider proper fallback | ✅ 9 providers, priority-sorted from DB | ❌ Hardcoded OpenAI everywhere |
| MCP protocol (inbound + outbound) | ✅ both directions, SSE + stdio | ❌ None |
| VPS sync (encrypted, AES-256-GCM) | ✅ optional, research data only | ❌ None |
| Agent compliance/tier gating | ✅ license-aware agent disabling | ❌ None |
| Proactive engine (scheduled tasks) | ✅ schedule tasks, rhythm heartbeat | ❌ None |
| Context builder (entity extraction, knowledge graph) | ✅ extracts entities via LLM | ❌ None |
| Token wallet (cost tracking per call) | ✅ per-agent budget enforcement | ❌ None |
| Security enforcer (permission checks before every tool) | ✅ before every tool call | ❌ None |
| Consciousness states (Active/Dreaming/Away) | ✅ rhythm integration | ❌ None |

---

## Architecture Overview

```
Oraya Desktop App
├── React Frontend (Vite + Tauri API)
│   └── Calls Tauri commands → Rust backend
│
└── Rust Backend (src-tauri/src/)
    │
    ├── ai/
    │   ├── Orchestrator         ← THE AGENTIC LOOP (up to 25 turns)
    │   └── interceptors/
    │       └── HallucinationChecker  ← validates tool calls before execution
    │
    ├── brain/
    │   ├── DreamStateManager    ← background memory consolidation (triggered on state entry)
    │   └── RealtimeResonance    ← fast memory injection (<500ms, LRU cache)
    │
    ├── cognition/
    │   ├── KnowledgeGapTracker  ← records + tracks what agents don't know
    │   ├── SelfReflection       ← post-conversation quality analysis via LLM
    │   ├── ContextBuilder       ← entity extraction → knowledge graph
    │   ├── ProactiveEngine      ← schedules and runs proactive tasks
    │   └── InterestTracker      ← what topics the user cares about
    │
    ├── memory/
    │   ├── MemoryManager        ← per-agent SQLite DB (memories/{agent}-memory.db)
    │   ├── ResonanceEngine      ← semantic linking (cosine + jaccard + emotional + temporal)
    │   ├── EmotionalTracker     ← valence + arousal per memory
    │   └── KeywordExtractor     ← local keyword extraction (no API needed)
    │
    ├── orchestration/
    │   ├── TaskEngine           ← background task poller (5s interval, Ephemeral Swarm mode)
    │   └── TaskRunner           ← runs individual tasks with full Orchestrator
    │
    ├── services/
    │   ├── ProviderManager      ← 9 providers, DB-sorted priority, auto-fallback
    │   ├── EmbeddingService     ← multi-provider embeddings (Gemini/OpenAI/Mistral)
    │   ├── VectorStore          ← local SQLite vector store with cosine search
    │   └── providers/
    │       ├── openai, anthropic, gemini, mistral, deepseek
    │       ├── groq, ollama, perplexity
    │       └── local_ai         ← llama.cpp backend (GPU detection, local models)
    │
    ├── tools/
    │   ├── ToolRegistry         ← loaded from DB (no hardcoding)
    │   ├── ToolRouter           ← security check → executor → audit log
    │   └── executors/
    │       ├── macos/           ← filesystem, memory, notes, reminders, scheduling, screen_control, search, system, tasks
    │       ├── linux/           ← same
    │       ├── windows/         ← same
    │       └── common/          ← agents, image, mcp, research, vault, video, web
    │
    ├── mcp/
    │   ├── McpClient            ← outbound: connects to external MCP servers (GitHub, Notion, etc.)
    │   └── McpServer            ← inbound: IDEs connect to Oraya as an MCP server
    │
    ├── local_ai/
    │   ├── LocalAiEngine        ← manages loaded llama.cpp backends
    │   ├── LlamaCppBackend      ← GPU detection (CUDA/Metal/CPU)
    │   └── RemoteOpenAIBackend  ← OpenAI-compatible API backend
    │
    ├── db/ (SQLite: oraya.db = global, memories/{agent}-memory.db = per-agent)
    ├── sync/ (VPS sync client, AES-256-GCM encrypted)
    ├── license/ (tier gating, device fingerprinting, JWT tokens)
    ├── compliance/ (agent disabling based on license tier)
    ├── security/ (permission enforcement, audit logging)
    ├── rhythm/ (consciousness states: Active/Dreaming/Away)
    └── token_wallet/ (per-agent token budget, cost tracking)
```

---

## Module Deep-Dives

### 1. The Agentic Loop (`ai/orchestrator.rs`)

This is the most important piece. It's the real thing MarketX doesn't have.

**How it works:**
```
handle_turn(OrchestrationContext) → OrchestrationResult

while turn < MAX_TURNS (25):
  1. Send messages + tools to AI (preferred_provider or global active)
  2. Log exact request + response (detailed)
  3. If response has NO tool_calls → return final text (done)
  4. If response has tool_calls:
     a. Run through InterceptorChain (HallucinationChecker first)
     b. Execute each tool via ToolRouter (permission → executor → audit)
     c. Append tool result to message history
     d. Loop back to step 1
  5. If turn 25 reached → return whatever text we have
```

**Key features:**
- `preferred_provider` per agent — Ova uses Anthropic, Mara uses Gemini (true per-agent model routing)
- Full request/response logging at each turn
- Token accumulation across all turns
- Task ID for frontend progress events
- `InterceptorChain` runs before any tool execution (hallucination check is priority 10 — first)

**Interceptors:**
- `HallucinationChecker`: checks each tool call against ToolRegistry. If all fake → Retry with feedback message. If some fake → filter them out, execute valid ones. If all valid → pass through.

---

### 2. Dream State (`brain/dream_state.rs`)

NOT a timer — triggered exclusively when the agent transitions INTO the Dreaming consciousness state.

**Phases:**
1. `extraction` — fetch messages since last dream (from global oraya.db), grouped by conversation
2. `analysis` — `ResonanceEngine.analyze_dream_patterns()` → finds memory clusters, insights
3. `consolidation` — creates new Memory entries from key topics, links resonant memories
4. `synthesis` — generates genuine LLM narrative (not a template):
   - Feeds: conversation excerpt (≤3000 chars) + topics + pattern analysis + memory count
   - Returns: 3-5 sentence first-person reflection on what was actually discussed
   - Falls back to factual sentence only if LLM fails
5. Complete — updates dream_log in agent's memory.db

**Guards:**
- `should_trigger_dream()`: min 3 new messages since last dream AND min 5 min since last dream (configurable per agent)
- `cleanup_empty_logs()`: removes junk runs (zero topics, zero patterns, zero memories)

**Emotional context:** reads last 10 `emotional_states` (valence + arousal) and passes to analysis

---

### 3. Memory System (`memory/`)

**Two databases:**
- `oraya.db` — global (conversations, messages, agents, tools, providers)
- `memories/{agent_id}-memory.db` — per-agent (memories, dream_logs, knowledge_gaps, reflections, emotional_states)

**Memory struct:**
```rust
Memory {
    id, agent_id, scope (private/shared/hybrid), memory_type,
    content, summary, keywords,
    emotional_valence: f64,  // -1 to +1
    emotional_arousal: f64,  // 0 to 1
    emotional_tags: Vec<String>,
    resonance_score: f64,
    resonance_links: Vec<String>,  // IDs of related memories
    importance: f64,
    decay_rate: f64,
    consolidation_count: i32,
    source_conversation_id, circadian_phase,
    accessed_count, created_at, updated_at, source
}
```

**ResonanceEngine — semantic memory linking:**
Weighted similarity score per memory pair:
- 0.50 — cosine similarity of embeddings (via VectorStore)
- 0.20 — keyword overlap (Jaccard)
- 0.15 — emotional similarity (valence + arousal distance)
- 0.15 — temporal proximity (exponential decay over 30 days)

Threshold: 0.7 minimum similarity. Max 10 links per memory.

**RealtimeResonance — fast injection:**
- LRU cache (200 entries), target <500ms
- Hybrid: FTS5 text search (0.3 weight) + vector cosine (0.7 weight)
- Cache key: `{agent_id}:{normalized_query_truncated}:{limit}`
- Performance logging with warning if >500ms

---

### 4. Knowledge Gap Tracking (`cognition/knowledge_gap.rs`)

**What it does:** When a query fails or returns low-confidence results, the gap is recorded.

**Gap lifecycle:**
```
Identified → Learning → Resolved (or Dismissed)
```

**Gap record:**
- `domain` — what subject area the gap is in
- `description` — what's missing
- `failed_queries` — array of queries that triggered it (appended on repeat)
- `occurrence_count` — how many times this gap was hit
- `impact_level` — Low / Medium / High / Critical
- `learning_resources` — array of resources added to fill the gap
- `resolution_notes` — what fixed it

**Smart deduplication:** when a gap is recorded, checks if a gap with same domain + status (identified/learning) already exists → updates it instead of creating duplicate.

**Priority gaps:** sorted by impact_level DESC + last_identified DESC.

---

### 5. Self-Reflection (`cognition/self_reflection.rs`)

**Trigger condition:** `should_reflect()` — 5 user messages OR 800 chars since last reflection in that conversation.

**Process:**
1. Get conversation summary (last 50 messages)
2. Get agent name
3. Call LLM with structured prompt asking for JSON:
   ```json
   {
     "has_substance": bool,
     "quality_score": 0.0-1.0,
     "what_went_well": "string",
     "what_could_improve": "string",
     "knowledge_gaps": ["string"],
     "learning_points": ["string"]
   }
   ```
4. If `has_substance = false` → skip (don't waste DB space)
5. Store in agent's `reflections` table

**What gets extracted automatically:**
- Knowledge gaps identified during the conversation
- What the agent did well
- What it should improve
- Learning points for future sessions

---

### 6. Context Builder (`cognition/context_builder.rs`)

**Entity extraction via LLM:**
- Extracts: PEOPLE, PLACES, ORGANIZATIONS, PROJECTS, CONCEPTS, EVENTS, TOOLS
- Each entity: name, type, description, confidence (0-1)
- Builds a knowledge graph per conversation/agent

---

### 7. Tool System (`tools/`)

**ToolRegistry:** Tools loaded from DB (`tools` table) — not hardcoded. Dynamic. Enables/disables tools without code changes.

**ToolRouter:**
1. Permission check via `SecurityEnforcer.check_tool_permission(agent_id, tool_name)` — ALWAYS first
2. Route to OS-specific executor (macos/linux/windows)
3. Vault args redacted before audit log
4. Execution logged to `tool_executions` table (Master Rule #8: audit everything)

**Tool categories (per-OS executors):**
- `filesystem` — read, write, list, search files
- `memory` — save, recall, search agent memories
- `notes` — create, search notes
- `reminders` — schedule, list, complete reminders
- `scheduling` — calendar integration
- `screen_control` — screenshots, mouse/keyboard control
- `search` — web, file, system search
- `system` — run commands, process info
- `tasks` — create, assign, manage tasks
- `agents` — spawn, communicate with other agents
- `mcp` — call external MCP server tools
- `research` — web research via BrightData/Puppeteer
- `vault` — encrypted secrets storage

**Security model (protocol levels):**
- Each tool requires a protocol level (`protocol_required` in tools table)
- Each agent has a protocol (`protocol_id` in agents table)
- ToolRouter checks: does this agent's protocol grant access to this tool?
- No permission → immediate fail + audit log

---

### 8. Consciousness States / Rhythm (`rhythm/`)

**States:** Active → Dreaming → Away (and back)

**What triggers on state change:**
- Enter Dreaming → `DreamStateManager.trigger_on_dream_entry(agent_id)` → runs dream if conditions met
- `ProactiveEngine.execute_pending_tasks()` calls `RhythmIntegration.on_heartbeat()` on every cycle

**Time context:** time of day awareness for circadian-aware memory tagging

---

### 9. Provider System (`services/providers/`)

**9 registered providers:** local_ai, gemini, openai, anthropic, mistral, deepseek, ollama, groq, perplexity

**Priority routing:** reads from `providers` table (sorted by `priority ASC`), skips disabled or missing API key. First configured provider wins. Auto-fallback to next on failure.

**Per-agent provider override:** `Agent.preferred_provider` + `Agent.preferred_model` — each agent can use a different model. Orchestrator respects this when `preferred_provider` is set in `OrchestrationContext`.

**Local AI:** `llama.cpp` backend, GPU acceleration detection (CUDA / Metal / CPU fallback), model downloads, streaming token output via `TokenStream`.

**Embedding providers:** Gemini (768d), OpenAI (1536d), Mistral (1024d) — fallback to hash-based pseudo-embedding if none configured.

---

### 10. MCP Integration (`mcp/`)

**Inbound (server):** IDEs/tools connect to Oraya and use it as an MCP tool server. Oraya exposes its tool catalog via MCP protocol.

**Outbound (client):** Oraya connects to external MCP servers (GitHub, Linear, Notion, custom). Tool discovery via `tools/list`. Discovered tools injected into ToolRegistry. Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → 30s cap). Supports SSE and stdio transports.

---

### 11. VPS Sync (`sync/vps_client.rs`)

**What it syncs:** Research data, API keys (encrypted)

**Architecture:**
- Desktop SQLite = PRIMARY source (always)
- VPS = background sync only (when toggle enabled)
- Supabase = billing only (never research data)

**Security:** AES-256-GCM encryption for syncing API keys. Machine ID for device identification. Optional (disabled by default).

---

### 12. Agent Architecture (Multi-Agent)

**Agent types from schema:**
```rust
AgentRole: Admin | Supervisor | Assistant
AgentClassification: "platform" | "ephemeral" | "custom" | "system"
MemoryScope: Private | Shared | Hybrid
```

**Ephemeral Swarm:**
- When `ORAYA_ENABLE_EPHEMERAL_SWARM=true` + `ORAYA_SWARM_SIZE=N`
- TaskEngine runs N tasks concurrently via `tokio::task::JoinSet`
- Ephemeral agents auto-cleanup after task completion
- Orphaned ephemeral agents from crashes are reconciled on startup

**Agent ↔ Agent communication:**
- `tools/executors/common/agents.rs` — spawn agents, send messages between agents
- Parent-child agent hierarchy via `parent_agent_id` in agents table

**Compliance:**
- License tier determines which platform agents are available
- Plan downgrade → agents disabled (not deleted) with `disabled_reason = 'plan_downgrade'`
- Plan upgrade → agents automatically re-enabled

---

## What's NOT in Oraya That MarketX Needs

1. **Email generation** — Oraya generates general content, not belief-bound email flows
2. **Belief system** — No Champion/Challenger, no promotion ladder, no angle classes
3. **Signal ingestion** — No marketing analytics, no BOOKED_CALL/REPLY/CLICK events
4. **Multi-tenant** — Single user app, not SaaS with org/user hierarchy
5. **Mailgun/SMTP integration** — No email delivery
6. **Lead sourcing** — No Apollo/Hunter integration
7. **RS:OS schema** — None of the Brief/Belief/Flow/Signal tables

These are all things MarketX needs to build ON TOP OF Oraya's Brain capabilities.

---

## The Integration Strategy: What to Take and What to Build

### Take from Oraya (port to MarketX):

| Component | How to Port |
|---|---|
| **Agentic Loop** (`ai/orchestrator.rs`) | Port logic to `BrainOrchestrator.ts` — replace one-shot with real tool-calling loop |
| **HallucinationChecker** | Add as an interceptor step in `BrainOrchestrator` before tool execution |
| **KnowledgeGapTracker** | Add gap detection in `RAGOrchestrator` when relevance < threshold → write to gap table |
| **SelfReflection** | Add as a triggered worker in MarketX: after each email generation batch → reflect |
| **DreamState** (real LLM version) | Replace MarketX dream-state worker stub with Oraya's real pattern analysis + LLM narrative |
| **ResonanceEngine** (scoring formula) | Use the weighted scoring (cosine + jaccard + emotional + temporal) for MarketX belief scoring |
| **ProviderManager** (proper fallback) | Fix MarketX hardcoded OpenAI — port the priority-sorted DB routing pattern |
| **Memory per-agent isolation** | Per-user KB partition in MarketX (currently all orgs share embeddings table) |
| **Tool registry from DB** | Replace MarketX hardcoded agent tools with DB-loaded tool definitions |
| **Real tool-calling loop** | Add ReAct-style loop to MarketX agents (port from Orchestrator.handle_turn) |

### Build new for MarketX:

| Component | What it is |
|---|---|
| **BeliefBrainBridge** | When Brain generates email → tag with belief_id, angle_class |
| **SignalIngestion** | Mailgun webhook → signal_event → belief performance scoring |
| **BeliefPromotionEngine** | HYP→TEST→SW→IW→RW→GW state machine (no equivalent in Oraya) |
| **AngleResonance** | Which of the 7 angles is resonating per ICP — Oraya's resonance adapted to beliefs |
| **MultiTenantMemory** | Per-org/per-user isolation with shared global winner beliefs |
| **RustBrainSyncWorker** | Nightly: read signal_event → call Oraya-style pattern analysis → update MarketX KB |

---

## The Self-Healing Loop (How to Do It Right)

Combining Oraya's architecture with MarketX's RS:OS model:

```
[DAY]
Email generated with Belief_ID + Angle_Class
  ↓
Sent via Mailgun → signal_event table
  ↓
[NIGHTLY — RustBrainSyncWorker]
  1. Read signal_event for each client (last 24h)
  2. Aggregate by belief_id: booked_calls, replies, clicks
  3. Score beliefs (Oraya's scoring formula)
  4. KnowledgeGapTracker: find beliefs that keep getting low scores → flag domain gaps
  5. SelfReflection: "What did we send? What worked? What didn't? What KB section was missing?"
  6. Update embeddings: boost angle weights for winning beliefs in client's KB
  7. Update Brain config: winning angle_class gets higher priority in next generation
  ↓
[MORNING]
  New email generation uses updated KB → smarter output
```

**The key insight from Oraya:** the Dream State is triggered by a STATE CHANGE, not a timer. For MarketX, the equivalent is: the "dream" runs when signal data for the previous day is available (triggered at end-of-day by a scheduled job, not on a fixed timer).

---

## Oraya's "Master Rules" (Worth Adopting in MarketX)

1. **Database as Truth** — no hardcoding. Tools, providers, prompts, configs → all in DB
2. **Permission check before every tool** — no exceptions
3. **Audit every execution** — every tool call logged with args, result, duration
4. **Per-agent isolation** — each agent has own DB, own memory, own config
5. **Fail loud** — errors propagate immediately, not silently swallowed
6. **Stub = dead code** — if it's not implemented, it doesn't exist. No fake returns.

---

## Files to Read When Building

| What you're building | Read this in Oraya |
|---|---|
| Agentic loop for MarketX | `src-tauri/src/ai/orchestrator.rs` |
| Hallucination prevention | `src-tauri/src/ai/interceptors/hallucination.rs` |
| Knowledge gap system | `src-tauri/src/cognition/knowledge_gap.rs` |
| Self-healing after sends | `src-tauri/src/cognition/self_reflection.rs` |
| Real dream state | `src-tauri/src/brain/dream_state.rs` |
| Memory resonance scoring | `src-tauri/src/memory/resonance.rs` |
| Fast memory injection | `src-tauri/src/brain/realtime_resonance.rs` |
| Provider routing (fix hardcoded OpenAI) | `src-tauri/src/services/manager.rs` |
| Tool registry from DB | `src-tauri/src/tools/registry.rs` |
| Security enforcement model | `src-tauri/src/tools/router.rs` |
