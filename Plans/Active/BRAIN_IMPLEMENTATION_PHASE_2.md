# AXIOM BRAIN - Phase 2: Vector Store & Embeddings System
**Duration:** Week 3-4  
**Goal:** High-performance vector search with pgvector

---

## 2.1 Database Migrations

**File:** `database/migrations/002_vector_system.sql`
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- EMBEDDINGS STORAGE
-- ============================================================

CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('kb', 'conversation', 'user_memory', 'system')),
  source_id UUID NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index (IVFFlat)
CREATE INDEX embeddings_vector_idx ON embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Metadata filtering
CREATE INDEX embeddings_metadata_idx ON embeddings USING gin(metadata);

-- Multi-tenant isolation
CREATE INDEX embeddings_org_source_idx ON embeddings(org_id, source_type);

-- Full-text search index
CREATE INDEX embeddings_fts_idx ON embeddings 
USING gin(to_tsvector('english', content));

-- Composite index for hybrid search
CREATE INDEX embeddings_org_fts_idx ON embeddings(org_id) 
INCLUDE (content);

-- ============================================================
-- EMBEDDING CACHE
-- ============================================================

CREATE TABLE embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  content_hash VARCHAR(64) NOT NULL, -- SHA256 of content
  embedding vector(1536) NOT NULL,
  model VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(content_hash, model, org_id)
);

CREATE INDEX embedding_cache_hash_idx ON embedding_cache(content_hash, model);
CREATE INDEX embedding_cache_accessed_idx ON embedding_cache(accessed_at);

-- Auto-cleanup old cache entries (30 days)
CREATE OR REPLACE FUNCTION cleanup_embedding_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM embedding_cache
  WHERE accessed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- HYBRID SEARCH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(1536),
  query_text TEXT,
  org_uuid UUID,
  source_types VARCHAR[],
  top_k INTEGER DEFAULT 5,
  vector_weight FLOAT DEFAULT 0.7,
  fts_weight FLOAT DEFAULT 0.3,
  min_similarity FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  combined_score FLOAT,
  vector_score FLOAT,
  fts_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      e.id,
      e.content,
      e.metadata,
      1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    WHERE e.org_id = org_uuid
      AND (source_types IS NULL OR e.source_type = ANY(source_types))
      AND 1 - (e.embedding <=> query_embedding) >= min_similarity
    ORDER BY e.embedding <=> query_embedding
    LIMIT top_k * 2
  ),
  fts_search AS (
    SELECT 
      e.id,
      e.content,
      e.metadata,
      ts_rank_cd(
        to_tsvector('english', e.content),
        plainto_tsquery('english', query_text)
      ) AS rank
    FROM embeddings e
    WHERE e.org_id = org_uuid
      AND (source_types IS NULL OR e.source_type = ANY(source_types))
      AND to_tsvector('english', e.content) @@ plainto_tsquery('english', query_text)
    LIMIT top_k * 2
  )
  SELECT DISTINCT ON (v.id)
    v.id,
    v.content,
    v.metadata,
    (v.similarity * vector_weight + COALESCE(f.rank, 0) * fts_weight) AS combined_score,
    v.similarity AS vector_score,
    COALESCE(f.rank, 0) AS fts_score
  FROM vector_search v
  LEFT JOIN fts_search f ON v.id = f.id
  ORDER BY combined_score DESC
  LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- BATCH EMBEDDING INSERTION
-- ============================================================

CREATE OR REPLACE FUNCTION batch_insert_embeddings(
  embeddings_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO embeddings (org_id, source_type, source_id, chunk_index, content, embedding, metadata)
  SELECT 
    (value->>'org_id')::UUID,
    value->>'source_type',
    (value->>'source_id')::UUID,
    (value->>'chunk_index')::INTEGER,
    value->>'content',
    (value->>'embedding')::vector(1536),
    COALESCE((value->'metadata')::JSONB, '{}'::JSONB)
  FROM jsonb_array_elements(embeddings_data);
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STATISTICS & MONITORING
-- ============================================================

CREATE TABLE embedding_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  date DATE NOT NULL,
  total_embeddings INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  avg_search_time_ms FLOAT DEFAULT 0,
  cache_hit_rate FLOAT DEFAULT 0,
  UNIQUE(org_id, date)
);

CREATE INDEX embedding_stats_org_date_idx ON embedding_stats(org_id, date DESC);

-- Update trigger
CREATE OR REPLACE FUNCTION update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER embeddings_updated_at 
BEFORE UPDATE ON embeddings
FOR EACH ROW EXECUTE FUNCTION update_embeddings_updated_at();
```

---

## 2.2 Backend Services

**File:** `apps/frontend/src/services/brain/VectorStore.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import crypto from 'crypto'

export interface EmbeddingDocument {
  id?: string
  orgId: string
  sourceType: 'kb' | 'conversation' | 'user_memory' | 'system'
  sourceId: string
  chunkIndex: number
  content: string
  embedding?: number[]
  metadata?: Record<string, any>
}

export interface SearchResult {
  id: string
  content: string
  metadata: Record<string, any>
  combinedScore: number
  vectorScore: number
  ftsScore: number
}

export interface SearchOptions {
  orgId: string
  sourceTypes?: string[]
  topK?: number
  vectorWeight?: number
  ftsWeight?: number
  minSimilarity?: number
}

export class VectorStore {
  private supabase = createClient()
  private openai: OpenAI
  private embeddingModel = 'text-embedding-3-large'
  private dimensions = 1536
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  /**
   * Generate embedding for text
   */
  async generateEmbedding(
    text: string,
    orgId: string,
    useCache: boolean = true
  ): Promise<number[]> {
    // Check cache first
    if (useCache) {
      const cached = await this.getCachedEmbedding(text, orgId)
      if (cached) {
        await this.updateCacheAccess(cached.id)
        return cached.embedding
      }
    }
    
    // Generate new embedding
    const response = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: text,
      dimensions: this.dimensions
    })
    
    const embedding = response.data[0].embedding
    
    // Cache the result
    if (useCache) {
      await this.cacheEmbedding(text, embedding, orgId)
    }
    
    return embedding
  }
  
  /**
   * Generate embeddings in batch
   */
  async batchGenerateEmbeddings(
    texts: string[],
    orgId: string
  ): Promise<number[][]> {
    // Batch size limit for OpenAI API
    const BATCH_SIZE = 100
    const allEmbeddings: number[][] = []
    
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)
      
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: batch,
        dimensions: this.dimensions
      })
      
      allEmbeddings.push(...response.data.map(d => d.embedding))
      
      // Rate limiting: wait 1s between batches
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return allEmbeddings
  }
  
  /**
   * Index documents (create embeddings and store)
   */
  async indexDocuments(documents: EmbeddingDocument[]): Promise<void> {
    // Generate embeddings in batches
    const contents = documents.map(d => d.content)
    const embeddings = await this.batchGenerateEmbeddings(
      contents,
      documents[0].orgId
    )
    
    // Prepare data for batch insertion
    const embeddingsData = documents.map((doc, i) => ({
      org_id: doc.orgId,
      source_type: doc.sourceType,
      source_id: doc.sourceId,
      chunk_index: doc.chunkIndex,
      content: doc.content,
      embedding: JSON.stringify(embeddings[i]),
      metadata: doc.metadata || {}
    }))
    
    // Batch insert using SQL function
    const { error } = await this.supabase.rpc('batch_insert_embeddings', {
      embeddings_data: embeddingsData
    })
    
    if (error) throw error
  }
  
  /**
   * Hybrid search (vector + FTS)
   */
  async search(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const startTime = Date.now()
    
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query, options.orgId)
    
    // Perform hybrid search using SQL function
    const { data, error } = await this.supabase.rpc('hybrid_search', {
      query_embedding: JSON.stringify(queryEmbedding),
      query_text: query,
      org_uuid: options.orgId,
      source_types: options.sourceTypes || null,
      top_k: options.topK || 5,
      vector_weight: options.vectorWeight || 0.7,
      fts_weight: options.ftsWeight || 0.3,
      min_similarity: options.minSimilarity || 0.0
    })
    
    if (error) throw error
    
    const searchTime = Date.now() - startTime
    
    // Log search metrics
    await this.logSearchMetrics(options.orgId, searchTime)
    
    return data.map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      combinedScore: row.combined_score,
      vectorScore: row.vector_score,
      ftsScore: row.fts_score
    }))
  }
  
  /**
   * Vector-only search (no FTS)
   */
  async vectorSearch(
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .from('embeddings')
      .select('id, content, metadata')
      .eq('org_id', options.orgId)
      .in('source_type', options.sourceTypes || ['kb', 'conversation'])
      .order('embedding <=> ' + JSON.stringify(queryEmbedding))
      .limit(options.topK || 5)
    
    if (error) throw error
    
    return data.map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      combinedScore: 0, // Not calculated
      vectorScore: 0,
      ftsScore: 0
    }))
  }
  
  /**
   * Delete embeddings by source
   */
  async deleteBySource(
    sourceId: string,
    orgId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('embeddings')
      .delete()
      .eq('source_id', sourceId)
      .eq('org_id', orgId)
    
    if (error) throw error
  }
  
  /**
   * Get embedding stats
   */
  async getStats(orgId: string, days: number = 30): Promise<any> {
    const { data, error } = await this.supabase
      .from('embedding_stats')
      .select('*')
      .eq('org_id', orgId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  /**
   * Cache helpers
   */
  private async getCachedEmbedding(
    text: string,
    orgId: string
  ): Promise<{id: string, embedding: number[]} | null> {
    const hash = crypto.createHash('sha256').update(text).digest('hex')
    
    const { data, error } = await this.supabase
      .from('embedding_cache')
      .select('id, embedding')
      .eq('content_hash', hash)
      .eq('model', this.embeddingModel)
      .eq('org_id', orgId)
      .single()
    
    if (error || !data) return null
    
    return {
      id: data.id,
      embedding: JSON.parse(data.embedding as any)
    }
  }
  
  private async cacheEmbedding(
    text: string,
    embedding: number[],
    orgId: string
  ): Promise<void> {
    const hash = crypto.createHash('sha256').update(text).digest('hex')
    
    await this.supabase
      .from('embedding_cache')
      .upsert({
        content_hash: hash,
        embedding: JSON.stringify(embedding),
        model: this.embeddingModel,
        org_id: orgId
      }, {
        onConflict: 'content_hash,model,org_id'
      })
  }
  
  private async updateCacheAccess(cacheId: string): Promise<void> {
    await this.supabase
      .from('embedding_cache')
      .update({
        accessed_at: new Date().toISOString(),
        access_count: this.supabase.raw('access_count + 1')
      })
      .eq('id', cacheId)
  }
  
  private async logSearchMetrics(
    orgId: string,
    searchTimeMs: number
  ): Promise<void> {
    // This would typically be done in a background job
    // For now, just increment counter
    const today = new Date().toISOString().split('T')[0]
    
    await this.supabase.rpc('update_embedding_stats', {
      org_uuid: orgId,
      stat_date: today,
      search_time: searchTimeMs
    })
  }
}

// Singleton instance
export const vectorStore = new VectorStore()
```

---

## 2.3 Text Chunking Service

**File:** `apps/frontend/src/services/brain/TextChunker.ts`
```typescript
export interface Chunk {
  content: string
  index: number
  metadata: {
    startChar: number
    endChar: number
    sentenceCount: number
    wordCount: number
  }
}

export class TextChunker {
  /**
   * Intelligent chunking that respects sentence and paragraph boundaries
   */
  static chunk(
    text: string,
    options: {
      maxChunkSize?: number
      chunkOverlap?: number
      respectSentences?: boolean
    } = {}
  ): Chunk[] {
    const {
      maxChunkSize = 1000, // characters
      chunkOverlap = 200,
      respectSentences = true
    } = options
    
    if (respectSentences) {
      return this.sentenceAwareChunking(text, maxChunkSize, chunkOverlap)
    } else {
      return this.simpleChunking(text, maxChunkSize, chunkOverlap)
    }
  }
  
  /**
   * Sentence-aware chunking
   */
  private static sentenceAwareChunking(
    text: string,
    maxChunkSize: number,
    chunkOverlap: number
  ): Chunk[] {
    // Split into sentences
    const sentences = this.splitIntoSentences(text)
    
    const chunks: Chunk[] = []
    let currentChunk: string[] = []
    let currentLength = 0
    let charPosition = 0
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const sentenceLength = sentence.length
      
      // If adding this sentence exceeds max size, finalize current chunk
      if (currentLength + sentenceLength > maxChunkSize && currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ')
        chunks.push({
          content: chunkText,
          index: chunks.length,
          metadata: {
            startChar: charPosition,
            endChar: charPosition + chunkText.length,
            sentenceCount: currentChunk.length,
            wordCount: this.countWords(chunkText)
          }
        })
        
        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(
          currentChunk,
          chunkOverlap
        )
        
        charPosition += chunkText.length - overlapSentences.join(' ').length
        currentChunk = overlapSentences
        currentLength = currentChunk.join(' ').length
      }
      
      currentChunk.push(sentence)
      currentLength += sentenceLength + 1 // +1 for space
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ')
      chunks.push({
        content: chunkText,
        index: chunks.length,
        metadata: {
          startChar: charPosition,
          endChar: charPosition + chunkText.length,
          sentenceCount: currentChunk.length,
          wordCount: this.countWords(chunkText)
        }
      })
    }
    
    return chunks
  }
  
  /**
   * Simple character-based chunking
   */
  private static simpleChunking(
    text: string,
    maxChunkSize: number,
    chunkOverlap: number
  ): Chunk[] {
    const chunks: Chunk[] = []
    let position = 0
    
    while (position < text.length) {
      const end = Math.min(position + maxChunkSize, text.length)
      const chunk = text.substring(position, end)
      
      chunks.push({
        content: chunk,
        index: chunks.length,
        metadata: {
          startChar: position,
          endChar: end,
          sentenceCount: 0,
          wordCount: this.countWords(chunk)
        }
      })
      
      position += maxChunkSize - chunkOverlap
    }
    
    return chunks
  }
  
  /**
   * Split text into sentences
   */
  private static splitIntoSentences(text: string): string[] {
    // Advanced sentence splitting that handles edge cases
    const sentences: string[] = []
    
    // Split on sentence terminators, but handle abbreviations, decimals, etc.
    const pattern = /([.!?]+)(\s+|$)/g
    const parts = text.split(pattern)
    
    let current = ''
    for (let i = 0; i < parts.length; i += 3) {
      const text = parts[i] || ''
      const terminator = parts[i + 1] || ''
      const whitespace = parts[i + 2] || ''
      
      current += text + terminator
      
      // Check if this is a real sentence end
      if (this.isRealSentenceEnd(current)) {
        sentences.push(current.trim())
        current = ''
      } else {
        current += whitespace
      }
    }
    
    if (current.trim()) {
      sentences.push(current.trim())
    }
    
    return sentences.filter(s => s.length > 0)
  }
  
  /**
   * Check if sentence terminator is real or abbreviation
   */
  private static isRealSentenceEnd(text: string): boolean {
    const trimmed = text.trim()
    const lastWord = trimmed.split(/\s+/).pop() || ''
    
    // Common abbreviations
    const abbreviations = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'etc.', 'vs.', 'i.e.', 'e.g.']
    
    for (const abbr of abbreviations) {
      if (lastWord.endsWith(abbr)) {
        return false
      }
    }
    
    // Check for decimals
    if (/\d+\.$/.test(lastWord)) {
      return false
    }
    
    return true
  }
  
  /**
   * Get sentences for overlap
   */
  private static getOverlapSentences(
    sentences: string[],
    targetOverlap: number
  ): string[] {
    const overlap: string[] = []
    let length = 0
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i]
      if (length + sentence.length <= targetOverlap) {
        overlap.unshift(sentence)
        length += sentence.length + 1
      } else {
        break
      }
    }
    
    return overlap
  }
  
  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length
  }
}
```

**This is Phase 2. Creating Phases 3-8 in separate files for organization...**
