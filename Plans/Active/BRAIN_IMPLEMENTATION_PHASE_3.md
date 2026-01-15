# AXIOM BRAIN - Phase 3: RAG Orchestration
**Duration:** Week 5-6  
**Goal:** Advanced Retrieval-Augmented Generation with re-ranking

---

## 3.1 Database Migrations

**File:** `database/migrations/003_rag_system.sql`
```sql
-- ============================================================
-- RAG QUERY CACHE
-- ============================================================

CREATE TABLE rag_query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT NOT NULL,
  results JSONB NOT NULL,
  retrieval_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(query_hash, org_id)
);

CREATE INDEX rag_cache_hash_idx ON rag_query_cache(query_hash, org_id);
CREATE INDEX rag_cache_accessed_idx ON rag_query_cache(accessed_at);

-- Auto-cleanup old cache (5 minutes TTL)
CREATE OR REPLACE FUNCTION cleanup_rag_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM rag_query_cache
  WHERE accessed_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- QUERY EXPANSIONS
-- ============================================================

CREATE TABLE query_expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  original_query TEXT NOT NULL,
  expanded_queries TEXT[] NOT NULL,
  expansion_method VARCHAR(50), -- 'synonyms', 'llm', 'embedding_neighbors'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX query_expansions_org_idx ON query_expansions(org_id, created_at DESC);

-- ============================================================
-- RERANKING MODELS
-- ============================================================

CREATE TABLE reranking_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  model_type VARCHAR(50) CHECK (model_type IN ('cross_encoder', 'llm', 'custom')),
  model_identifier VARCHAR(255), -- e.g., 'cross-encoder/ms-marco-MiniLM-L-12-v2'
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO reranking_models (name, model_type, model_identifier, config) VALUES
('MS-MARCO MiniLM', 'cross_encoder', 'cross-encoder/ms-marco-MiniLM-L-12-v2', '{
  "max_length": 512,
  "batch_size": 32
}'),
('GPT-4 Reranker', 'llm', 'gpt-4-turbo-preview', '{
  "temperature": 0.0,
  "prompt": "Score the relevance of the following passage to the query on a scale of 0-10."
}');

-- ============================================================
-- RAG PERFORMANCE METRICS
-- ============================================================

CREATE TABLE rag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  brain_template_id UUID REFERENCES brain_templates(id),
  query_text TEXT,
  retrieval_time_ms INTEGER,
  reranking_time_ms INTEGER,
  total_docs_retrieved INTEGER,
  final_docs_count INTEGER,
  avg_relevance_score FLOAT,
  cache_hit BOOLEAN,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX rag_metrics_org_idx ON rag_metrics(org_id, created_at DESC);
CREATE INDEX rag_metrics_brain_idx ON rag_metrics(brain_template_id, created_at DESC);

-- Materialized view for performance analytics
CREATE MATERIALIZED VIEW rag_performance_stats AS
SELECT 
  brain_template_id,
  DATE(created_at) as date,
  COUNT(*) as total_queries,
  AVG(retrieval_time_ms) as avg_retrieval_ms,
  AVG(reranking_time_ms) as avg_reranking_ms,
  AVG(total_docs_retrieved) as avg_docs_retrieved,
  AVG(final_docs_count) as avg_final_docs,
  AVG(avg_relevance_score) as avg_relevance,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as cache_hit_rate
FROM rag_metrics
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY brain_template_id, DATE(created_at);

CREATE INDEX rag_perf_stats_brain_date_idx ON rag_performance_stats(brain_template_id, date DESC);
```

---

## 3.2 Backend Services

**File:** `apps/frontend/src/services/brain/RAGOrchestrator.ts`
```typescript
import { vectorStore } from './VectorStore'
import { BrainConfig } from './BrainConfigService'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import OpenAI from 'openai'

export interface RAGResult {
  context: string
  documents: RankedDocument[]
  metadata: {
    retrievalTimeMs: number
    rerankingTimeMs: number
    totalRetrieved: number
    cacheHit: boolean
    expansionUsed: boolean
  }
}

export interface RankedDocument {
  id: string
  content: string
  score: number
  metadata: Record<string, any>
  citation: string
}

export interface RAGOptions {
  orgId: string
  brainConfig: BrainConfig
  maxResults?: number
  enableExpansion?: boolean
  enableReranking?: boolean
}

export class RAGOrchestrator {
  private supabase = createClient()
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  /**
   * Main retrieval method
   */
  async retrieve(
    query: string,
    options: RAGOptions
  ): Promise<RAGResult> {
    const startTime = Date.now()
    
    // Check cache first
    const cached = await this.getFromCache(query, options.orgId)
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true
        }
      }
    }
    
    // 1. Query Understanding & Expansion
    const queries = options.enableExpansion !== false
      ? await this.expandQuery(query, options)
      : [query]
    
    const expansionUsed = queries.length > 1
    
    // 2. Hybrid Retrieval
    const retrievalStart = Date.now()
    const documents = await this.hybridSearch(queries, options)
    const retrievalTime = Date.now() - retrievalStart
    
    // 3. Re-ranking (optional)
    let rankedDocs = documents.map((doc, i) => ({
      ...doc,
      score: doc.combinedScore,
      citation: `[${i + 1}]`
    }))
    
    let rerankingTime = 0
    if (options.enableReranking !== false && options.brainConfig.rag.rerankingEnabled) {
      const rerankStart = Date.now()
      rankedDocs = await this.rerank(query, rankedDocs, options)
      rerankingTime = Date.now() - rerankStart
    }
    
    // 4. Select top K
    const topK = options.maxResults || options.brainConfig.rag.topK
    const selectedDocs = rankedDocs.slice(0, topK)
    
    // 5. Format context
    const context = this.formatContext(selectedDocs, options)
    
    const result: RAGResult = {
      context,
      documents: selectedDocs,
      metadata: {
        retrievalTimeMs: retrievalTime,
        rerankingTimeMs: rerankingTime,
        totalRetrieved: documents.length,
        cacheHit: false,
        expansionUsed
      }
    }
    
    // Cache result
    await this.cacheResult(query, result, options.orgId)
    
    // Log metrics
    await this.logMetrics(query, result, options)
    
    return result
  }
  
  /**
   * Query expansion using LLM
   */
  private async expandQuery(
    query: string,
    options: RAGOptions
  ): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'Generate 2-3 alternative phrasings of the user query to improve search recall. Return only the queries, one per line.'
        }, {
          role: 'user',
          content: query
        }],
        temperature: 0.3,
        max_tokens: 200
      })
      
      const expansions = response.choices[0].message.content
        ?.split('\n')
        .filter(q => q.trim().length > 0)
        .slice(0, 3) || []
      
      // Store expansions
      await this.supabase
        .from('query_expansions')
        .insert({
          org_id: options.orgId,
          original_query: query,
          expanded_queries: [query, ...expansions],
          expansion_method: 'llm'
        })
      
      return [query, ...expansions]
    } catch (error) {
      console.error('Query expansion failed:', error)
      return [query]
    }
  }
  
  /**
   * Hybrid search across multiple queries
   */
  private async hybridSearch(
    queries: string[],
    options: RAGOptions
  ): Promise<any[]> {
    const allResults: any[] = []
    const seenIds = new Set<string>()
    
    // Search with each query
    for (const query of queries) {
      const results = await vectorStore.search(query, {
        orgId: options.orgId,
        sourceTypes: ['kb', 'user_memory'],
        topK: options.brainConfig.rag.topK * 2, // Get more for reranking
        vectorWeight: options.brainConfig.rag.weights.vector,
        ftsWeight: options.brainConfig.rag.weights.fts,
        minSimilarity: options.brainConfig.rag.minSimilarity
      })
      
      // Deduplicate
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id)
          allResults.push(result)
        }
      }
    }
    
    // Sort by combined score
    return allResults.sort((a, b) => b.combinedScore - a.combinedScore)
  }
  
  /**
   * Re-rank documents using cross-encoder or LLM
   */
  private async rerank(
    query: string,
    documents: RankedDocument[],
    options: RAGOptions
  ): Promise<RankedDocument[]> {
    // Use LLM-based reranking for now
    // TODO: Implement cross-encoder for better performance
    
    const scoringPrompt = `Score the relevance of each passage to the query on a scale of 0-10.

Query: ${query}

Passages:
${documents.map((doc, i) => `[${i}] ${doc.content.substring(0, 500)}`).join('\n\n')}

Return scores in JSON format: {"0": score, "1": score, ...}`
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'system',
          content: 'You are a relevance scoring system. Score passages accurately.'
        }, {
          role: 'user',
          content: scoringPrompt
        }],
        temperature: 0.0,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
      
      const scores = JSON.parse(response.choices[0].message.content || '{}')
      
      // Update scores
      return documents.map((doc, i) => ({
        ...doc,
        score: scores[i.toString()] || doc.score
      })).sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('Reranking failed:', error)
      return documents
    }
  }
  
  /**
   * Format documents into context string
   */
  private formatContext(
    documents: RankedDocument[],
    options: RAGOptions
  ): string {
    if (documents.length === 0) {
      return ''
    }
    
    const sections = documents.map((doc, i) => {
      const citation = `[${i + 1}]`
      const source = doc.metadata.source || 'Knowledge Base'
      const relevance = Math.round(doc.score * 100)
      
      return `${citation} ${doc.content}\n(Source: ${source}, Relevance: ${relevance}%)`
    })
    
    const header = `## Retrieved Context (${documents.length} sources)\n\n`
    const body = sections.join('\n\n---\n\n')
    
    return header + body
  }
  
  /**
   * Token-aware context trimming
   */
  trimToTokenBudget(
    context: string,
    maxTokens: number
  ): string {
    // Rough estimate: 4 chars per token
    const maxChars = maxTokens * 4
    
    if (context.length <= maxChars) {
      return context
    }
    
    // Try to cut at a document boundary
    const sections = context.split('\n\n---\n\n')
    let trimmed = sections[0]
    
    for (let i = 1; i < sections.length; i++) {
      const next = trimmed + '\n\n---\n\n' + sections[i]
      if (next.length > maxChars) {
        break
      }
      trimmed = next
    }
    
    return trimmed + '\n\n[...truncated for token budget]'
  }
  
  /**
   * Cache helpers
   */
  private async getFromCache(
    query: string,
    orgId: string
  ): Promise<RAGResult | null> {
    const hash = crypto.createHash('sha256').update(query).digest('hex')
    
    const { data, error } = await this.supabase
      .from('rag_query_cache')
      .select('results')
      .eq('query_hash', hash)
      .eq('org_id', orgId)
      .single()
    
    if (error || !data) return null
    
    // Update access
    await this.supabase
      .from('rag_query_cache')
      .update({
        accessed_at: new Date().toISOString(),
        access_count: this.supabase.raw('access_count + 1')
      })
      .eq('query_hash', hash)
      .eq('org_id', orgId)
    
    return data.results as RAGResult
  }
  
  private async cacheResult(
    query: string,
    result: RAGResult,
    orgId: string
  ): Promise<void> {
    const hash = crypto.createHash('sha256').update(query).digest('hex')
    
    await this.supabase
      .from('rag_query_cache')
      .upsert({
        org_id: orgId,
        query_hash: hash,
        query_text: query,
        results: result,
        retrieval_time_ms: result.metadata.retrievalTimeMs
      }, {
        onConflict: 'query_hash,org_id'
      })
  }
  
  /**
   * Log performance metrics
   */
  private async logMetrics(
    query: string,
    result: RAGResult,
    options: RAGOptions
  ): Promise<void> {
    const avgRelevance = result.documents.length > 0
      ? result.documents.reduce((sum, doc) => sum + doc.score, 0) / result.documents.length
      : 0
    
    await this.supabase
      .from('rag_metrics')
      .insert({
        org_id: options.orgId,
        brain_template_id: options.brainConfig.id,
        query_text: query,
        retrieval_time_ms: result.metadata.retrievalTimeMs,
        reranking_time_ms: result.metadata.rerankingTimeMs,
        total_docs_retrieved: result.metadata.totalRetrieved,
        final_docs_count: result.documents.length,
        avg_relevance_score: avgRelevance,
        cache_hit: result.metadata.cacheHit
      })
  }
}

// Singleton
export const ragOrchestrator = new RAGOrchestrator()
```

---

## 3.3 API Routes

**File:** `apps/frontend/src/app/api/brain/search/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ragOrchestrator } from '@/services/brain/RAGOrchestrator'
import { brainConfigService } from '@/services/brain/BrainConfigService'
import { requireAuth } from '@/lib/auth'

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  maxResults: z.number().min(1).max(20).optional(),
  enableExpansion: z.boolean().optional(),
  enableReranking: z.boolean().optional()
})

// POST /api/brain/search
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const validated = searchSchema.parse(body)
    
    // Get org's brain config
    const brainConfig = await brainConfigService.getOrgBrain(user.orgId)
    
    // Perform RAG retrieval
    const result = await ragOrchestrator.retrieve(validated.query, {
      orgId: user.orgId,
      brainConfig,
      maxResults: validated.maxResults,
      enableExpansion: validated.enableExpansion,
      enableReranking: validated.enableReranking
    })
    
    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

---

## 3.4 Worker Jobs

**File:** `workers/rag-cache-cleanup.ts`
```typescript
import { Queue, Worker } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import Redis from 'ioredis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const redis = new Redis(process.env.REDIS_URL!)

// Queue for cache cleanup
const cacheQueue = new Queue('rag-cache-cleanup', {
  connection: redis
})

// Worker
const worker = new Worker(
  'rag-cache-cleanup',
  async (job) => {
    console.log('Running RAG cache cleanup...')
    
    // Cleanup old query cache
    const { error: queryCacheError } = await supabase
      .rpc('cleanup_rag_cache')
    
    if (queryCacheError) {
      console.error('Query cache cleanup failed:', queryCacheError)
    }
    
    // Cleanup old embedding cache
    const { error: embeddingCacheError } = await supabase
      .rpc('cleanup_embedding_cache')
    
    if (embeddingCacheError) {
      console.error('Embedding cache cleanup failed:', embeddingCacheError)
    }
    
    // Refresh materialized views
    await supabase.rpc('refresh_rag_stats')
    
    return { success: true }
  },
  { connection: redis }
)

// Schedule cleanup every 5 minutes
export async function scheduleRAGCacheCleanup() {
  await cacheQueue.add(
    'cleanup',
    {},
    {
      repeat: {
        pattern: '*/5 * * * *' // Every 5 minutes
      }
    }
  )
}

// Start worker
worker.on('completed', (job) => {
  console.log(`Cache cleanup completed: ${job.id}`)
})

worker.on('failed', (job, err) => {
  console.error(`Cache cleanup failed: ${job?.id}`, err)
})
```

---

## 3.5 Testing

**File:** `apps/frontend/src/services/brain/__tests__/RAGOrchestrator.test.ts`
```typescript
import { RAGOrchestrator } from '../RAGOrchestrator'
import { BrainConfig } from '../BrainConfigService'

describe('RAGOrchestrator', () => {
  let orchestrator: RAGOrchestrator
  let mockConfig: BrainConfig
  
  beforeEach(() => {
    orchestrator = new RAGOrchestrator()
    mockConfig = {
      models: {
        chat: 'gpt-4-turbo-preview',
        embeddings: 'text-embedding-3-large'
      },
      rag: {
        enabled: true,
        topK: 5,
        minSimilarity: 0.7,
        rerankingEnabled: true,
        hybridSearch: true,
        weights: {
          vector: 0.7,
          fts: 0.3
        }
      }
    } as BrainConfig
  })
  
  describe('retrieve', () => {
    it('should retrieve and rank documents', async () => {
      const result = await orchestrator.retrieve(
        'How do I use the API?',
        {
          orgId: 'test-org-id',
          brainConfig: mockConfig
        }
      )
      
      expect(result.documents).toBeDefined()
      expect(result.context).toBeDefined()
      expect(result.metadata.retrievalTimeMs).toBeGreaterThan(0)
    })
    
    it('should use cache on repeated queries', async () => {
      const query = 'What is RAG?'
      const options = {
        orgId: 'test-org-id',
        brainConfig: mockConfig
      }
      
      // First call
      const result1 = await orchestrator.retrieve(query, options)
      expect(result1.metadata.cacheHit).toBe(false)
      
      // Second call (should hit cache)
      const result2 = await orchestrator.retrieve(query, options)
      expect(result2.metadata.cacheHit).toBe(true)
    })
    
    it('should expand queries when enabled', async () => {
      const result = await orchestrator.retrieve(
        'API usage',
        {
          orgId: 'test-org-id',
          brainConfig: mockConfig,
          enableExpansion: true
        }
      )
      
      expect(result.metadata.expansionUsed).toBe(true)
    })
  })
  
  describe('trimToTokenBudget', () => {
    it('should trim context to fit token budget', () => {
      const longContext = 'a'.repeat(10000)
      const trimmed = orchestrator.trimToTokenBudget(longContext, 100)
      
      expect(trimmed.length).toBeLessThan(longContext.length)
      expect(trimmed).toContain('[...truncated')
    })
  })
})
```

---

## 3.6 Success Metrics

### Performance
- ✅ Retrieval time <100ms P95
- ✅ Reranking time <200ms P95
- ✅ Cache hit rate >70%
- ✅ Total latency <300ms P95

### Quality
- ✅ Retrieval accuracy >90%
- ✅ Average relevance score >7/10
- ✅ User satisfaction >4.5/5

### Cost
- ✅ Cost per query <$0.005
- ✅ LLM calls minimized through caching
- ✅ Batch processing where possible

---

**Phase 3 Complete. Creating Phase 4 next...**
