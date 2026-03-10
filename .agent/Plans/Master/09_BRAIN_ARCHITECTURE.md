# 09 — Brain Architecture

**Source:** Our existing Brain system + Tommy's Mastery Agent Learning Architecture + Oraya Brain Audit

---

## What the Brain Is Now

A working RAG + multi-agent chat system with:
- Multi-agent routing (Writer, Generalist — Analyst/Coach commented out)
- RAG pipeline with query expansion, hybrid vector+FTS, reranking, caching
- Org-scoped brain configs with version history
- KB sections as RAG context
- Citations returned with responses
- `BrainAIConfigService.assignBrainToUser()` — clone template to user

### What's broken
- Hardcoded OpenAI in RAG (bypasses provider abstraction)
- One-shot execution (no agentic loop)
- Learning Loop only updates KB metadata, not Brain config
- No knowledge gap detection
- No hallucination grounding check

---

## What the Brain Becomes

### Per-Partner Agent Stack
Each partner gets:
- **Identity layer** — who this Brain is, what partner it serves, offer/ICP context
- **Memory layer** — conversation history, decision logs, knowledge objects
- **Intelligence layer** — Mastery Agents (9 specialized workers)
- **Generation layer** — Market Writer (Brief/Flow/Email production)
- **Learning layer** — Local KB, signal processing, knowledge promotion

### Prompt Stack Architecture
Layered prompt assembly (from `prompt_layers` table):
1. **System layer** — immutable identity, core rules
2. **Partner layer** — partner-specific context, offer, ICP
3. **Belief layer** — current belief competition state, winning angles
4. **Tool layer** — available tools and calling conventions
5. **Context layer** — RAG-retrieved knowledge, conversation history

Assembled by `PromptAssembler` service at runtime.

### Tool Registry
From `brain_tools` table. Each tool:
- Name, description, parameter schema
- Execution handler (ToolExecutor)
- Permission level (which agent can call which tool)

Current seed tools:
- kb_search, generate_email, analyze_signals, promote_belief
- search_leads, check_belief_status, update_kb

---

## The Agentic Loop (to be built)

Current: classify intent → pick agent → one RAG call → one LLM call → done.

Target:
```
User input
  → Agent receives input + prompt stack
  → Agent decides: do I need a tool?
  → Call tool (generate_email / search_leads / check_belief_status)
  → Observe tool result
  → Decide: am I done, or do I need another tool?
  → Loop until answer is ready
  → Return to user
```

Requires:
- Function calling (OpenAI tools, Anthropic tool_use, Gemini function declarations)
- Tool dispatch through ToolExecutor
- Maximum iteration limit (prevent infinite loops)
- Token budget tracking

---

## Knowledge Gap Detection

When RAG returns:
- Zero relevant docs → flag as knowledge gap
- Low relevance score (below threshold) → flag as weak coverage
- Contradictory docs → flag for resolution

Knowledge gaps stored in `knowledge_gaps` table with:
- Query that triggered the gap
- Gap type (missing, weak, contradictory)
- Partner context
- Timestamp
- Resolution status

Gap filling:
- Phase 6: Manual (superadmin reviews and fills)
- Phase 9: Automated (RUST Brain overnight research)

---

## Self-Healing Loop

### Nightly cycle (worker)
1. Read `signal_event` for each partner (last 24h)
2. For each belief with new signal:
   - Recalculate confidence score
   - If score changed materially → update `belief.confidence_score`
   - If angle is winning → boost angle weight in Local KB
   - If angle is losing → reduce weight, flag for review
3. Check `knowledge_gaps` queue → if RUST Brain available, dispatch research jobs
4. Update partner Brain config with fresh learning
5. Log all changes to `brain_dream_logs`

### Key rule
The self-healing loop writes to **Local KB only**. It does not promote to Global. It does not modify locked constraints. It does not change the prompt system layer.

---

## RUST Brain Integration (Phase 9, optional)

The Oraya RUST Brain has capabilities the JS Brain lacks:
- FTS5 + vector search with proper chunking
- Embeddings with reflection
- Knowledge gap detection with research mode
- Tool resonance scoring
- Sleep-mode overnight research

### Integration model
- JS Brain is the **runtime** (handles live chat, real-time decisions)
- RUST Brain is the **overnight engine** (deep analysis, gap research, reflection)
- Nightly: JS Brain sends signal batches to RUST Brain
- RUST Brain returns: KB update suggestions, gap fill recommendations, reflection summaries
- JS Brain applies validated updates to Local KB

They work together. Neither replaces the other.

---

## Provider Abstraction Fix (Phase 0)

All LLM calls must route through `AIProviderService`:
- RAG query expansion → provider.generate()
- RAG reranking → provider.generate()
- Agent execution → provider.chat() with function calling
- Reply classification → provider.generate()
- Embeddings → provider.embed()

No direct `fetch('https://api.openai.com/...')` anywhere in the Brain pipeline.

---

## Deployment Model

### Template → Clone
1. Superadmin builds Brain template (prompt stack, tools, provider chain)
2. On partner onboarding: `BrainAIConfigService.assignBrainToUser()` clones template
3. Clone gets: partner-specific identity layer, empty Local KB, tool permissions
4. Over time: Local KB fills with partner-specific learning
5. Brain improves per-partner without affecting other partners

### Feature Gating
| Tier | Brain Access |
|------|-------------|
| Basic | No chat, brain operates silently (writes emails, processes signals) |
| Medium | Chat enabled, training enabled |
| Enterprise | Full access: chat, train, write emails, feed custom data, flow builder |
