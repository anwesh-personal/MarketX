# Zenner Brain System - Complete Architecture Documentation

> **Purpose:** This document provides a comprehensive technical reference for the AI Memory/Brain system implemented in Zenner. It is designed to be used as a blueprint for implementing similar self-learning, context-aware AI systems in other SaaS applications.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Deep Dive](#component-deep-dive)
   - [MemoryOrchestrator](#1-memoryorchestrator)
   - [RAGService](#2-ragservice)
   - [TrainingService](#3-trainingservice)
   - [ConversationManager](#4-conversationmanager)
   - [CacheService](#5-cacheservice)
   - [MemoryAnalyticsService](#6-memoryanalyticsservice)
   - [AIService](#7-aiservice)
3. [Database Schema](#database-schema)
4. [Data Types & Interfaces](#data-types--interfaces)
5. [Memory Types Explained](#memory-types-explained)
6. [Token Management](#token-management)
7. [Embedding Strategy](#embedding-strategy)
8. [Conversation Summarization](#conversation-summarization)
9. [Implementation Patterns](#implementation-patterns)
10. [Current Limitations](#current-limitations)
11. [Recommended Improvements](#recommended-improvements)
12. [File Locations](#file-locations)

---

## Architecture Overview

The Zenner Brain System implements a **multi-layered memory architecture** inspired by cognitive science models of human memory:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                  │
│                    (Components: AIBrainView, ZennerCoach)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ORCHESTRATION LAYER                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MemoryOrchestrator                              │   │
│  │  • Unified retrieval interface                                       │   │
│  │  • Token budget management                                           │   │
│  │  • Context building                                                  │   │
│  │  • Source deduplication                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│    RAGService     │     │  TrainingService  │     │ConversationManager│
│   (Semantic)      │     │    (Memory)       │     │   (Episodic)      │
│                   │     │                   │     │                   │
│ • Vector search   │     │ • Facts           │     │ • Message history │
│ • Embeddings      │     │ • Preferences     │     │ • Summarization   │
│ • Cosine sim      │     │ • Rules           │     │ • Sliding window  │
│ • Doc indexing    │     │ • Experiences     │     │ • Token tracking  │
└───────────────────┘     └───────────────────┘     └───────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CACHING LAYER                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CacheService                                  │   │
│  │  • LRU embedding cache (30 min TTL)                                 │   │
│  │  • LRU retrieval cache (5 min TTL)                                  │   │
│  │  • Query normalization                                               │   │
│  │  • Hit/miss statistics                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         SQLite Database                              │   │
│  │                                                                       │   │
│  │  • rag_documents (embeddings as JSON text)                           │   │
│  │  • training_profile (JSON blob)                                      │   │
│  │  • conversation_messages                                             │   │
│  │  • conversation_summaries                                            │   │
│  │  • memory_items                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        localStorage (Fallback)                       │   │
│  │  • Legacy support                                                    │   │
│  │  • Migration to SQLite on first load                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ANALYTICS LAYER                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MemoryAnalyticsService                            │   │
│  │  • Usage tracking (messages, tokens)                                 │   │
│  │  • Cost estimation per provider                                      │   │
│  │  • Response time monitoring                                          │   │
│  │  • Daily/weekly aggregations                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. MemoryOrchestrator

**File:** `src/services/ai/MemoryOrchestrator.ts`
**Purpose:** Unified interface for accessing all memory systems

#### Configuration

```typescript
interface MemoryConfig {
    maxSemanticTokens: number;      // Max tokens for RAG + knowledge (default: 1000)
    maxProceduralTokens: number;    // Max tokens for rules (default: 500)
    maxContextTokens: number;       // Max tokens for experiences (default: 500)
}
```

#### Key Methods

```typescript
class MemoryOrchestrator {
    // Main retrieval method - returns all relevant memory
    async retrieve(query: string): Promise<RetrievalResult>
    
    // Build combined context string for AI prompt
    async buildContext(query: string): Promise<string>
    
    // Individual retrieval methods
    private async getRAGContext(query: string): Promise<string>
    private getMemoryContext(query: string): string
    private getRulesContext(): string
    private getExperienceContext(): string
    
    // Token management
    private estimateTokens(text: string): number
    private trimToTokenBudget(text: string, maxTokens: number): string
    
    // Cache invalidation
    invalidateCaches(): void
}
```

#### Retrieval Flow

```
1. retrieve(query) is called
    │
    ├─→ getRAGContext(query)        ─→ RAGService.retrieve()
    ├─→ getMemoryContext(query)     ─→ TrainingService.getContext()
    ├─→ getRulesContext()           ─→ TrainingService.getProfile().rules
    └─→ getExperienceContext()      ─→ TrainingService.getProfile().experiences
    │
    ├─→ Each result trimmed to token budget
    │
    └─→ Return combined RetrievalResult
```

#### Token Budget Trimming Logic

```typescript
private trimToTokenBudget(text: string, maxTokens: number): string {
    const currentTokens = this.estimateTokens(text);
    if (currentTokens <= maxTokens) return text;
    
    const maxChars = maxTokens * 4; // 4 chars per token approximation
    const trimmed = text.substring(0, maxChars);
    
    // Try to cut at a newline for cleaner output
    const lastNewline = trimmed.lastIndexOf("\n");
    if (lastNewline > maxChars * 0.7) {
        return trimmed.substring(0, lastNewline) + "\n[...truncated]";
    }
    return trimmed + "[...truncated]";
}
```

---

### 2. RAGService

**File:** `src/services/ai/RAGService.ts`
**Purpose:** Vector-based semantic search using embeddings

#### Data Structure

```typescript
interface RAGDocument {
    id: string;           // Unique identifier (e.g., "preset-alpha-waves")
    content: string;      // Text content to search
    embedding: number[];  // Vector embedding (768-1536 dimensions)
    metadata?: any;       // Additional data (type, source, etc.)
}
```

#### Key Methods

```typescript
class RAGService {
    private documents: RAGDocument[] = [];
    
    // Initialize and load documents
    async init(): Promise<void>
    
    // Index documents with embeddings
    async indexPresets(): Promise<void>  // Currently hardcoded to presets
    
    // Semantic search
    async retrieve(query: string, k: number = 3): Promise<string>
    
    // Cosine similarity calculation
    private similarity(a: number[], b: number[]): number
    
    // Persistence
    private async saveIndex(): Promise<void>
    private async loadFromSQLite(): Promise<boolean>
}
```

#### Cosine Similarity Implementation

```typescript
private similarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

#### Retrieval Flow

```
1. retrieve(query, k=3)
    │
    ├─→ Check cache: cacheService.getRetrieval(query)
    │   ├─→ If cached, return immediately
    │   └─→ If not, continue
    │
    ├─→ Get query embedding: aiService.embed(query)
    │   └─→ Check embedding cache first
    │
    ├─→ Calculate similarity with all documents
    │   └─→ Linear scan, cosine similarity
    │
    ├─→ Sort by similarity score
    │
    ├─→ Take top K results
    │
    ├─→ Format as context string
    │   └─→ "[RAG KNOWLEDGE: {name} (Match: {score}%)]\n{content}"
    │
    ├─→ Cache result
    │
    └─→ Return formatted context
```

#### Storage Schema

```sql
CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL,  -- JSON array of numbers
    metadata TEXT             -- JSON object
);
```

---

### 3. TrainingService

**File:** `src/services/training/TrainingService.ts`
**Purpose:** Stores user-specific knowledge, preferences, rules, and experiences

#### Profile Structure

```typescript
interface TrainingProfile {
    identity: UserIdentity;        // User's self-description
    rhythms: WorkRhythm;           // Work patterns
    goals: GoalMetric[];           // Tracked goals
    knowledgeBase: AIKnowledge[];  // Semantic Memory (Facts)
    experiences: AIExperience[];   // Episodic Memory (History)
    rules: AIRule[];               // Procedural Memory (Behavior)
}

interface UserIdentity {
    name: string;
    role: string;
    coreValues: string[];
    longTermVision: string;
    motivationTriggers: string[];
}

interface WorkRhythm {
    chronotype: "lion" | "bear" | "wolf" | "dolphin";
    peakEnergyHours: number[];  // 0-23
    preferredSessionDuration: number;
    breakStyle: "active" | "restful" | "meditative";
}
```

#### Memory Types

```typescript
// SEMANTIC MEMORY - Facts and preferences
interface AIKnowledge {
    id: string;
    category: "preference" | "fact" | "rule";
    content: string;
    embedding?: number[];  // For future vector search
    lastUpdated: number;
}

// EPISODIC MEMORY - Past experiences
interface AIExperience {
    id: string;
    summary: string;
    keyLearnings: string[];
    sentiment: "positive" | "negative" | "neutral";
    timestamp: number;
}

// PROCEDURAL MEMORY - Behavioral rules
interface AIRule {
    id: string;
    rule: string;
    triggerContext: string;  // e.g., "morning", "stressed", "always"
    isActive: boolean;
}
```

#### Key Methods

```typescript
class TrainingService {
    // Initialize and load profile
    async init(): Promise<void>
    
    // Profile access
    getProfile(): TrainingProfile
    
    // Knowledge management
    addKnowledge(content: string, category: string): AIKnowledge
    removeKnowledge(id: string): void
    
    // Experience recording
    recordExperience(summary: string, sentiment: string, keyLearnings: string[]): AIExperience
    
    // Rule management
    addRule(rule: string, triggerContext: string): AIRule
    removeRule(id: string): void
    
    // Context retrieval (keyword-based)
    getContext(query: string): string
    getFullSystemContext(): string
}
```

#### Context Retrieval (Keyword Matching)

```typescript
getContext(query: string): string {
    const keywords = query.toLowerCase().split(/\s+/);
    const relevant = this.profile.knowledgeBase.filter(k =>
        keywords.some(kw => k.content.toLowerCase().includes(kw))
    );
    
    if (relevant.length === 0) return "";
    
    return relevant
        .slice(0, 5)  // Limit to 5 most relevant
        .map(k => `[${k.category.toUpperCase()}] ${k.content}`)
        .join("\n");
}
```

#### Pre-Seeded Knowledge (ZeniKnowledge)

The system comes with pre-seeded knowledge about the AI assistant personality:

```typescript
// src/services/training/ZeniKnowledge.ts

export function getDefaultKnowledgeBase(): AIKnowledge[] {
    return [
        {
            id: "zeni_identity",
            category: "fact",
            content: "I am Zeni, a focus and productivity companion...",
            lastUpdated: Date.now()
        },
        // ... more pre-seeded facts
    ];
}

export function getDefaultRules(): AIRule[] {
    return [
        {
            id: "zeni_rule_supportive",
            rule: "Always be encouraging and supportive",
            triggerContext: "always",
            isActive: true
        },
        // ... more pre-seeded rules
    ];
}
```

---

### 4. ConversationManager

**File:** `src/services/ai/ConversationManager.ts`
**Purpose:** Sliding window conversation memory with auto-summarization

#### Configuration Constants

```typescript
const SUMMARY_THRESHOLD = 20;        // Summarize when messages exceed this
const MESSAGES_TO_SUMMARIZE = 10;    // Number of old messages to summarize
```

#### State Structure

```typescript
interface ConversationMessage {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
}

interface ConversationState {
    messages: ConversationMessage[];
    summaries: string[];
    lastSummaryIndex: number;
}
```

#### Key Methods

```typescript
class ConversationManager {
    // Add message and trigger summarization if needed
    async addMessage(role: "user" | "assistant", content: string): Promise<void>
    
    // Summarize old messages to compress context
    private async summarizeOldMessages(): Promise<void>
    
    // Get context string for AI prompt
    getContext(): string
    
    // Get recent messages for display
    getRecentMessages(count: number = 20): ConversationMessage[]
    
    // Clear all conversation data
    async clear(): Promise<void>
    
    // Force summarization (end of session)
    async forceSummarize(): Promise<void>
}
```

#### Summarization Flow

```
1. addMessage() called
    │
    ├─→ Add message to state
    ├─→ Save to SQLite
    │
    └─→ Check if messages.length > SUMMARY_THRESHOLD
        │
        └─→ If yes, call summarizeOldMessages()
            │
            ├─→ Take oldest MESSAGES_TO_SUMMARIZE messages
            ├─→ Build conversation text
            ├─→ Send to AI: "Summarize this conversation concisely..."
            ├─→ Store summary
            ├─→ Remove summarized messages from active state
            └─→ Save to SQLite
```

#### Context Building

```typescript
getContext(): string {
    const sections: string[] = [];
    
    // Add summaries first (older context)
    if (this.state.summaries.length > 0) {
        sections.push("CONVERSATION HISTORY SUMMARIES:");
        this.state.summaries.forEach((s, i) => {
            sections.push(`[Summary ${i + 1}] ${s}`);
        });
    }
    
    // Add recent messages (active context)
    sections.push("RECENT MESSAGES:");
    this.state.messages.slice(-10).forEach(m => {
        sections.push(`${m.role.toUpperCase()}: ${m.content}`);
    });
    
    return sections.join("\n");
}
```

#### Storage Schema

```sql
CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
```

---

### 5. CacheService

**File:** `src/services/ai/CacheService.ts`
**Purpose:** LRU cache for embeddings and retrieval results

#### Configuration

```typescript
const MAX_CACHE_SIZE = 100;
const EMBEDDING_TTL = 30 * 60 * 1000;  // 30 minutes
const RETRIEVAL_TTL = 5 * 60 * 1000;   // 5 minutes
```

#### Cache Entry Structure

```typescript
interface CacheEntry<T> {
    value: T;
    timestamp: number;
    accessCount: number;  // For LRU with access frequency
}
```

#### Key Methods

```typescript
class CacheService {
    private embeddingCache = new Map<string, CacheEntry<number[]>>();
    private retrievalCache = new Map<string, CacheEntry<string>>();
    
    // Embedding cache
    getEmbedding(query: string): number[] | null
    setEmbedding(query: string, embedding: number[]): void
    
    // Retrieval cache
    getRetrieval(query: string): string | null
    setRetrieval(query: string, result: string): void
    
    // LRU eviction
    private evictLRU<T>(cache: Map<string, CacheEntry<T>>): void
    
    // Query normalization
    private normalizeQuery(query: string): string
    
    // Statistics
    getStats(): { embeddingHitRate, retrievalHitRate, sizes... }
    
    // Invalidation
    invalidateRetrievals(): void
    clear(): void
}
```

#### LRU Eviction Strategy

```typescript
private evictLRU<T>(cache: Map<string, CacheEntry<T>>): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;
    
    cache.forEach((entry, key) => {
        // Score considers both timestamp and access count
        // Each access adds 1 minute equivalent to the score
        const score = entry.timestamp + (entry.accessCount * 60000);
        if (score < lruScore) {
            lruScore = score;
            lruKey = key;
        }
    });
    
    if (lruKey) {
        cache.delete(lruKey);
    }
}
```

#### Query Normalization

```typescript
private normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
}
```

---

### 6. MemoryAnalyticsService

**File:** `src/services/ai/MemoryAnalyticsService.ts`
**Purpose:** Track usage patterns, costs, and memory growth

#### Daily Stats Structure

```typescript
interface DailyStats {
    date: string;
    messagesCount: number;
    tokensUsed: number;
    memoryItemsAdded: number;
    cacheHits: number;
    cacheMisses: number;
    avgResponseTime: number;
    responseTimes: number[];
}

interface CostEstimate {
    provider: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
}
```

#### Provider Cost Configuration

```typescript
const PROVIDER_COSTS: Record<string, { input: number; output: number }> = {
    gemini: { input: 0.00015, output: 0.0006 },  // per 1K tokens
    openai: { input: 0.0025, output: 0.01 },     // GPT-4
    claude: { input: 0.003, output: 0.015 },     // Claude 3
    ollama: { input: 0, output: 0 }              // Local, free
};
```

#### Key Methods

```typescript
class MemoryAnalyticsService {
    // Recording
    startMessage(): void              // Call before AI request
    recordMessage(tokensUsed: number): void
    recordMemoryItem(): void
    updateCacheStats(): void
    
    // Retrieval
    getSummary(): { today, thisWeek, thisMonth, costEstimate }
    getChartData(days: number = 7): { dates[], messages[], tokens[], responseTime[] }
    getMemoryBreakdown(): { facts, preferences, rules, experiences, conversations, summaries }
    
    // Management
    clear(): void
    export(): string
}
```

---

### 7. AIService

**File:** `src/services/ai/AIService.ts`
**Purpose:** Multi-provider AI orchestration with embedding support

#### Supported Providers

```typescript
type AIProviderType = "ollama" | "openai" | "claude" | "gemini";

interface AIProvider {
    name: string;
    requiresApiKey: boolean;
    isAvailable(): Promise<boolean>;
    chat(messages: Message[], options?: any): Promise<string>;
    streamChat?(messages: Message[], options?: any): AsyncGenerator<string>;
    embed?(text: string): Promise<number[]>;
}
```

#### Embedding Method

```typescript
async embed(text: string): Promise<number[]> {
    // First, try the active provider
    const provider = this.getActiveProvider();
    if (provider && 'embed' in provider) {
        try {
            return await (provider as any).embed(text);
        } catch (e) {
            console.warn('Active provider embed failed, trying Gemini fallback');
        }
    }
    
    // Fallback to Gemini (best embedding support)
    const geminiProvider = this.providers.get('gemini');
    if (geminiProvider && 'embed' in geminiProvider) {
        this.configureProvider('gemini');
        try {
            return await (geminiProvider as any).embed(text);
        } catch (e) {
            console.warn('Gemini embed fallback failed');
        }
    }
    
    // Last resort: return empty array (RAG will gracefully skip)
    return [];
}
```

#### Token Management

```typescript
const MAX_HISTORY_TOKENS = 4000;

estimateTokens(text: string): number {
    return Math.ceil(text.length / 4); // ~4 chars per token for English
}

trimHistoryToTokenBudget(): Message[] {
    const maxTokens = MAX_HISTORY_TOKENS;
    let totalTokens = 0;
    const trimmed: Message[] = [];
    
    // Keep most recent messages that fit
    for (let i = this.history.length - 1; i >= 0; i--) {
        const tokens = this.estimateTokens(this.history[i].content);
        if (totalTokens + tokens > maxTokens) break;
        totalTokens += tokens;
        trimmed.unshift(this.history[i]);
    }
    
    return trimmed;
}
```

---

## Database Schema

### Complete Schema

```sql
-- RAG Documents (Vector Storage)
CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL,  -- JSON array of floats
    metadata TEXT             -- JSON object
);

-- Training Profile (Single Row)
CREATE TABLE IF NOT EXISTS training_profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL  -- JSON blob of TrainingProfile
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Conversation Manager Tables
CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Memory Items (Future Use)
CREATE TABLE IF NOT EXISTS memory_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,  -- 'fact', 'preference', 'rule'
    content TEXT NOT NULL,
    embedding TEXT,  -- JSON array of floats
    source_conversation_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (source_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- Memory Stats
CREATE TABLE IF NOT EXISTS memory_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    messages_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    memory_items_added INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_category ON memory_items(category);
```

---

## Data Types & Interfaces

### Core Types File

**File:** `src/services/ai/types.ts`

```typescript
// Provider Types
export type AIProviderType = "ollama" | "openai" | "claude" | "gemini";

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface AIConfig {
    activeProvider: AIProviderType;
    ollamaModel: string;
    ollamaEndpoint: string;
    openaiApiKey: string;
    openaiModel: string;
    claudeApiKey: string;
    claudeModel: string;
    geminiApiKey: string;
    geminiModel: string;
    temperature: number;
    maxTokens: number;
}

export interface ModelInfo {
    id: string;
    name: string;
    size?: string;
}

export interface ProviderStatus {
    available: boolean;
    error?: string;
    models?: ModelInfo[];
}
```

### Training Types File

**File:** `src/services/training/types.ts`

```typescript
export interface UserIdentity {
    name: string;
    role: string;
    coreValues: string[];
    longTermVision: string;
    motivationTriggers: string[];
}

export interface WorkRhythm {
    chronotype: "lion" | "bear" | "wolf" | "dolphin";
    peakEnergyHours: number[];
    preferredSessionDuration: number;
    breakStyle: "active" | "restful" | "meditative";
}

export interface GoalMetric {
    id: string;
    label: string;
    target: number;
    unit: string;
    current: number;
}

export interface AIKnowledge {
    id: string;
    category: "preference" | "fact" | "rule";
    content: string;
    embedding?: number[];
    lastUpdated: number;
}

export interface AIExperience {
    id: string;
    summary: string;
    keyLearnings: string[];
    sentiment: "positive" | "negative" | "neutral";
    timestamp: number;
}

export interface AIRule {
    id: string;
    rule: string;
    triggerContext: string;
    isActive: boolean;
}

export interface TrainingProfile {
    identity: UserIdentity;
    rhythms: WorkRhythm;
    goals: GoalMetric[];
    knowledgeBase: AIKnowledge[];
    experiences: AIExperience[];
    rules: AIRule[];
}
```

---

## Memory Types Explained

The system implements **three cognitive memory types** based on cognitive science:

### 1. Semantic Memory (Facts)

**What:** Declarative knowledge - facts, preferences, user information
**Storage:** `TrainingProfile.knowledgeBase[]`
**Retrieval:** Keyword matching + future vector search
**Example:**
```typescript
{
    id: "fact_1",
    category: "preference",
    content: "User prefers working in the morning",
    lastUpdated: 1705123456789
}
```

### 2. Episodic Memory (Experiences)

**What:** Autobiographical memories of past interactions
**Storage:** `TrainingProfile.experiences[]`
**Retrieval:** Recency-based
**Example:**
```typescript
{
    id: "exp_1",
    summary: "User completed a productive morning session",
    keyLearnings: ["Morning focus works best", "25-minute sessions are ideal"],
    sentiment: "positive",
    timestamp: 1705123456789
}
```

### 3. Procedural Memory (Rules)

**What:** Behavioral instructions - how to respond in contexts
**Storage:** `TrainingProfile.rules[]`
**Retrieval:** Context matching
**Example:**
```typescript
{
    id: "rule_1",
    rule: "When user seems stressed, suggest a short break first",
    triggerContext: "stressed",
    isActive: true
}
```

---

## Token Management

### Budget Allocation

```
Total Context Budget: ~8000 tokens (model dependent)

├── System Prompt: ~500 tokens (fixed)
│
├── Memory Context: ~2000 tokens
│   ├── Semantic (RAG + knowledge): 1000 tokens
│   ├── Procedural (rules): 500 tokens
│   └── Episodic (experiences): 500 tokens
│
├── Conversation History: ~4000 tokens
│   ├── Summaries: ~1000 tokens
│   └── Recent messages: ~3000 tokens
│
└── User Message + Buffer: ~1500 tokens
```

### Token Estimation

```typescript
// Simple estimation (works well for English)
estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// More accurate for mixed content
estimateTokensAccurate(text: string): number {
    // Count words (better for mixed language)
    const words = text.split(/\s+/).length;
    // ~1.3 tokens per word average
    return Math.ceil(words * 1.3);
}
```

---

## Embedding Strategy

### Current Implementation

1. **Provider:** Gemini (with fallback chain)
2. **Dimension:** 768 (text-embedding-004)
3. **Storage:** JSON text in SQLite
4. **Similarity:** Cosine similarity (linear scan)

### Embedding Flow

```
1. Text → AIService.embed(text)
    │
    ├─→ Check cache: cacheService.getEmbedding(text)
    │
    ├─→ If not cached:
    │   ├─→ Try active provider embed()
    │   └─→ Fallback to Gemini embed()
    │
    ├─→ Cache result
    │
    └─→ Return number[]
```

### Recommended Improvements

1. **Use proper vector database** (Pinecone, Qdrant, pgvector)
2. **Batch embedding** for multiple documents
3. **Embedding dimension reduction** for faster search
4. **Approximate nearest neighbor** (ANN) for large datasets

---

## Conversation Summarization

### Summarization Prompt

```typescript
const summarizePrompt = `
Summarize this conversation segment concisely, capturing:
1. Main topics discussed
2. User preferences/facts learned
3. Key decisions or outcomes
4. Emotional context

Conversation:
${conversationText}

Summary (2-3 sentences):
`;
```

### When Summarization Triggers

1. **Threshold:** Messages exceed `SUMMARY_THRESHOLD` (20)
2. **Forced:** Session end (`forceSummarize()`)
3. **Manual:** User clears old history

### Summarization Quality Tips

1. Include speaker attribution
2. Capture action items
3. Note sentiment changes
4. Preserve user-specific terms

---

## Implementation Patterns

### Initialization Pattern

```typescript
class ServiceWithInit {
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    
    async init(): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._doInit();
        await this.initPromise;
        this.initialized = true;
    }
    
    private async _doInit(): Promise<void> {
        // Actual initialization logic
    }
}
```

### Dual Storage Pattern

```typescript
class ServiceWithDualStorage {
    // Load: SQLite first, localStorage fallback
    async load(): Promise<boolean> {
        let loaded = await this.loadFromSQLite();
        if (!loaded) {
            loaded = this.loadFromLocalStorage();
            if (loaded) {
                await this.migrateToSQLite();
            }
        }
        return loaded;
    }
    
    // Save: Both storages
    async save(): Promise<void> {
        await this.saveToSQLite();
        this.saveToLocalStorage(); // Fallback
    }
}
```

### Graceful Degradation Pattern

```typescript
async embed(text: string): Promise<number[]> {
    // Try primary
    try {
        return await primaryProvider.embed(text);
    } catch (e) {
        console.warn('Primary failed, trying fallback');
    }
    
    // Try fallback
    try {
        return await fallbackProvider.embed(text);
    } catch (e) {
        console.warn('Fallback failed');
    }
    
    // Return empty (RAG will gracefully skip)
    return [];
}
```

---

## Current Limitations

### 1. No True Vector Database
- **Current:** Linear scan with cosine similarity
- **Impact:** O(n) search complexity
- **For >10K docs:** Becomes slow

### 2. Single User Only
- **Current:** No user_id in most tables
- **Impact:** Cannot multi-tenant

### 3. No Automatic Memory Extraction
- **Current:** Manual fact addition
- **Impact:** User burden

### 4. No Memory Decay
- **Current:** All memories equally weighted
- **Impact:** Old irrelevant data persists

### 5. Hardcoded RAG Documents
- **Current:** Only frequency presets
- **Impact:** Limited knowledge base

### 6. No Embeddings for Knowledge
- **Current:** `knowledgeBase.embedding` is optional and unused
- **Impact:** Keyword-only retrieval

---

## Recommended Improvements

### Priority 1: Vector Database

```typescript
// Recommended: pgvector, Pinecone, or Qdrant

interface VectorDB {
    upsert(docs: { id: string; embedding: number[]; metadata: any }[]): Promise<void>;
    query(embedding: number[], k: number, filter?: any): Promise<QueryResult[]>;
    delete(ids: string[]): Promise<void>;
}

// Replace RAGService.retrieve() with vector DB query
async retrieve(query: string, k: number = 3): Promise<string> {
    const embedding = await this.embed(query);
    const results = await vectorDB.query(embedding, k);
    return results.map(r => r.content).join("\n\n");
}
```

### Priority 2: Automatic Memory Extraction

```typescript
// After each conversation, extract facts

const extractionPrompt = `
Analyze this conversation and extract any new facts about the user.
Return as JSON array:
[
    { "type": "preference", "content": "..." },
    { "type": "fact", "content": "..." }
]

Conversation:
${conversation}
`;

async function extractMemories(conversation: string): Promise<AIKnowledge[]> {
    const response = await aiService.chat(extractionPrompt);
    return JSON.parse(response);
}
```

### Priority 3: Multi-User Support

```typescript
// Add user_id to all operations

class TrainingService {
    async getProfile(userId: string): Promise<TrainingProfile>
    async addKnowledge(userId: string, content: string): Promise<void>
}

class ConversationManager {
    async addMessage(userId: string, role: string, content: string): Promise<void>
    async getContext(userId: string): Promise<string>
}
```

### Priority 4: Memory Relevance Scoring

```typescript
interface ScoredMemory {
    memory: AIKnowledge;
    score: number;
}

function scoreMemory(memory: AIKnowledge, query: string): number {
    let score = 0;
    
    // Recency (newer = higher)
    const age = Date.now() - memory.lastUpdated;
    const ageScore = Math.max(0, 1 - age / (30 * 24 * 60 * 60 * 1000)); // 30 day decay
    score += ageScore * 0.3;
    
    // Keyword match
    const keywords = query.toLowerCase().split(/\s+/);
    const matches = keywords.filter(k => memory.content.toLowerCase().includes(k)).length;
    score += (matches / keywords.length) * 0.5;
    
    // Category boost (preferences > facts)
    if (memory.category === "preference") score += 0.2;
    
    return score;
}
```

---

## File Locations

```
src/services/
├── ai/
│   ├── AIService.ts           # Main AI provider orchestration
│   ├── CacheService.ts        # LRU caching
│   ├── ConversationManager.ts # Sliding window + summarization
│   ├── MemoryAnalyticsService.ts # Usage tracking
│   ├── MemoryOrchestrator.ts  # Unified memory interface
│   ├── RAGService.ts          # Vector search
│   ├── types.ts               # AI types
│   └── providers/
│       ├── OllamaProvider.ts
│       ├── OpenAIProvider.ts
│       ├── ClaudeProvider.ts
│       └── GeminiProvider.ts
│
├── training/
│   ├── TrainingService.ts     # User profile + memories
│   ├── types.ts               # Training types
│   └── ZeniKnowledge.ts       # Pre-seeded knowledge
│
├── db/
│   └── DatabaseService.ts     # SQLite operations
│
└── journal/
    ├── JournalService.ts      # Journal entries
    ├── JournalAIService.ts    # AI reflections
    └── SessionNotesService.ts # Session-specific notes
```

---

## Usage Example

### Building Context for AI Request

```typescript
import { memoryOrchestrator } from './services/ai/MemoryOrchestrator';
import { conversationManager } from './services/ai/ConversationManager';
import { aiService } from './services/ai/AIService';

async function chatWithContext(userMessage: string): Promise<string> {
    // 1. Build memory context
    const memoryContext = await memoryOrchestrator.buildContext(userMessage);
    
    // 2. Get conversation context
    const conversationContext = conversationManager.getContext();
    
    // 3. Build system prompt
    const systemPrompt = `
You are Zeni, a productivity assistant.

${memoryContext}

${conversationContext}
`;
    
    // 4. Send to AI
    const response = await aiService.chat(userMessage, {
        systemPrompt,
        temperature: 0.7
    });
    
    // 5. Record in conversation
    await conversationManager.addMessage('user', userMessage);
    await conversationManager.addMessage('assistant', response);
    
    return response;
}
```

---

## Conclusion

The Zenner Brain System provides a **solid foundation** for building AI assistants with persistent memory. Key strengths:

1. **Clean architecture** with separation of concerns
2. **Multiple memory types** (semantic, episodic, procedural)
3. **Token budget management**
4. **Caching layer** for performance
5. **Conversation summarization** for long contexts
6. **Multi-provider support**

Key areas needing improvement for production SaaS:

1. Replace linear embedding search with vector database
2. Add automatic memory extraction
3. Implement multi-user support
4. Add memory decay/consolidation
5. Generic document indexing API

This document should provide all the context needed to build a similar or improved system in another application.

---

*Last updated: January 15, 2026*
*Version: 1.0*
