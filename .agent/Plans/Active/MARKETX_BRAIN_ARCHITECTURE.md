# MarketX Brain — Real Architecture Plan
**Version:** 1.0  
**Date:** March 2026  
**Constraint:** Multi-tenant SaaS. Supabase (Postgres) only. No SQLite. No desktop.

---

## The Core Principle

Oraya's Brain is brilliant but it's built for one person on one machine.  
MarketX needs the same intelligence applied to many clients, all isolated, all improving simultaneously.

**What you take from Oraya:** the *patterns* — agentic loop, gap tracking, self-reflection, resonance scoring, hallucination checking, provider routing.  
**What you rebuild for MarketX:** the *plumbing* — Supabase tables with RLS, BullMQ workers, per-client isolation via `org_id`, Postgres vector search instead of SQLite FTS5.

---

## The MarketX Brain: What It Actually Is

Each client gets a **logical Brain instance** — not a separate database, but a fully isolated slice of Supabase via Row-Level Security.

```
MarketX Brain (per org/user)
├── Identity Layer
│   ├── Core prompt (brand voice, guardrails, offer definition)
│   ├── ICP definition (who we're targeting)
│   └── Belief state (which angles are winning for this client)
│
├── Memory Layer (Supabase, RLS-scoped)
│   ├── Semantic memories (embeddings table, org_id scoped)
│   ├── Conversation history (messages table)
│   ├── Knowledge gaps (knowledge_gaps table, per org)
│   └── Reflections (reflections table, per org)
│
├── Intelligence Layer
│   ├── RAG (pgvector hybrid search, org-scoped)
│   ├── Agentic loop (real tool-calling, up to 20 turns)
│   ├── Hallucination interceptor (validate tools before execution)
│   └── Provider routing (priority fallback, org can override model)
│
├── Generation Layer
│   ├── Email generation (belief-bound, angle-class tagged)
│   ├── Destination page generation
│   └── Social content generation
│
└── Learning Layer (BullMQ workers, nightly)
    ├── Signal ingestion (Mailgun webhook → signal_event)
    ├── Belief scoring (winning beliefs boost angle weights in KB)
    ├── Gap detection (low RAG confidence → knowledge_gap record)
    ├── Self-reflection (generation batch → quality analysis)
    └── Dream consolidation (pattern analysis → KB updates)
```

---

## Supabase Schema: New Tables Needed

These are IN ADDITION to the RS:OS tables (Brief, Belief, Flow, Signal, etc.) from the roadmap.

### Brain Memory Tables

```sql
-- Per-org memories (replaces Oraya's per-agent memory.db)
CREATE TABLE brain_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),          -- optional: user-level memories
  scope TEXT NOT NULL DEFAULT 'org',          -- 'org' | 'user' | 'global'
  memory_type TEXT NOT NULL,                  -- 'fact' | 'preference' | 'outcome' | 'pattern'
  content TEXT NOT NULL,
  summary TEXT,
  keywords TEXT[] DEFAULT '{}',
  
  -- Emotional context (from Oraya — helps resonance scoring)
  emotional_valence FLOAT DEFAULT 0,          -- -1 to +1
  emotional_arousal FLOAT DEFAULT 0,          -- 0 to 1
  
  -- Belief attribution (MarketX-specific, not in Oraya)
  belief_id UUID REFERENCES beliefs(id),      -- which belief this memory relates to
  angle_class TEXT,                           -- which of the 7 angles
  
  -- Resonance
  resonance_score FLOAT DEFAULT 0,
  resonance_links UUID[] DEFAULT '{}',        -- IDs of related memories
  
  -- Importance
  importance FLOAT DEFAULT 0.5,
  decay_rate FLOAT DEFAULT 0.1,
  consolidation_count INT DEFAULT 0,
  accessed_count INT DEFAULT 0,
  
  source_conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only see their org's memories
ALTER TABLE brain_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON brain_memories
  USING (org_id = auth.jwt() ->> 'org_id'::text);

-- Vector index for semantic search
CREATE INDEX brain_memories_embedding_idx 
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WHERE source_type = 'brain_memory';
```

```sql
-- Knowledge gaps: what the Brain doesn't know
CREATE TABLE knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  domain TEXT NOT NULL,                       -- e.g. 'icp_industry', 'offer_objections'
  description TEXT NOT NULL,
  failed_queries TEXT[] DEFAULT '{}',         -- queries that triggered this gap
  occurrence_count INT DEFAULT 1,
  impact_level TEXT DEFAULT 'medium',         -- 'low' | 'medium' | 'high' | 'critical'
  status TEXT DEFAULT 'identified',           -- 'identified' | 'learning' | 'resolved' | 'dismissed'
  learning_resources TEXT[] DEFAULT '{}',     -- what was added to fill the gap
  resolution_notes TEXT,
  first_identified TIMESTAMPTZ DEFAULT now(),
  last_identified TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON knowledge_gaps
  USING (org_id = auth.jwt() ->> 'org_id'::text);
```

```sql
-- Self-reflections: post-generation quality analysis
CREATE TABLE brain_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  trigger_type TEXT NOT NULL,                 -- 'generation_batch' | 'signal_batch' | 'conversation'
  trigger_id UUID,                            -- e.g. brief_id or conversation_id
  
  quality_score FLOAT,                        -- 0.0-1.0 from LLM
  what_went_well TEXT,
  what_could_improve TEXT,
  knowledge_gaps_identified TEXT[] DEFAULT '{}',
  learning_points TEXT[] DEFAULT '{}',
  angle_insights JSONB DEFAULT '{}',          -- e.g. {"problem_reframe": {"score": 0.8, "verdict": "working"}}
  belief_insights JSONB DEFAULT '{}',         -- e.g. {"champion": "holding", "challenger": "losing"}
  
  analysis_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

```sql
-- Dream logs: nightly consolidation runs
CREATE TABLE brain_dream_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',              -- 'running' | 'complete' | 'error'
  trigger TEXT DEFAULT 'nightly',             -- 'nightly' | 'manual' | 'signal_threshold'
  
  signals_processed INT DEFAULT 0,
  memories_created INT DEFAULT 0,
  patterns_discovered INT DEFAULT 0,
  gaps_identified INT DEFAULT 0,
  beliefs_reweighted INT DEFAULT 0,
  
  narrative TEXT,                             -- LLM-generated synthesis (not a template)
  topics TEXT[] DEFAULT '{}'
);
```

```sql
-- Tool definitions (from DB, not hardcoded — Oraya's Master Rule #1)
CREATE TABLE brain_tools (
  name TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  tier_required TEXT DEFAULT 'basic',         -- 'basic' | 'medium' | 'enterprise'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Which tools each org has access to (based on their plan)
CREATE TABLE brain_tool_grants (
  org_id UUID REFERENCES organizations(id),
  tool_name TEXT REFERENCES brain_tools(name),
  granted_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, tool_name)
);
```

```sql
-- Per-org Brain config (replaces BrainConfigService)
-- Extends the existing org_brain_assignments + brain_templates
ALTER TABLE org_brain_assignments ADD COLUMN IF NOT EXISTS 
  preferred_provider TEXT,                    -- override the default LLM provider
  preferred_model TEXT,                       -- override the model
  tool_grants TEXT[] DEFAULT '{}',            -- which tools this org can use
  gap_detection_threshold FLOAT DEFAULT 0.65, -- RAG confidence below this = flag gap
  reflection_trigger_count INT DEFAULT 5,     -- generate reflection after N email sends
  dream_trigger_signals INT DEFAULT 20;       -- run dream after N new signal events
```

---

## The Agentic Loop (Port from Oraya, Built in TypeScript)

This replaces the current one-shot RAG + LLM call in `BrainOrchestrator.ts`.

```typescript
// BrainOrchestrator.ts — new handleTurn method

const MAX_TURNS = 20;

async function handleTurn(context: {
  messages: ChatMessage[];
  systemPrompt: string;
  tools: ToolDefinition[];     // loaded from brain_tools table
  orgId: string;
  userId?: string;
  conversationId: string;
  preferredProvider?: string;  // per-org override
}): Promise<{ response: string; toolCallsMade: ToolCallRecord[]; turnsUsed: number }> {

  let turn = 0;
  const toolCallsMade: ToolCallRecord[] = [];
  const messages = [...context.messages];

  while (turn < MAX_TURNS) {
    turn++;

    // 1. Send to AI (use org's preferred provider if set, else fall through priority chain)
    const response = await AIProviderService.generate(
      context.preferredProvider ?? 'auto',
      messages,
      { tools: context.tools, systemPrompt: context.systemPrompt }
    );

    // 2. Hallucination check BEFORE executing any tools
    const checkedResponse = await HallucinationInterceptor.check(response, context.tools);
    if (checkedResponse.type === 'retry') {
      messages.push({ role: 'tool', content: checkedResponse.feedback });
      continue; // loop back, don't execute fake tools
    }

    // 3. If no tool calls → we're done
    if (checkedResponse.toolCalls.length === 0) {
      return { response: response.content, toolCallsMade, turnsUsed: turn };
    }

    // 4. Execute each tool
    for (const toolCall of checkedResponse.toolCalls) {
      // Permission check first
      const allowed = await checkToolPermission(context.orgId, toolCall.name);
      if (!allowed) {
        messages.push({ role: 'tool', toolCallId: toolCall.id, content: 'PERMISSION_DENIED' });
        continue;
      }

      const result = await executeMarketXTool(toolCall.name, toolCall.arguments, context);
      messages.push({ role: 'tool', toolCallId: toolCall.id, content: JSON.stringify(result) });
      toolCallsMade.push({ name: toolCall.name, args: toolCall.arguments, result, success: true });
    }
    // Loop back with tool results appended
  }

  // Exhausted turns — return whatever we have
  return { response: messages[messages.length - 1].content ?? '', toolCallsMade, turnsUsed: turn };
}
```

---

## The MarketX-Specific Tool Set

These are the tools the Brain can call. Loaded from `brain_tools` table. Not hardcoded.

```typescript
// Tools the Brain has access to (stored in brain_tools table as rows)

const MARKETX_TOOLS = [
  {
    name: "generate_email",
    description: "Generate an email for a specific belief and angle",
    parameters: { belief_id, angle_class, recipient_context, flow_position },
    tier: "basic"
  },
  {
    name: "analyze_signals",
    description: "Get signal performance for a belief in a time window",
    parameters: { belief_id, days, metric_type },
    tier: "basic"
  },
  {
    name: "check_belief_status",
    description: "Get the current promotion state and confidence score for a belief",
    parameters: { belief_id },
    tier: "basic"
  },
  {
    name: "search_kb",
    description: "Semantic search in the org's knowledge base",
    parameters: { query, top_k, filter_section },
    tier: "basic"
  },
  {
    name: "record_knowledge_gap",
    description: "Record that the KB is missing information about a domain",
    parameters: { domain, description, impact_level },
    tier: "basic"
  },
  {
    name: "search_leads",
    description: "Search for qualified leads matching the ICP",
    parameters: { icp_id, limit, filters },
    tier: "medium"
  },
  {
    name: "get_brief_lineage",
    description: "Get the full history of a brief and its belief evolution",
    parameters: { brief_id },
    tier: "medium"
  },
  {
    name: "suggest_angle",
    description: "Suggest which angle to use given ICP and current signal data",
    parameters: { icp_id, recent_signals },
    tier: "medium"
  },
  {
    name: "update_kb_section",
    description: "Add or update a KB section with new content",
    parameters: { section, content, source },
    tier: "enterprise"
  },
  {
    name: "promote_belief",
    description: "Manually trigger belief promotion if all gates pass",
    parameters: { belief_id, reason },
    tier: "enterprise"
  }
];
```

---

## The Hallucination Interceptor (Port from Oraya)

```typescript
// src/services/brain/HallucinationInterceptor.ts

export class HallucinationInterceptor {
  static async check(
    response: LLMResponse,
    availableTools: ToolDefinition[]
  ): Promise<{ type: 'pass' | 'corrected' | 'retry'; toolCalls: ToolCall[]; feedback?: string }> {
    
    if (response.toolCalls.length === 0) return { type: 'pass', toolCalls: [] };
    
    const availableNames = new Set(availableTools.map(t => t.name));
    const valid: ToolCall[] = [];
    const fake: string[] = [];

    for (const call of response.toolCalls) {
      if (availableNames.has(call.name)) {
        valid.push(call);
      } else {
        fake.push(call.name);
        log.warn(`[HallucinationInterceptor] Fake tool: '${call.name}'`);
      }
    }

    if (valid.length === 0 && fake.length > 0) {
      return {
        type: 'retry',
        toolCalls: [],
        feedback: `SYSTEM: You called tools that don't exist: [${fake.join(', ')}]. ` +
                  `Only use tools from your provided list. If you can't complete the task, explain what you need.`
      };
    }

    if (fake.length > 0) {
      return { type: 'corrected', toolCalls: valid }; // filter fakes, keep valid
    }

    return { type: 'pass', toolCalls: valid };
  }
}
```

---

## Gap Detection in RAG (Port from Oraya)

When `RAGOrchestrator` returns low-confidence results, instead of silently generating anyway:

```typescript
// RAGOrchestrator.ts — add after document retrieval

const result = await retrieve(query, context);

// Gap detection (from Oraya's pattern)
const GAP_THRESHOLD = orgConfig.gap_detection_threshold ?? 0.65;
const topScore = result.documents[0]?.relevanceScore ?? 0;

if (topScore < GAP_THRESHOLD || result.documents.length === 0) {
  // Record the gap
  await supabase.from('knowledge_gaps').upsert({
    org_id: context.orgId,
    domain: inferDomain(query),               // 'icp_targeting', 'offer_objections', etc.
    description: `No confident KB match for: "${query.slice(0, 100)}"`,
    failed_queries: [query],
    impact_level: 'medium',
    last_identified: new Date().toISOString()
  }, { onConflict: 'org_id,domain,status' });  // dedup by domain
  
  // Return gap flag so the Brain can decide whether to proceed or ask for more info
  return { ...result, gapDetected: true, gapDomain: inferDomain(query) };
}
```

---

## Self-Reflection (Port from Oraya, MarketX Context)

Triggered NOT after conversations (Oraya's trigger) but after each email generation batch.

```typescript
// apps/workers/src/workers/brain-reflection-worker.ts

// Triggered by: POST /api/brain/reflect  called after each generation batch
// Job data: { org_id, brief_id, emails_sent_count, batch_id }

async function reflect(job: Job) {
  const { orgId, briefId, emailsSentCount } = job.data;
  
  // Check if we have enough to reflect on (Oraya's gate pattern)
  if (emailsSentCount < 5) return; // not enough data yet
  
  // Get recent signals for this brief (last 7 days)
  const signals = await getRecentSignals(orgId, briefId);
  
  // Get belief states
  const beliefs = await getBeliefStatus(briefId);
  
  // Build reflection prompt
  const prompt = buildReflectionPrompt({ beliefs, signals, briefId });
  
  // Call LLM (use org's preferred provider)
  const response = await AIProviderService.generate(orgId, prompt, { 
    systemPrompt: REFLECTION_SYSTEM_PROMPT 
  });
  
  // Parse structured JSON response
  const reflection = parseReflectionJSON(response.content);
  if (!reflection.hasSubstance) return; // nothing meaningful to store
  
  // Store in brain_reflections
  await supabase.from('brain_reflections').insert({
    org_id: orgId,
    trigger_type: 'generation_batch',
    trigger_id: briefId,
    quality_score: reflection.qualityScore,
    what_went_well: reflection.whatWentWell,
    what_could_improve: reflection.whatCouldImprove,
    knowledge_gaps_identified: reflection.knowledgeGaps,
    learning_points: reflection.learningPoints,
    angle_insights: reflection.angleInsights,
    belief_insights: reflection.beliefInsights
  });
  
  // Auto-record any gaps the reflection identified
  for (const gap of reflection.knowledgeGaps) {
    await recordKnowledgeGap(orgId, gap);
  }
}

const REFLECTION_SYSTEM_PROMPT = `
You are analyzing the performance of a marketing email system for a B2B client.
You have access to signal data (replies, bookings, clicks) and belief states.
Respond with valid JSON only:
{
  "hasSubstance": boolean,
  "qualityScore": 0.0-1.0,
  "whatWentWell": "string",
  "whatCouldImprove": "string",
  "knowledgeGaps": ["string"],
  "learningPoints": ["string"],
  "angleInsights": { "angle_name": { "score": 0.0-1.0, "verdict": "string" } },
  "beliefInsights": { "champion_verdict": "string", "challenger_verdict": "string" }
}
`;
```

---

## The Dream Consolidation Worker (Port from Oraya, Rebuilt for MarketX)

In Oraya: triggered by consciousness state change.  
In MarketX: triggered nightly by BullMQ scheduler after signal data for the day is ready.

```typescript
// apps/workers/src/workers/dream-consolidation-worker.ts
// Runs: nightly at 2am, per org that has had > N new signals

// PHASE 1: Extract patterns
const signalsSince = await getSignalsSinceLastDream(orgId);
if (signalsSince.count < minSignalsThreshold) return; // skip if quiet day

// PHASE 2: Analyse (port of Oraya's ResonanceEngine pattern)
const patterns = await analyzeBeliefPatterns(orgId, signalsSince);
// patterns = { winningBeliefs, losingBeliefs, dominantAngles, emergingICP, gaps }

// PHASE 3: Consolidate memories (Supabase, not SQLite)
const newMemories = await consolidateToMemories(orgId, patterns);
// Creates entries in brain_memories with:
// - belief_id reference
// - angle_class
// - emotional_valence (positive = winning, negative = losing)
// - keywords from signal patterns

// PHASE 4: Reweight KB (the actual learning)
for (const winningBelief of patterns.winningBeliefs) {
  // Boost embeddings for this belief's angle class in the KB
  await boostKBEmbeddings(orgId, winningBelief.angle_class, 0.15);
  // Update KB metadata: this angle is working
  await updateKBMetadata(orgId, 'learned_angle_weights', { 
    [winningBelief.angle_class]: { boost: 0.15, reason: 'signal_data', updated: now() }
  });
}

// PHASE 5: Generate narrative via LLM (Oraya's real dream narrative — not a template)
const narrative = await generateDreamNarrative(orgId, {
  signalsProcessed: signalsSince.count,
  patterns,
  newMemories: newMemories.length,
  topTopics: patterns.dominantAngles.slice(0, 5)
});

// PHASE 6: Store dream log
await supabase.from('brain_dream_logs').insert({
  org_id: orgId,
  status: 'complete',
  ended_at: new Date().toISOString(),
  signals_processed: signalsSince.count,
  memories_created: newMemories.length,
  patterns_discovered: patterns.total,
  beliefs_reweighted: patterns.winningBeliefs.length,
  narrative,
  topics: patterns.dominantAngles
});
```

---

## The Provider System (Fix MarketX, Follow Oraya's Pattern)

Oraya's `ProviderManager` reads from DB and routes in priority order. MarketX needs the same.

```typescript
// src/services/ai/AIProviderService.ts — REBUILD

class AIProviderService {
  // Gets sorted configs from ai_providers table (not hardcoded)
  static async getSortedProviders(orgId: string): Promise<ProviderConfig[]> {
    const { data } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_enabled', true)
      .not('api_key_encrypted', 'is', null)
      .order('priority', { ascending: true });
    return data ?? [];
  }

  // Generate with automatic fallback (Oraya's pattern)
  static async generate(orgId: string, messages: ChatMessage[], options: GenerateOptions): Promise<LLMResponse> {
    const providers = await this.getSortedProviders(orgId);
    
    for (const provider of providers) {
      try {
        const result = await this.callProvider(provider, messages, options);
        await this.recordSuccess(provider.id, result.usage);
        return result;
      } catch (error) {
        await this.recordFailure(provider.id, error);
        // After 3 failures → auto-disable provider
        await this.checkAutoDisable(provider.id);
        continue; // try next provider
      }
    }
    
    throw new Error('All configured AI providers failed');
  }

  // RAG-specific: use embedding provider, not chat provider
  static async embed(orgId: string, text: string): Promise<number[]> {
    const providers = await this.getEmbeddingProviders(orgId);
    // Same fallback pattern...
  }
}
```

---

## The Resonance Scoring Formula (Port from Oraya for Belief Ranking)

Oraya uses this to link memories. MarketX uses the same formula to rank which beliefs/angles are most resonant with each ICP.

```typescript
// src/lib/brain/resonance-scorer.ts

function scoreBeliefResonance(
  belief: Belief,
  signals: SignalEvent[],
  icp: ICP,
  embeddingSimilarity: number  // from pgvector cosine search
): number {
  // Ported from Oraya's ResonanceEngine
  
  // 0.50 — semantic similarity (embedding cosine)
  const semanticScore = embeddingSimilarity * 0.50;
  
  // 0.20 — keyword overlap (Jaccard) between belief text and ICP description
  const beliefKeywords = extractKeywords(belief.content);
  const icpKeywords = extractKeywords(icp.firmographics_json);
  const jaccardScore = jaccardSimilarity(beliefKeywords, icpKeywords) * 0.20;
  
  // 0.15 — signal performance score (positive replies/bookings = high valence)
  const signalScore = computeSignalValence(signals) * 0.15;
  
  // 0.15 — recency (decay over 30 days — recent signals weighted more)
  const recencyScore = temporalDecay(signals, 30) * 0.15;
  
  return semanticScore + jaccardScore + signalScore + recencyScore;
}
```

---

## Per-Client Isolation (RLS, Not File Separation)

Oraya separates agents by file (`memories/{agent_id}-memory.db`).  
MarketX separates clients by `org_id` with Postgres RLS.

```sql
-- Every brain table has RLS. One policy per table.
-- Pattern is the same everywhere:

CREATE POLICY "org_brain_isolation" ON brain_memories
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Superadmin can see everything
CREATE POLICY "superadmin_override" ON brain_memories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
  );
```

**What this means in practice:**
- An org's Brain can only see that org's memories, gaps, reflections
- A user's personal brain memories (scope = 'user') are only visible to that user
- Global winners (scope = 'global') are visible to all orgs (benchmark data)
- Superadmin can inspect any org's Brain state for debugging

---

## Worker Architecture (BullMQ)

New workers needed:

```typescript
// New BullMQ queues to add to apps/workers/src/config/queues.ts

QueueName.BRAIN_REFLECTION      = 'brain-reflection'
QueueName.BRAIN_DREAM           = 'brain-dream-consolidation'
QueueName.BRAIN_GAP_FILL        = 'brain-gap-fill'
QueueName.BRAIN_KB_REWEIGHT     = 'brain-kb-reweight'
```

**Trigger schedule:**
| Worker | When | Input |
|---|---|---|
| `brain-reflection` | After each generation batch (≥5 emails) | `{ org_id, brief_id }` |
| `brain-dream-consolidation` | Nightly 2am per active org | `{ org_id }` |
| `brain-gap-fill` | On demand when gap detected | `{ org_id, gap_id }` |
| `brain-kb-reweight` | After promotion gate passes | `{ org_id, belief_id, direction }` |

---

## The Complete Self-Healing Loop

```
[EMAIL GENERATION]
Brain.generate(belief_id, angle_class, recipient)
  → HallucinationInterceptor checks tools
  → search_kb tool called (RAG)
    → If confidence < 0.65: record knowledge_gap
  → generate_email tool called
  → Email stored in flow_step with belief_id + angle_class tag
  → Queues: brain-reflection job (if batch size ≥ 5)

[EMAIL DELIVERY]
Mailgun sends → webhook fires → POST /api/webhooks/mailgun/events
  → Insert into signal_event (belief_id, icp_id, event_type, timestamp)

[NIGHTLY CONSOLIDATION — 2am]
brain-dream-consolidation worker:
  1. Aggregate signal_events since last dream per belief
  2. Score beliefs using resonance formula
  3. Detect patterns: which angles won, which ICP segments responded
  4. Reweight KB embeddings: boost winning angle sections
  5. Update belief confidence_scores + promotion_state_machine check
  6. Generate LLM dream narrative ("Here's what we learned today...")
  7. Store in brain_dream_logs + new brain_memories

[AFTER GENERATION BATCH]
brain-reflection worker:
  1. Compare what was generated vs what signals came back
  2. LLM structured reflection: quality_score, gaps, angle_insights
  3. Auto-record any new knowledge_gaps identified
  4. Store in brain_reflections

[NEXT GENERATION CYCLE]
Brain loads:
  - KB with reweighted angle sections (boosted from last dream)
  - knowledge_gaps (avoids regenerating content in known gap areas)
  - brain_reflections (context on what worked last time)
  → Better output. Every cycle.
```

---

## The 3-Tier Client View (What Each Tier Can Use)

| Brain Feature | Basic | Medium | Enterprise |
|---|---|---|---|
| RAG-grounded generation | ✅ | ✅ | ✅ |
| Hallucination interceptor | ✅ | ✅ | ✅ |
| Gap detection | ✅ | ✅ | ✅ |
| Nightly dream consolidation | ✅ | ✅ | ✅ |
| Brain chat (talk to your Brain) | ❌ | ✅ | ✅ |
| Self-reflection reports | ❌ | ✅ | ✅ |
| Knowledge gap dashboard | ❌ | ✅ | ✅ |
| Manual KB training | ❌ | ✅ | ✅ |
| Custom angle weighting | ❌ | ❌ | ✅ |
| Full belief lineage view | ❌ | ❌ | ✅ |
| Custom tools | ❌ | ❌ | ✅ |
| Preferred model override | ❌ | ❌ | ✅ |

---

## Build Order (What to Do First)

**Sprint 1 — Fix the foundation:**
1. Fix hardcoded OpenAI: implement `AIProviderService.generate()` with DB-sorted fallback
2. Add `HallucinationInterceptor` as a step in `BrainOrchestrator`
3. Add gap detection in `RAGOrchestrator` (3 lines after document retrieval)

**Sprint 2 — New tables + worker scaffolding:**
1. Run migrations: `brain_memories`, `knowledge_gaps`, `brain_reflections`, `brain_dream_logs`, `brain_tools`
2. Add 4 new BullMQ queues + empty workers
3. Load tools from `brain_tools` table instead of hardcoded objects

**Sprint 3 — Real agentic loop:**
1. Replace `BrainOrchestrator.process()` with the `handleTurn()` loop
2. Wire MarketX-specific tools: `generate_email`, `analyze_signals`, `check_belief_status`, `search_kb`
3. Tool permission check via `brain_tool_grants` table

**Sprint 4 — Reflection + consolidation:**
1. `brain-reflection-worker`: post-batch LLM quality analysis
2. `brain-dream-consolidation-worker`: nightly pattern analysis + KB reweighting
3. Wire dream trigger: after nightly signal aggregation → queue dream job

**Sprint 5 — Client-facing:**
1. Knowledge gap dashboard (Medium+ tier)
2. Self-reflection report view (Medium+ tier)
3. "Your Brain learned X things this week" card on member dashboard
4. Brain chat wired through real agentic loop (not old one-shot)

---

## What NOT to Port from Oraya

| Oraya Feature | Why Not |
|---|---|
| SQLite / file-based DBs | All data in Supabase |
| Consciousness states (Active/Dreaming/Away) | Replaced by BullMQ scheduled jobs |
| Local AI / llama.cpp | Cloud providers only for SaaS |
| Desktop tools (filesystem, screen control, reminders) | Not applicable to web |
| MCP server/client | Not needed (direct API) |
| VPS sync | Everything in Supabase |
| License/compliance engine | Supabase plan tier via RLS |
| Token wallet | Track via `ai_usage_log` table (already exists) |
| Rhythm/heartbeat | BullMQ cron replaces this |

---

## Single Source of Truth

All of this is now documented in:
- `MARKETERX_COMPLETE_ROADMAP.md` — the full build sequence
- `ORAYA_BRAIN_AUDIT.md` — what Oraya has and what to take from it
- `MARKETX_BRAIN_ARCHITECTURE.md` (this file) — the actual MarketX-specific architecture

When building, read this file first. Build in the order defined in the Build Order section above.
