# MarketX Brain — Production Build Plan
**Version:** 1.0 — FINAL  
**Date:** March 2026  
**Constraint:** No band-aids. No shortcuts. No stubs. Production from day one.  
**Philosophy:** Build the right thing once. Never rebuild.

---

## What We're Building

A **deployed Agent** — not a chatbot, not a wrapper around GPT.

Each client gets an Agent with:
- A locked **identity** (name, personality, role)
- A layered **prompt stack** (foundation → persona → domain → guardrails)
- An isolated **Knowledge Base** (their docs, their voice, their ICP)
- A configurable **tool set** (tier-gated, permission-checked)
- A **provider chain** (platform keys default, BYOK for enterprise)
- A **memory system** (long-term, emotional, resonance-linked)
- A **learning loop** (gets smarter from every send, every signal)

Superadmin builds the template. Clients get the clone. Most config is locked. Some is editable. Nothing breaks.

---

## The Prompt Stack Architecture

This is the most critical design decision. One giant system prompt is not production architecture. This is:

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: FOUNDATION PROMPT          [SUPERADMIN ONLY - LOCKED]
│  Role definition, core capabilities, what it IS      
│  "You are a marketing intelligence agent for..."     
├─────────────────────────────────────────────────────┤
│  LAYER 2: PERSONA PROMPT             [SUPERADMIN SETS, USER SEES]
│  Name, communication style, tone, personality        
│  "Your name is [X]. You communicate with..."         
├─────────────────────────────────────────────────────┤
│  LAYER 3: DOMAIN PROMPT              [SET ON ONBOARDING]
│  Client's business context, offer, ICP, market       
│  "Your client sells [X] to [ICP]. Their offer is..." 
├─────────────────────────────────────────────────────┤
│  LAYER 4: GUARDRAILS PROMPT          [SUPERADMIN ONLY - LOCKED]
│  What the agent must NEVER do/say                    
│  Hard rules that override everything else            
├─────────────────────────────────────────────────────┤
│  LAYER 5: CONTEXT LAYER              [RUNTIME - ASSEMBLED]
│  RAG results + memories + conversation history       
│  Built fresh on every request                        
├─────────────────────────────────────────────────────┤
│  LAYER 6: TASK LAYER                 [PER-REQUEST]
│  What the agent needs to do RIGHT NOW                
│  Injected with each user message                     
└─────────────────────────────────────────────────────┘
```

Each layer is stored separately in the DB. Assembled at runtime in order. Guardrails always win. Foundation never changes without a superadmin touching it.

---

## Access Control Matrix

| Config Area | Superadmin | Org Admin | Member (Basic) | Member (Medium) | Member (Enterprise) |
|---|---|---|---|---|---|
| Foundation prompt | ✅ Edit | ❌ | ❌ | ❌ | ❌ |
| Guardrails | ✅ Edit | ❌ | ❌ | ❌ | ❌ |
| Persona (name, style) | ✅ Set | ❌ | ❌ | ❌ | ❌ |
| Domain prompt | ✅ Set | ✅ Edit | ❌ | ❌ | ❌ |
| KB: brand/voice docs | ✅ | ✅ Upload | ❌ | ✅ Upload | ✅ Upload |
| KB: ICP/offer docs | ✅ | ✅ Upload | ❌ | ✅ Upload | ✅ Upload |
| KB: guardrail docs | ✅ Only | ❌ | ❌ | ❌ | ❌ |
| Tools granted | ✅ Set | ❌ | ❌ | ❌ | ❌ |
| Provider/model | ✅ Set | ❌ | ❌ | ❌ | ✅ BYOK |
| View knowledge gaps | ✅ | ✅ | ❌ | ✅ View | ✅ View + Act |
| Add corrections | ❌ | ✅ | ❌ | ✅ | ✅ |
| View reflections | ✅ | ✅ | ❌ | ✅ | ✅ |
| Manual KB training | ✅ | ✅ | ❌ | ✅ | ✅ |
| View dream logs | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## Phase 0 — Data Model (Do Before Writing Any Application Code)

**Rule:** The database is the source of truth. Build the schema right once. Every subsequent phase is just filling it in.

### 0.1 — New Migration: `brain_agents`

```sql
-- The deployed Agent entity. One per org (or per user for enterprise).
-- This is distinct from brain_templates (the blueprint) and 
-- org_brain_assignments (the link table).
-- This IS the actual deployed Brain the client interacts with.

CREATE TABLE brain_agents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id),          -- null = org-level, set = user-level
  template_id           UUID NOT NULL REFERENCES brain_templates(id),
  template_version      VARCHAR(50) NOT NULL,               -- snapshot of version at deploy time
  
  -- Identity
  name                  VARCHAR(255) NOT NULL,
  avatar_emoji          VARCHAR(10) DEFAULT '🧠',
  tier                  TEXT NOT NULL CHECK (tier IN ('basic', 'medium', 'enterprise')),
  status                TEXT NOT NULL DEFAULT 'configuring' 
                          CHECK (status IN ('configuring', 'training', 'active', 'paused', 'error')),
  
  -- Prompt Stack (each layer stored separately, assembled at runtime)
  -- foundation_prompt and guardrails_prompt are COPIED from template at deploy time
  -- They are NOT references — copying ensures template changes don't silently affect live agents
  foundation_prompt     TEXT NOT NULL,
  persona_prompt        TEXT NOT NULL,
  domain_prompt         TEXT,                               -- filled during onboarding
  guardrails_prompt     TEXT NOT NULL,
  
  -- Provider Config
  use_platform_keys     BOOLEAN DEFAULT true,               -- false = BYOK (enterprise only)
  preferred_provider    TEXT,                               -- null = use platform priority
  preferred_model       TEXT,
  
  -- Capabilities
  tools_granted         TEXT[] DEFAULT '{}',                -- from brain_tools.name
  agents_enabled        TEXT[] DEFAULT '{"writer","generalist"}',  -- which agent types
  
  -- RAG Config
  rag_top_k             INT DEFAULT 8,
  rag_min_confidence    FLOAT DEFAULT 0.65,
  rag_query_expansion   BOOLEAN DEFAULT true,
  rag_hybrid_fts_weight FLOAT DEFAULT 0.3,
  rag_hybrid_vec_weight FLOAT DEFAULT 0.7,
  
  -- Behavior
  max_turns             INT DEFAULT 20,                     -- agentic loop limit
  response_language     TEXT DEFAULT 'en',
  strict_grounding      BOOLEAN DEFAULT true,               -- refuse to answer outside KB
  
  -- Metadata
  deployed_at           TIMESTAMPTZ,
  deployed_by           UUID,
  last_active_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (org_id, user_id)   -- one active brain per org (or per user)
);

-- RLS
ALTER TABLE brain_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_org_isolation" ON brain_agents FOR ALL
  USING (org_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "agents_superadmin" ON brain_agents FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin'));
```

### 0.2 — New Migration: `prompt_stack_templates`

```sql
-- Reusable prompt layers that superadmin can compose into templates
-- Templates reference these; deployed agents COPY them (snapshot, not reference)

CREATE TABLE prompt_layers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_type   TEXT NOT NULL CHECK (layer_type IN (
                  'foundation', 'persona', 'guardrails', 'domain_seed'
               )),
  name         VARCHAR(255) NOT NULL,
  content      TEXT NOT NULL,
  version      INT NOT NULL DEFAULT 1,
  is_active    BOOLEAN DEFAULT true,
  tier         TEXT CHECK (tier IN ('basic', 'medium', 'enterprise', 'all')),
  created_by   UUID NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Superadmin only
ALTER TABLE prompt_layers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prompt_layers_superadmin_only" ON prompt_layers FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin'));
```

### 0.3 — New Migration: `brain_tools` (Tool Registry)

```sql
-- Tool definitions loaded from DB — no hardcoding ever
-- Every tool the Brain can call lives here

CREATE TABLE brain_tools (
  name              TEXT PRIMARY KEY,
  category          TEXT NOT NULL,    -- 'generation' | 'retrieval' | 'analysis' | 'action'
  description       TEXT NOT NULL,    -- fed to the LLM exactly as written
  parameters        JSONB NOT NULL DEFAULT '{}',  -- JSON Schema
  handler_function  TEXT NOT NULL,   -- which TypeScript function handles execution
  min_tier          TEXT NOT NULL DEFAULT 'basic' 
                      CHECK (min_tier IN ('basic', 'medium', 'enterprise')),
  is_enabled        BOOLEAN DEFAULT true,
  requires_confirm  BOOLEAN DEFAULT false,  -- ask user before executing
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Seed: initial tool set
INSERT INTO brain_tools (name, category, description, parameters, handler_function, min_tier) VALUES
  ('search_kb', 'retrieval', 
   'Search the knowledge base for relevant information',
   '{"type":"object","properties":{"query":{"type":"string"},"top_k":{"type":"integer","default":5},"section":{"type":"string"}},"required":["query"]}',
   'executeSearchKb', 'basic'),
  
  ('generate_email', 'generation',
   'Generate an email for a specific belief and angle. Returns the full email text.',
   '{"type":"object","properties":{"belief_id":{"type":"string"},"angle_class":{"type":"string"},"flow_position":{"type":"integer"},"recipient_context":{"type":"object"}},"required":["belief_id","angle_class"]}',
   'executeGenerateEmail', 'basic'),
  
  ('analyze_signals', 'analysis',
   'Get performance data for a belief over a time period',
   '{"type":"object","properties":{"belief_id":{"type":"string"},"days":{"type":"integer","default":7}},"required":["belief_id"]}',
   'executeAnalyzeSignals', 'basic'),
  
  ('check_belief_status', 'analysis',
   'Get promotion state and confidence score for a belief',
   '{"type":"object","properties":{"belief_id":{"type":"string"}},"required":["belief_id"]}',
   'executeCheckBeliefStatus', 'basic'),
  
  ('record_gap', 'action',
   'Record a knowledge gap when information is missing from the KB',
   '{"type":"object","properties":{"domain":{"type":"string"},"description":{"type":"string"},"impact":{"type":"string","enum":["low","medium","high","critical"]}},"required":["domain","description"]}',
   'executeRecordGap', 'basic'),
  
  ('get_brief_context', 'retrieval',
   'Get the full brief, belief competition, and ICP context for content generation',
   '{"type":"object","properties":{"brief_id":{"type":"string"}},"required":["brief_id"]}',
   'executeGetBriefContext', 'medium'),
   
  ('suggest_angle', 'analysis',
   'Recommend which of the 7 canonical angles to use based on ICP and signal data',
   '{"type":"object","properties":{"icp_id":{"type":"string"},"context":{"type":"string"}},"required":["icp_id"]}',
   'executeSuggestAngle', 'medium'),
  
  ('update_domain_prompt', 'action',
   'Update the domain layer of the prompt stack with new business context',
   '{"type":"object","properties":{"content":{"type":"string"},"section":{"type":"string"}},"required":["content"]}',
   'executeUpdateDomainPrompt', 'enterprise'),
  
  ('search_leads', 'action',
   'Search for qualified leads matching the ICP definition',
   '{"type":"object","properties":{"icp_id":{"type":"string"},"limit":{"type":"integer","default":20}},"required":["icp_id"]}',
   'executeSearchLeads', 'enterprise');
```

### 0.4 — New Migration: `kb_sections` + `kb_documents`

```sql
-- KB is structured into named sections
-- Each section has a lock_level (who can edit it)

CREATE TABLE kb_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES brain_agents(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id),
  name          TEXT NOT NULL,    -- 'brand_voice' | 'icp' | 'offer' | 'angles' | 'guardrails' | 'examples' | 'custom'
  display_name  TEXT NOT NULL,
  description   TEXT,
  lock_level    TEXT NOT NULL DEFAULT 'org_admin'
                  CHECK (lock_level IN ('superadmin', 'org_admin', 'user')),
  is_active     BOOLEAN DEFAULT true,
  doc_count     INT DEFAULT 0,    -- denormalized, updated by trigger
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kb_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id     UUID NOT NULL REFERENCES kb_sections(id) ON DELETE CASCADE,
  agent_id       UUID NOT NULL REFERENCES brain_agents(id) ON DELETE CASCADE,
  org_id         UUID NOT NULL REFERENCES organizations(id),
  
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  content_hash   TEXT NOT NULL,    -- SHA-256, detect changes
  file_name      TEXT,
  file_type      TEXT,
  
  -- Processing
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'chunking', 'embedding', 'ready', 'error')),
  chunk_count    INT DEFAULT 0,
  embed_model    TEXT,             -- which embedding model was used
  error_message  TEXT,
  
  -- Freshness
  uploaded_by    UUID,
  uploaded_at    TIMESTAMPTZ DEFAULT now(),
  last_embedded  TIMESTAMPTZ,
  
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE kb_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kb_sections_org_isolation" ON kb_sections FOR ALL
  USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "kb_documents_org_isolation" ON kb_documents FOR ALL
  USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
```

### 0.5 — New Migration: `brain_memories` + `knowledge_gaps` + `brain_reflections` + `brain_dream_logs`

*(These are the tables from MARKETX_BRAIN_ARCHITECTURE.md — run that migration.)*

### 0.6 — Existing Tables to Modify

```sql
-- brain_templates: add prompt layer references
ALTER TABLE brain_templates 
  ADD COLUMN IF NOT EXISTS foundation_layer_id UUID REFERENCES prompt_layers(id),
  ADD COLUMN IF NOT EXISTS persona_layer_id UUID REFERENCES prompt_layers(id),
  ADD COLUMN IF NOT EXISTS guardrails_layer_id UUID REFERENCES prompt_layers(id),
  ADD COLUMN IF NOT EXISTS default_tools TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_agents TEXT[] DEFAULT '{"writer","generalist"}',
  ADD COLUMN IF NOT EXISTS default_rag_config JSONB DEFAULT '{}';

-- org_brain_assignments: mark as deprecated (brain_agents replaces this)
-- Keep for backward compatibility, but new flow uses brain_agents directly
```

---

## Phase 1 — Fix the Core Engine (Before Building Anything New)

**Rule:** The engine must be correct before UI is built on top of it. No UI over broken plumbing.

### 1.1 — Fix `AIProviderService` (The Root of Every Problem)

**File:** `apps/frontend/src/services/ai/AIProviderService.ts`

**Current state:** Hardcoded `https://api.openai.com/v1/chat/completions` in 5 places.  
**Required state:** All calls go through `AIProviderService.generate()` which reads from DB.

```typescript
// The contract every other service depends on
interface AIProviderService {
  // Chat completion — tries providers in priority order, auto-fallbacks
  generate(orgId: string, messages: ChatMessage[], options: GenerateOptions): Promise<LLMResponse>;
  
  // Embeddings — separate provider chain (different priority, different models)
  embed(orgId: string, texts: string[]): Promise<number[][]>;
  
  // Get the active chain for an org (for logging/debugging)
  getProviderChain(orgId: string): Promise<ProviderConfig[]>;
}
```

**Priority resolution:**
1. Check `brain_agents.preferred_provider` for this org (explicit override)
2. Check `ai_providers` where `org_id = this org` (BYOK — enterprise)
3. Check `ai_providers` where `org_id IS NULL` (platform keys — default)
4. Throw a clean error with context: `"No AI provider configured for org {id}. Please contact support."`

No silent failures. No fallback to a hardcoded key. Ever.

### 1.2 — Implement `HallucinationInterceptor`

**File:** `apps/frontend/src/services/brain/interceptors/HallucinationInterceptor.ts`

```typescript
export class HallucinationInterceptor {
  static validate(
    toolCalls: ToolCall[],
    availableTools: ToolDefinition[]
  ): { valid: ToolCall[]; fake: string[]; action: 'pass' | 'filter' | 'retry' } {
    const knownTools = new Set(availableTools.map(t => t.name));
    const valid: ToolCall[] = [];
    const fake: string[] = [];
    
    for (const call of toolCalls) {
      knownTools.has(call.name) ? valid.push(call) : fake.push(call.name);
    }
    
    if (fake.length > 0 && valid.length === 0) return { valid, fake, action: 'retry' };
    if (fake.length > 0 && valid.length > 0) return { valid, fake, action: 'filter' };
    return { valid, fake, action: 'pass' };
  }
  
  static retryMessage(fakeTools: string[]): string {
    return `SYSTEM: The following tools do not exist: [${fakeTools.join(', ')}]. ` +
           `Only use tools from your provided list. Do not invent tool names.`;
  }
}
```

### 1.3 — Replace One-Shot with Real Agentic Loop

**File:** `apps/frontend/src/services/brain/BrainOrchestrator.ts`

**Replace** `process()` / `processSync()` with `handleTurn()`:

```typescript
async handleTurn(
  context: BrainContext,
  input: ProcessInput,
  availableTools: ToolDefinition[]  // loaded from brain_tools for this agent's grants
): Promise<ProcessResult> {

  const messages: ChatMessage[] = await this.buildInitialMessages(context, input);
  const toolCallsMade: ToolCallRecord[] = [];
  let turn = 0;
  const MAX_TURNS = context.brainConfig.maxTurns ?? 20;

  while (turn < MAX_TURNS) {
    turn++;

    // Call AI via AIProviderService (no hardcoded OpenAI)
    const response = await AIProviderService.generate(context.orgId, messages, {
      tools: availableTools,
      preferredProvider: context.brainConfig.preferredProvider,
      preferredModel: context.brainConfig.preferredModel,
    });

    // No tool calls = we have the final answer
    if (!response.toolCalls || response.toolCalls.length === 0) {
      await this.saveToConversation(context, input.message, response.content);
      await this.postProcessLearning(context, response);
      return this.buildResult(response, toolCallsMade, turn);
    }

    // Hallucination check BEFORE execution
    const { valid, fake, action } = HallucinationInterceptor.validate(
      response.toolCalls, availableTools
    );

    if (action === 'retry') {
      messages.push({ role: 'user', content: HallucinationInterceptor.retryMessage(fake) });
      continue;
    }

    // Execute valid tools
    for (const toolCall of valid) {
      const permitted = await this.checkToolPermission(context.orgId, toolCall.name);
      if (!permitted) {
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: 'PERMISSION_DENIED' });
        continue;
      }

      const result = await this.executeMarketXTool(toolCall, context);
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      toolCallsMade.push({ ...toolCall, result, success: true });
    }

    // Append assistant message to history before next turn
    messages.push({ role: 'assistant', content: response.content, tool_calls: response.toolCalls });
  }

  // MAX_TURNS reached — return best effort
  return this.buildResult({ content: 'Turn limit reached.', toolCalls: [] }, toolCallsMade, turn);
}
```

### 1.4 — Fix Gap Detection in RAGOrchestrator

**File:** `apps/frontend/src/services/brain/RAGOrchestrator.ts`

After document retrieval, before returning:

```typescript
const topScore = result.documents[0]?.relevanceScore ?? 0;
const threshold = brainConfig.ragMinConfidence ?? 0.65;

if (topScore < threshold || result.documents.length === 0) {
  // Record the gap (fire and forget — don't block the response)
  this.recordKnowledgeGap(context.orgId, query, topScore).catch(err => 
    console.error('[RAG] Gap recording failed:', err)
  );
  result.gapDetected = true;
  result.gapConfidence = topScore;
}

return result;
```

```typescript
private async recordKnowledgeGap(orgId: string, query: string, score: number) {
  await supabase.from('knowledge_gaps').upsert({
    org_id: orgId,
    domain: this.inferDomain(query),
    description: `No confident KB match (score: ${score.toFixed(2)}) for query: "${query.slice(0,120)}"`,
    failed_queries: [query],
    occurrence_count: 1,
    impact_level: score === 0 ? 'high' : 'medium',
    last_identified: new Date().toISOString(),
  }, {
    onConflict: 'org_id,domain',
    ignoreDuplicates: false,
  });
}
```

### 1.5 — Load Tools from DB (not hardcoded)

**File:** `apps/frontend/src/services/brain/ToolLoader.ts` (new)

```typescript
export class ToolLoader {
  // Returns tool definitions formatted for LLM function calling
  static async getAgentTools(agentId: string, orgId: string): Promise<ToolDefinition[]> {
    const { data: agent } = await supabase
      .from('brain_agents')
      .select('tools_granted, tier')
      .eq('id', agentId)
      .single();

    const { data: tools } = await supabase
      .from('brain_tools')
      .select('name, description, parameters')
      .in('name', agent.tools_granted)
      .eq('is_enabled', true);

    return tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }
    }));
  }
}
```

---

## Phase 2 — Prompt Stack Engine

**Rule:** The prompt assembled at runtime is the most important thing the Brain produces. It must be deterministic, testable, and composable.

### 2.1 — `PromptAssembler` Service

**File:** `apps/frontend/src/services/brain/PromptAssembler.ts`

```typescript
export class PromptAssembler {
  static async assemble(
    agent: BrainAgent,
    ragContext: RAGResult,
    conversationHistory: ChatMessage[],
    memories: BrainMemory[],
    currentTask: string,
  ): Promise<{ systemPrompt: string; layers: PromptLayerDebug[] }> {
    
    const layers: string[] = [];
    const debug: PromptLayerDebug[] = [];

    // Layer 1: Foundation (always first, always locked)
    layers.push(agent.foundation_prompt);
    debug.push({ name: 'foundation', length: agent.foundation_prompt.length, editable: false });

    // Layer 2: Persona
    if (agent.persona_prompt) {
      layers.push(`\n## PERSONA\n${agent.persona_prompt}`);
      debug.push({ name: 'persona', length: agent.persona_prompt.length, editable: false });
    }

    // Layer 3: Domain (client-specific business context)
    if (agent.domain_prompt) {
      layers.push(`\n## BUSINESS CONTEXT\n${agent.domain_prompt}`);
      debug.push({ name: 'domain', length: agent.domain_prompt.length, editable: true });
    }

    // Layer 4: Guardrails (always last in the static stack, cannot be overridden)
    layers.push(`\n## GUARDRAILS — THESE RULES OVERRIDE EVERYTHING ABOVE\n${agent.guardrails_prompt}`);
    debug.push({ name: 'guardrails', length: agent.guardrails_prompt.length, editable: false });

    // Layer 5: Context (dynamic — RAG + memories)
    const contextLayer = this.buildContextLayer(ragContext, memories);
    if (contextLayer) {
      layers.push(`\n## RETRIEVED CONTEXT\n${contextLayer}`);
      debug.push({ name: 'context', length: contextLayer.length, editable: false });
    }

    // Layer 6: Task (current request)
    layers.push(`\n## CURRENT TASK\n${currentTask}`);
    debug.push({ name: 'task', length: currentTask.length, editable: false });

    return {
      systemPrompt: layers.join('\n'),
      layers: debug,
    };
  }

  private static buildContextLayer(rag: RAGResult, memories: BrainMemory[]): string {
    const parts: string[] = [];

    if (rag.documents.length > 0) {
      parts.push('### Knowledge Base\n' + rag.documents
        .map(d => `[${d.source}] ${d.content}`)
        .join('\n\n')
      );
    }

    if (rag.gapDetected) {
      parts.push('### Note\nNo high-confidence KB match found. If this question requires specific knowledge not in context, say so explicitly rather than guessing.');
    }

    if (memories.length > 0) {
      parts.push('### Relevant Memories\n' + memories
        .map(m => `- ${m.content}`)
        .join('\n')
      );
    }

    return parts.join('\n\n');
  }
}
```

---

## Phase 3 — Superadmin: Agent Builder

**Rule:** Superadmin UI must be comprehensive but not cluttered. Every field must have a clear label, a description, and a preview.

### 3.1 — Pages to Build/Extend

```
/superadmin/brains              ← exists, needs full config depth
/superadmin/brains/new          ← new agent template builder
/superadmin/brains/[id]         ← edit template
/superadmin/brains/[id]/deploy  ← assign to org
/superadmin/prompt-library      ← new: manage reusable prompt layers
/superadmin/tool-registry       ← new: manage brain_tools table
```

### 3.2 — Agent Template Builder: Fields

**Identity tab:**
- Agent name (e.g. "Zara")
- Avatar emoji picker
- Tier selection (basic / medium / enterprise)
- Short description (shown to client)

**Prompt Stack tab:**
- Foundation Layer: select from `prompt_layers` (type=foundation) OR write inline
- Persona Layer: select from `prompt_layers` (type=persona) OR write inline
- Guardrails Layer: select from `prompt_layers` (type=guardrails) OR write inline
- Domain Seed: optional starter text for the domain layer (client will complete onboarding)
- **Live preview:** shows the assembled prompt with dummy context

**Tools tab:**
- Checkbox list of all `brain_tools` rows
- Each tool shows: name, description, tier requirement
- Tools below the selected tier are disabled with tooltip "Requires [tier] plan"

**RAG Config tab:**
- Top K results: slider 3–20
- Min confidence threshold: slider 0.3–0.95
- Query expansion: toggle
- FTS weight / Vector weight: sliders (must sum to 1.0)
- Strict grounding mode: toggle with description

**Provider tab:**
- Use platform keys: default on
- Allow BYOK: toggle (only available if tier = enterprise)
- Preferred model override: dropdown of known models (optional)

**KB Sections tab:**
- List of sections this template creates on deployment
- Each section: name, display name, lock_level (superadmin/org_admin/user)
- Add custom sections

### 3.3 — Deployment Flow

```
Superadmin clicks "Deploy to Org"
  ↓
Select org from dropdown (search by name)
  ↓
Review: shows what will be created
  - Agent name + tier
  - Prompt layers (shows character counts, NOT content — security)
  - Tools granted
  - KB sections to be created
  ↓
Confirm
  ↓
API: POST /api/superadmin/agents/deploy
  1. Create brain_agents row (copy prompt texts, not references)
  2. Create kb_sections for this agent (based on template's section config)
  3. Create empty kb_documents placeholders if any defaults
  4. Queue: 'brain/onboarding.init' job for the org (welcomes them, primes domain prompt)
  5. Return: agent_id
  ↓
Superadmin sees success with link to org's agent dashboard
```

---

## Phase 4 — KB Training Pipeline

**Rule:** Documents go in → chunks come out → embeddings stored → RAG works. No manual steps. No human intervention after upload.

### 4.1 — Upload Flow

```
User uploads file (PDF, DOCX, TXT, MD)
  ↓
POST /api/kb/documents
  - Validate: file type, size (max 10MB), org_id, section_id
  - Check: does user have permission to edit this section? (kb_sections.lock_level check)
  - Insert kb_documents row: status = 'pending'
  - Return: document_id
  ↓
Railway worker: 'kb/document.process' job
  1. status → 'chunking'
  2. Extract text from file (pdf-parse, mammoth for DOCX, etc.)
  3. Chunk with TextChunker (sentence-aware, 512 tokens, 50 overlap)
  4. status → 'embedding'
  5. For each chunk:
     a. Generate embedding via AIProviderService.embed(orgId, chunkText)
     b. Insert into embeddings table:
        - org_id, agent_id, source_type='kb_document', source_id=document_id
        - content, embedding, metadata={section, doc_title, chunk_index}
  6. Update kb_documents: status='ready', chunk_count=N, last_embedded=now()
  7. Update kb_sections: doc_count++
  ↓
Frontend: polling /api/kb/documents/[id]/status shows progress bar
```

### 4.2 — Re-embedding on Update

When a document is updated (content_hash changes):
- Delete all `embeddings` where `source_id = document_id`
- Re-run the embedding pipeline
- Never have stale embeddings for current content

### 4.3 — Deletion

When a document is deleted:
- Soft delete: `kb_documents.is_active = false`
- Hard delete embeddings: `DELETE FROM embeddings WHERE source_id = document_id`
- No orphaned vectors ever

---

## Phase 5 — Memory System

**Rule:** Memory is earned, not assumed. The Brain doesn't pretend to remember things it wasn't told.

### 5.1 — Memory Creation (3 Sources)

**Source 1: Conversation consolidation** (after each session)  
Triggered after N messages or session end. Worker extracts key facts, preferences, outcomes from conversation and stores as `brain_memories` rows.

**Source 2: Dream consolidation** (nightly worker)  
Pattern analysis across signals and conversations. Creates `memory_type = 'pattern'` rows.

**Source 3: Explicit teaching** (user adds correction)  
User says "always refer to us as X, never Y" → creates `memory_type = 'correction'` row with `importance = 1.0` (maximum weight, never decays).

### 5.2 — Memory Retrieval

At runtime, before building prompt context:
```typescript
const memories = await getRelevantMemories(agentId, query, {
  limit: 5,
  minImportance: 0.3,
  decayAfterDays: 90,    // memories fade unless accessed
  boostOnAccess: true,    // accessing a memory increases its importance slightly
});
```

Retrieval uses FTS (fast, no API call) on `brain_memories.keywords` + content. Vector similarity only if embeddings are configured.

---

## Phase 6 — Workers: Real Implementations (No Stubs)

**Rule:** Every worker must produce a measurable, verifiable output. If you can't write a test that confirms it worked, it doesn't count.

### 6.1 — `brain-reflection` Worker

**Trigger:** After a generation batch completes (≥5 emails generated for a brief)  
**Input:** `{ org_id, brief_id, batch_id }`  
**Output:** New row in `brain_reflections` + any new rows in `knowledge_gaps`

```typescript
async function reflectOnBatch(job: Job) {
  const { orgId, briefId } = job.data;
  
  // 1. Get what was generated
  const emails = await getGeneratedEmails(briefId, orgId);
  if (emails.length < 5) return { skipped: true, reason: 'insufficient_batch' };
  
  // 2. Get signal feedback (may be zero if too early)
  const signals = await getSignalsForBrief(briefId, orgId, 7);
  
  // 3. Get belief states
  const beliefs = await getBeliefStatus(briefId);
  
  // 4. Build reflection prompt (structured output required)
  const prompt = buildReflectionPrompt({ emails, signals, beliefs });
  
  // 5. LLM call — must return valid JSON matching ReflectionOutput schema
  const raw = await AIProviderService.generate(orgId, [{ role: 'user', content: prompt }], {
    systemPrompt: REFLECTION_SYSTEM_PROMPT,
    responseFormat: { type: 'json_object' }, // enforce JSON output
  });
  
  // 6. Parse — if JSON is invalid, log and return without storing garbage
  let reflection: ReflectionOutput;
  try {
    reflection = ReflectionOutputSchema.parse(JSON.parse(raw.content));
  } catch (err) {
    console.error('[Reflection] Invalid JSON from LLM:', err);
    return { error: 'parse_failed' };
  }
  
  if (!reflection.hasSubstance) return { skipped: true, reason: 'no_substance' };
  
  // 7. Store reflection
  await supabase.from('brain_reflections').insert({ org_id: orgId, ... });
  
  // 8. Auto-record identified gaps
  for (const gap of reflection.knowledgeGaps) {
    await recordKnowledgeGap(orgId, gap.domain, gap.description);
  }
  
  return { success: true, qualityScore: reflection.qualityScore };
}
```

### 6.2 — `brain-dream` Worker

**Trigger:** Nightly cron at 02:00, per org that has ≥20 new signal events since last dream  
**Input:** `{ org_id }`  
**Output:** KB reweighted + new memories + dream log entry

```typescript
async function runDreamConsolidation(job: Job) {
  const { orgId } = job.data;
  
  // Guard: enough signals since last dream?
  const lastDream = await getLastDream(orgId);
  const newSignals = await countSignalsSince(orgId, lastDream?.ended_at ?? '2000-01-01');
  const minSignals = await getAgentConfig(orgId, 'dream_trigger_signals', 20);
  
  if (newSignals < minSignals) {
    return { skipped: true, signals: newSignals, required: minSignals };
  }
  
  // Create dream log: status = 'running'
  const dreamId = await startDreamLog(orgId);
  
  try {
    // Phase 1: Aggregate belief performance
    const beliefPerformance = await aggregateBeliefSignals(orgId, { days: 1 });
    
    // Phase 2: Identify patterns (which angles won, which ICP segments responded)
    const patterns = analyzePatterns(beliefPerformance);
    
    // Phase 3: Reweight KB
    let beliefsReweighted = 0;
    for (const winner of patterns.winners) {
      await boostKBSection(orgId, winner.angleClass, 0.1); // 10% boost
      beliefsReweighted++;
    }
    for (const loser of patterns.losers) {
      await dampKBSection(orgId, loser.angleClass, 0.05); // 5% dampen
    }
    
    // Phase 4: Create memory records
    const memories = await createPatternMemories(orgId, patterns);
    
    // Phase 5: Generate narrative (real LLM, not template)
    const narrative = await generateDreamNarrative(orgId, {
      signalsProcessed: newSignals,
      winners: patterns.winners,
      losers: patterns.losers,
      topAngles: patterns.dominantAngles,
    });
    
    // Phase 6: Complete dream log
    await completeDreamLog(dreamId, orgId, {
      signalsProcessed: newSignals,
      memoriesCreated: memories.length,
      patternsDiscovered: patterns.total,
      beliefsReweighted,
      narrative,
      topics: patterns.dominantAngles,
    });
    
    return { success: true, signalsProcessed: newSignals };
    
  } catch (err) {
    await failDreamLog(dreamId, orgId, String(err));
    throw err; // BullMQ handles retry
  }
}
```

### 6.3 — `brain-gap-fill` Worker

**Trigger:** When a gap has `occurrence_count >= 3` AND `impact_level IN ('high', 'critical')`  
**Input:** `{ org_id, gap_id }`  
**Output:** Suggested KB content OR escalation to org admin

```typescript
async function fillKnowledgeGap(job: Job) {
  const { orgId, gapId } = job.data;
  
  const gap = await getGap(gapId, orgId);
  
  // Update status: learning
  await updateGapStatus(gapId, 'learning');
  
  // Ask the LLM to suggest what KB content would fill this gap
  const suggestion = await AIProviderService.generate(orgId, [{
    role: 'user',
    content: `Our AI agent repeatedly fails to find KB content for: "${gap.description}". 
    Failed queries: ${gap.failed_queries.join(', ')}.
    What specific content should be added to the knowledge base to fill this gap?
    Be specific. Describe the content needed, not a generic answer.`
  }], { systemPrompt: GAP_FILL_SYSTEM_PROMPT });
  
  // Add suggestion as learning resource on the gap
  await addLearningResource(gapId, suggestion.content);
  
  // Notify org admin (if gap is critical)
  if (gap.impact_level === 'critical') {
    await notifyOrgAdmin(orgId, {
      type: 'critical_knowledge_gap',
      gap,
      suggestion: suggestion.content,
    });
  }
  
  return { success: true, gapId };
}
```

---

## Phase 7 — Member Portal

**Rule:** Client-facing pages show only what the client needs. Nothing more. Clean, clear, trust-building.

### 7.1 — Pages

```
/dashboard                    ← already exists, needs Brain widget
/brain-chat                   ← already exists, wire to real agentic loop
/brain/knowledge              ← NEW: KB management (upload docs, see sections)
/brain/training               ← NEW: training status, gaps, reflections
/brain/settings               ← NEW: BYOK keys (enterprise only), persona name
```

### 7.2 — `/brain/knowledge` Page

```
┌─────────────────────────────────────────────────┐
│  Your Knowledge Base                            │
│  3 sections · 12 documents · Last updated 2h ago│
├──────────────────┬──────────────────────────────┤
│  SECTIONS        │  [Brand Voice]               │
│  ● Brand Voice   │  2 documents · Editable      │
│  ● ICP           │                              │
│  ● Your Offer    │  + Add Document              │
│  ○ Guardrails    │  [locked - contact support]  │
│  ● Examples      │                              │
└──────────────────┴──────────────────────────────┘
```

- Locked sections (lock_level = superadmin): shown with lock icon, "Contact support to update"
- Editable sections: show upload button, document list with delete
- Each doc shows: title, status (processing/ready), chunk count, last updated

### 7.3 — `/brain/training` Page (Medium+ only)

```
┌─────────────────────────────────────────────────┐
│  Brain Training Status                          │
├─────────────────────────────────────────────────┤
│  KNOWLEDGE GAPS (3 active)                      │
│  ⚠ High  ICP targeting — missing seniority data │
│  ⚠ Med   Offer pricing — never mentioned in KB  │
│  ● Low   Competitor names — low confidence      │
│                         [Fix Gap] [Dismiss]      │
├─────────────────────────────────────────────────┤
│  LAST REFLECTION                                │
│  Quality Score: 7.4/10                          │
│  ✓ What went well: Angle framing was strong     │
│  → Improve: Add more pricing objection content  │
├─────────────────────────────────────────────────┤
│  DREAM LOG                                      │
│  Last run: 3h ago · 42 signals processed        │
│  "Emails targeting VP Engineering responded     │
│  strongest to the Hidden Constraint angle..."   │
└─────────────────────────────────────────────────┘
```

---

## Phase 8 — Hardening

**Done only after Phases 1-7 are complete and tested.**

### 8.1 — Rate Limiting
- Per-org LLM calls: max N calls/minute (configurable per tier)
- Track in `ai_usage_log` (already exists)
- Return `429` with retry-after when exceeded, not a silent failure

### 8.2 — Token Budget Enforcement
- Each org gets a monthly token budget (based on plan)
- `ai_usage_log` tracks usage
- Warning at 80% — notify org admin
- Hard stop at 100% — return `402` with clear message
- Superadmin can grant overages

### 8.3 — Audit Logging
- Every Brain interaction logged: org, user, agent, turn count, tokens, provider used
- Every tool execution logged: tool name, args (redacted if sensitive), result, duration
- Every KB change logged: who uploaded what, when
- Retention: 90 days on Supabase, archive to cold storage

### 8.4 — Graceful Degradation
- If embedding API fails → fall back to FTS-only RAG (no crash)
- If all providers fail → return structured error, never empty response
- If worker fails → BullMQ retry with backoff, DLQ after 3 failures, alert superadmin
- If RAG returns nothing → strict grounding mode says "I don't have that information yet"

---

## What NOT to Do (Non-Negotiables)

1. **No hardcoded API keys or model names anywhere in source code**
2. **No `// TODO` or stub functions that return fake data**
3. **No silent error swallowing (`catch (e) {}` is banned)**
4. **No direct Supabase calls in UI components — all through service layer**
5. **No LLM calls that bypass AIProviderService**
6. **No schema changes without a proper migration file**
7. **No tool additions without a `brain_tools` row — everything from DB**
8. **No prompt content hardcoded in TypeScript — everything in `prompt_layers` or `brain_agents`**

---

## Build Sequence (Strict Order)

| Phase | What | Why This Order |
|---|---|---|
| **0** | All Supabase migrations | Schema must exist before code touches it |
| **1.1** | Fix AIProviderService | Everything depends on this being correct |
| **1.2** | HallucinationInterceptor | Needed before any tool-calling goes live |
| **1.3** | Agentic loop | Core engine — all UI sits on top |
| **1.4** | Gap detection in RAG | 3 lines, immediate value |
| **1.5** | Tool loader from DB | Remove last hardcoded element |
| **2** | PromptAssembler | Needed before any new agent can be configured |
| **3** | Superadmin agent builder | Can't deploy agents without the builder |
| **4** | KB pipeline | Clients can't train without document processing |
| **5** | Memory system | Foundation for learning |
| **6.1** | Reflection worker | First real learning worker |
| **6.2** | Dream worker | Nightly consolidation |
| **6.3** | Gap fill worker | Close the loop |
| **7** | Member portal pages | Only built once the engine is solid |
| **8** | Hardening | Last, after everything works |

---

## Definition of Done (Per Phase)

A phase is done when:
- Code is written with no TODOs
- All error paths return structured errors (never undefined or empty)
- RLS policies verified (try to query another org's data — it must fail)
- The flow works end-to-end in development
- Committed with full commit message explaining what was built and why

No phase is "done" until the next phase can build on it without touching it again.
