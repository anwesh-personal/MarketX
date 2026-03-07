# Brain Configuration Modal - Specification
**Date:** 2026-01-16 02:31 IST  
**Inspired by:** Lekhika FlowNodeModal pattern  
**Priority:** HIGH - Core UX

---

## 🎯 REQUIREMENT

Brain templates need a **comprehensive configuration modal** similar to Lekhika workflow nodes, not just basic CRUD.

Users need to configure:
- System prompts per agent
- Instructions/processing logic
- AI provider selection (preferred + fallbacks)
- Model selection per agent type
- Temperature, max tokens, top_p
- Tools/capabilities
- Advanced settings (streaming, RAG, memory)

---

## 📐 MODAL STRUCTURE

### **Tabs:**
1. **Basic** - Name, description, tier
2. **Agents** - Configure each agent (Writer, Analyst, Coach, etc.)
3. **AI Providers** - Select preferred/fallback providers
4. **RAG Settings** - Vector search, reranking, hybrid search
5. **Memory** - Context windows, summarization, temporal memory
6. **Features** - Enable/disable capabilities
7. **Advanced** - Limits, performance, A/B testing

---

## 🎨 TAB 1: BASIC

```tsx
<BasicTab>
  <Input label="Brain Name" value={name} />
  <Textarea label="Description" value={description} rows={3} />
  <Select label="Pricing Tier" options={['echii', 'pulz', 'quanta']} />
  <Toggle label="Active" checked={isActive} />
</BasicTab>
```

---

## 🤖 TAB 2: AGENTS (CRITICAL - Like Lekhika Node Config)

```tsx
<AgentsTab>
  <AgentSelector>
    {/* For each agent in brain config */}
    <AgentCard onClick={selectAgent}>
      Writer Agent
      Chat Agent  
      Analyst Agent
      Coach Agent
    </AgentCard>
  </AgentSelector>

  {/* When agent selected, show configuration */}
  <AgentConfiguration agent={selectedAgent}>
    
    {/* System Prompt - Rich editor */}
    <PromptEditor
      label="System Prompt"
      value={systemPrompt}
      placeholder="You are an expert content writer..."
      rows={8}
      variables={AVAILABLE_VARIABLES}
    />

    {/* User Prompt Template */}
    <PromptEditor
      label="User Prompt Template"
      value={userPrompt}
      placeholder="Generate {content_type} about {topic}..."
      rows={6}
      variables={AVAILABLE_VARIABLES}
    />

    {/* Negative Prompt */}
    <PromptEditor
      label="Negative Prompt (Optional)"
      value={negativePrompt}
      placeholder="Avoid: generic content, clichés..."
      rows={3}
    />

    {/* Model Settings */}
    <div className="grid grid-cols-2 gap-4">
      <Select 
        label="Model Override (Optional)"
        options={availableModels}
        value={modelOverride}
      />
      
      <NumberInput
        label="Max Tokens"
        value={maxTokens}
        min={100}
        max={32000}
        default={2000}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <Slider
        label="Temperature"
        value={temperature}
        min={0}
        max={2}
        step={0.1}
        default={0.7}
      />
      
      <Slider
        label="Top P"
        value={topP}
        min={0}
        max={1}
        step={0.05}
        default={1}
      />
    </div>

    {/* Tools/Capabilities */}
    <MultiSelect
      label="Available Tools"
      options={['kb_search', 'web_search', 'memory_recall', 'code_execution']}
      value={tools}
    />

    {/* Processing Instructions */}
    <Textarea
      label="Processing Instructions"
      value={processingInstructions}
      placeholder="1. Analyze input\n2. Generate content\n3. Validate output"
      rows={5}
    />

  </AgentConfiguration>
</AgentsTab>
```

---

## ⚡ TAB 3: AI PROVIDERS

```tsx
<AIProvidersTab>
  {/* Preferred Provider */}
  <Select
    label="Preferred AI Provider"
    options={['openai', 'anthropic', 'google', 'mistral', 'perplexity', 'xai']}
    value={preferredProvider}
    onChange={updatePreferredProvider}
  />

  {/* Show available models for selected provider */}
  <ModelGrid provider={preferredProvider}>
    {models.map(model => (
      <ModelCard
        key={model.id}
        model={model}
        selected={defaultModel === model.id}
        onClick={() => setDefaultModel(model.id)}
      />
    ))}
  </ModelGrid>

  {/* Fallback Providers (ordered list) */}
  <SortableList
    label="Fallback Providers (in order)"
    items={fallbackProviders}
    onReorder={updateFallbackProviders}
    availableItems={['anthropic', 'google', 'mistral']}
  />

  {/* Default Generation Settings */}
  <div className="grid grid-cols-3 gap-4">
    <NumberInput label="Default Max Tokens" value={2000} />
    <Slider label="Default Temperature" value={0.7} />
    <Slider label="Default Top P" value={1} />
  </div>
</AIProvidersTab>
```

---

## 🔍 TAB 4: RAG SETTINGS

```tsx
<RAGTab>
  <Toggle label="Enable RAG" checked={ragEnabled} />

  {ragEnabled && (
    <>
      <NumberInput
        label="Top K Results"
        value={topK}
        min={1}
        max={20}
        default={5}
      />

      <Slider
        label="Minimum Similarity"
        value={minSimilarity}
        min={0}
        max={1}
        step={0.05}
        default={0.7}
      />

      <Toggle
        label="Reranking Enabled"
        checked={rerankingEnabled}
      />

      <Toggle
        label="Hybrid Search"
        checked={hybridSearch}
      />

      {hybridSearch && (
        <div className="grid grid-cols-2 gap-4">
          <Slider label="Vector Weight" value={vectorWeight} min={0} max={1} />
          <Slider label="FTS Weight" value={ftsWeight} min={0} max={1} />
        </div>
      )}
    </>
  )}
</RAGTab>
```

---

## 🧠 TAB 5: MEMORY

```tsx
<MemoryTab>
  <NumberInput
    label="Max Context Tokens"
    value={maxContextTokens}
    max={32000}
    default={4000}
  />

  <NumberInput
    label="Max Memory Tokens"
    value={maxMemoryTokens}
    max={8000}
    default={1000}
  />

  <NumberInput
    label="Conversation Window Size"
    value={conversationWindowSize}
    min={1}
    max={100}
    default={10}
  />

  <Toggle
    label="Enable Summarization"
    checked={enableSummarization}
  />

  <Toggle
    label="Temporal Memory"
    checked={temporalMemory}
    description="Remember time-based patterns"
  />

  <Toggle
    label="Graph Memory"
    checked={graphMemory}
    description="Entity relationship tracking (Quanta only)"
  />
</MemoryTab>
```

---

## ⚙️ TAB 6: FEATURES

```tsx
<FeaturesTab>
  <FeatureToggle
    label="Multi-Agent"
    checked={multiAgent}
    tier="pulz"
  />

  <FeatureToggle
    label="Streaming Enabled"
    checked={streamingEnabled}
  />

  <FeatureToggle
    label="Content Analysis"
    checked={contentAnalysis}
    tier="pulz"
  />

  <FeatureToggle
    label="Multi-Modal"
    checked={multiModal}
    tier="quanta"
  />

  <FeatureToggle
    label="RLHF (Learning from Feedback)"
    checked={rlhf}
    tier="quanta"
  />

  <FeatureToggle
    label="A/B Testing"
    checked={abTesting}
    tier="quanta"
  />

  <FeatureToggle
    label="Custom Tools"
    checked={customTools}
    tier="quanta"
  />
</FeaturesTab>
```

---

## 🚀 TAB 7: ADVANCED

```tsx
<AdvancedTab>
  {/* Rate Limits */}
  <div className="grid grid-cols-2 gap-4">
    <NumberInput
      label="Max Requests/Minute"
      value={maxRequestsPerMinute}
      default={10}
    />

    <NumberInput
      label="Max Tokens/Day"
      value={maxTokensPerDay}
      default={50000}
    />
  </div>

  {/* Performance */}
  <NumberInput
    label="Request Timeout (seconds)"
    value={requestTimeout}
    default={30}
  />

  <NumberInput
    label="Retry Attempts"
    value={retryAttempts}
    min={0}
    max={5}
    default={2}
  />

  {/* Error Handling */}
  <Select
    label="Error Handling Strategy"
    options={['fail_fast', 'retry_with_fallback', 'graceful_degradation']}
    value={errorHandling}
  />
</AdvancedTab>
```

---

## 💾 DATA STRUCTURE

```typescript
interface BrainTemplateConfig {
  // Basic
  name: string
  description: string
  pricingTier: 'echii' | 'pulz' | 'quanta'
  isActive: boolean

  // AI Providers
  providers: {
    preferred: ProviderType
    fallbacks: ProviderType[]
    defaultModel?: string
    defaultMaxTokens: number
    defaultTemperature: number
    defaultTopP: number
  }

  // Agents (key = agent type)
  agents: Record<string, {
    systemPrompt: string
    userPrompt: string
    negativePrompt?: string
    temperature: number
    maxTokens: number
    topP: number
    tools: string[]
    processingInstructions: string
    modelOverride?: string
  }>

  // RAG
  rag: {
    enabled: boolean
    topK: number
    minSimilarity: number
    rerankingEnabled: boolean
    hybridSearch: boolean
    weights?: {
      vector: number
      fts: number
    }
  }

  // Memory
  memory: {
    maxContextTokens: number
    maxMemoryTokens: number
    conversationWindowSize: number
    enableSummarization: boolean
    temporalMemory?: boolean
    graphMemory?: boolean
  }

  // Features
  features: {
    multiAgent: boolean
    streamingEnabled: boolean
    contentAnalysis: boolean
    multiModal: boolean
    rlhf: boolean
    abTesting: boolean
    customTools: boolean
  }

  // Limits
  limits: {
    maxRequestsPerMinute: number
    maxTokensPerDay: number
    requestTimeout: number
    retryAttempts: number
  }
}
```

---

## 🔥 IMPLEMENTATION PRIORITY

**Phase 1** (1 hour):
- Create modal shell with tabs
- Basic tab (name, description, tier)
- Save/Cancel functionality

**Phase 2** (2 hours):
- Agents tab with prompt editors
- AI provider selection
- Model grid

**Phase 3** (1 hour):
- RAG settings
- Memory configuration
- Features toggles

**Phase 4** (1 hour):
- Advanced settings
- Validation
- Polish UX

---

## 📁 FILE LOCATION

**Component:** `apps/frontend/src/components/modals/BrainConfigModal.tsx`  
**Usage:** Import in `/superadmin/brains/page.tsx`

---

**Status:** Specification complete  
**Next:** Build BrainConfigModal component (3-4 hours)

**This is THE brain configuration interface - premium quality required.**
