-- ============================================================
-- AXIOM BRAIN - MIGRATION 002: Vector Store & Embeddings System
-- Created: 2026-01-15
-- Description: pgvector-based semantic search with hybrid retrieval,
--              embedding cache, and performance monitoring
-- ============================================================

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for trigram similarity (used in FTS)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- EMBEDDINGS STORAGE
-- ============================================================

-- Main embeddings table for all vector data
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

-- Vector similarity index using IVFFlat
-- Lists parameter: sqrt(total_rows) is optimal, starting with 100
-- Will need to be tuned as data grows: REINDEX INDEX embeddings_vector_idx;
CREATE INDEX embeddings_vector_idx ON embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Metadata filtering index (GIN for JSONB queries)
CREATE INDEX embeddings_metadata_idx ON embeddings USING gin(metadata);

-- Multi-tenant isolation index
CREATE INDEX embeddings_org_source_idx ON embeddings(org_id, source_type);
CREATE INDEX embeddings_source_idx ON embeddings(source_id, chunk_index);

-- Full-text search index using GIN
CREATE INDEX embeddings_fts_idx ON embeddings 
USING gin(to_tsvector('english', content));

-- Composite index for common queries
CREATE INDEX embeddings_org_fts_idx ON embeddings(org_id) 
INCLUDE (content);

-- Comments
COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic search across all content types';
COMMENT ON COLUMN embeddings.source_type IS 'Type of content: kb, conversation, user_memory, system';
COMMENT ON COLUMN embeddings.embedding IS '1536-dimension vector from text-embedding-3-large';
COMMENT ON COLUMN embeddings.metadata IS 'Additional context: file_name, page_number, conversation_id, etc.';

-- ============================================================
-- EMBEDDING CACHE
-- ============================================================

-- Cache embeddings by content hash to reduce API calls
CREATE TABLE embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) NOT NULL, -- SHA256 hash of content
  embedding vector(1536) NOT NULL,
  model VARCHAR(100) NOT NULL, -- e.g., 'text-embedding-3-large'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(content_hash, model, org_id)
);

-- Indexes for cache lookups
CREATE INDEX embedding_cache_hash_idx ON embedding_cache(content_hash, model);
CREATE INDEX embedding_cache_org_idx ON embedding_cache(org_id);
CREATE INDEX embedding_cache_accessed_idx ON embedding_cache(accessed_at);

-- Comments
COMMENT ON TABLE embedding_cache IS 'Cache layer for embeddings to reduce API costs';
COMMENT ON COLUMN embedding_cache.content_hash IS 'SHA256 hash of original text content';
COMMENT ON COLUMN embedding_cache.access_count IS 'Number of times this cached embedding was reused';

-- ============================================================
-- HYBRID SEARCH FUNCTION
-- ============================================================

-- Combines vector similarity search with full-text search
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
  fts_score FLOAT,
  source_type VARCHAR,
  source_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      e.id,
      e.content,
      e.metadata,
      e.source_type,
      e.source_id,
      1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    WHERE e.org_id = org_uuid
      AND (source_types IS NULL OR e.source_type = ANY(source_types))
      AND 1 - (e.embedding <=> query_embedding) >= min_similarity
    ORDER BY e.embedding <=> query_embedding
    LIMIT top_k * 2  -- Get more candidates for reranking
  ),
  fts_search AS (
    SELECT 
      e.id,
      e.content,
      e.metadata,
      e.source_type,
      e.source_id,
      ts_rank_cd(
        to_tsvector('english', e.content),
        plainto_tsquery('english', query_text)
      ) AS rank
    FROM embeddings e
    WHERE e.org_id = org_uuid
      AND (source_types IS NULL OR e.source_type = ANY(source_types))
      AND to_tsvector('english', e.content) @@ plainto_tsquery('english', query_text)
    LIMIT top_k * 2  -- Get more candidates for reranking
  )
  SELECT DISTINCT ON (v.id)
    v.id,
    v.content,
    v.metadata,
    (v.similarity * vector_weight + COALESCE(f.rank, 0) * fts_weight) AS combined_score,
    v.similarity AS vector_score,
    COALESCE(f.rank, 0) AS fts_score,
    v.source_type,
    v.source_id
  FROM vector_search v
  LEFT JOIN fts_search f ON v.id = f.id
  ORDER BY combined_score DESC
  LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION hybrid_search IS 'Hybrid semantic + keyword search with weighted scoring';

-- ============================================================
-- VECTOR-ONLY SEARCH FUNCTION
-- ============================================================

-- Pure vector similarity search (faster when FTS not needed)
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(1536),
  org_uuid UUID,
  source_types VARCHAR[],
  top_k INTEGER DEFAULT 5,
  min_similarity FLOAT DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity_score FLOAT,
  source_type VARCHAR,
  source_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity_score,
    e.source_type,
    e.source_id
  FROM embeddings e
  WHERE e.org_id = org_uuid
    AND (source_types IS NULL OR e.source_type = ANY(source_types))
    AND 1 - (e.embedding <=> query_embedding) >= min_similarity
  ORDER BY e.embedding <=> query_embedding
  LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION vector_search IS 'Pure vector similarity search using cosine distance';

-- ============================================================
-- BATCH EMBEDDING INSERTION
-- ============================================================

-- Efficient bulk insertion of embeddings
CREATE OR REPLACE FUNCTION batch_insert_embeddings(
  embeddings_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO embeddings (
    org_id,
    source_type,
    source_id,
    chunk_index,
    content,
    embedding,
    metadata
  )
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

COMMENT ON FUNCTION batch_insert_embeddings IS 'Bulk insert embeddings from JSONB array';

-- ============================================================
-- CACHE MANAGEMENT FUNCTIONS
-- ============================================================

-- Auto-cleanup old cache entries (called by cron job)
CREATE OR REPLACE FUNCTION cleanup_embedding_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM embedding_cache
  WHERE accessed_at < NOW() - INTERVAL '30 days'
    AND access_count < 3;  -- Keep frequently used entries longer
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_embedding_cache IS 'Remove old, rarely-used cache entries (30+ days, <3 accesses)';

-- Update cache access timestamp
CREATE OR REPLACE FUNCTION update_cache_access(cache_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE embedding_cache
  SET 
    accessed_at = NOW(),
    access_count = access_count + 1
  WHERE id = cache_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_cache_access IS 'Update cache access statistics';

-- ============================================================
-- STATISTICS & MONITORING
-- ============================================================

-- Track embedding and search statistics per org
CREATE TABLE embedding_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_embeddings INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  avg_search_time_ms FLOAT DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  cache_hit_rate FLOAT DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  UNIQUE(org_id, date)
);

CREATE INDEX embedding_stats_org_date_idx ON embedding_stats(org_id, date DESC);

COMMENT ON TABLE embedding_stats IS 'Daily statistics for embedding operations per organization';

-- Function to update embedding stats
CREATE OR REPLACE FUNCTION update_embedding_stats(
  org_uuid UUID,
  stat_date DATE,
  search_time_ms INTEGER DEFAULT NULL,
  cache_hit BOOLEAN DEFAULT NULL,
  tokens_used INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO embedding_stats (org_id, date, total_searches, avg_search_time_ms, cache_hits, cache_misses, total_tokens_used)
  VALUES (
    org_uuid,
    stat_date,
    CASE WHEN search_time_ms IS NOT NULL THEN 1 ELSE 0 END,
    COALESCE(search_time_ms::FLOAT, 0),
    CASE WHEN cache_hit = true THEN 1 ELSE 0 END,
    CASE WHEN cache_hit = false THEN 1 ELSE 0 END,
    COALESCE(tokens_used, 0)
  )
  ON CONFLICT (org_id, date) DO UPDATE SET
    total_searches = embedding_stats.total_searches + 
      CASE WHEN search_time_ms IS NOT NULL THEN 1 ELSE 0 END,
    avg_search_time_ms = (
      embedding_stats.avg_search_time_ms * embedding_stats.total_searches + 
      COALESCE(search_time_ms::FLOAT, 0)
    ) / NULLIF(embedding_stats.total_searches + 1, 0),
    cache_hits = embedding_stats.cache_hits + 
      CASE WHEN cache_hit = true THEN 1 ELSE 0 END,
    cache_misses = embedding_stats.cache_misses + 
      CASE WHEN cache_hit = false THEN 1 ELSE 0 END,
    cache_hit_rate = (
      embedding_stats.cache_hits + CASE WHEN cache_hit = true THEN 1 ELSE 0 END
    )::FLOAT / NULLIF(
      embedding_stats.cache_hits + embedding_stats.cache_misses + 1, 0
    ),
    total_tokens_used = embedding_stats.total_tokens_used + COALESCE(tokens_used, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_embedding_stats IS 'Incrementally update embedding statistics';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER embeddings_updated_at 
BEFORE UPDATE ON embeddings
FOR EACH ROW 
EXECUTE FUNCTION update_embeddings_updated_at();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get embedding count for an organization
CREATE OR REPLACE FUNCTION get_org_embedding_count(org_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM embeddings
  WHERE org_id = org_uuid;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_org_embedding_count IS 'Get total embedding count for an organization';

-- Get embedding count by source type
CREATE OR REPLACE FUNCTION get_embedding_count_by_source(
  org_uuid UUID,
  source VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM embeddings
  WHERE org_id = org_uuid
    AND source_type = source;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_embedding_count_by_source IS 'Get embedding count for specific source type';

-- Delete embeddings by source
CREATE OR REPLACE FUNCTION delete_embeddings_by_source(
  source_uuid UUID,
  org_uuid UUID
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM embeddings
  WHERE source_id = source_uuid
    AND org_id = org_uuid;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_embeddings_by_source IS 'Delete all embeddings for a specific source (e.g., deleted KB)';

-- ============================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================

-- To optimize IVFFlat index as data grows:
-- 1. Monitor table size: SELECT pg_size_pretty(pg_total_relation_size('embeddings'));
-- 2. Adjust lists parameter: ALTER INDEX embeddings_vector_idx SET (lists = <new_value>);
--    Recommended: lists = sqrt(total_rows), e.g., 1000 for 1M rows
-- 3. Rebuild index: REINDEX INDEX CONCURRENTLY embeddings_vector_idx;
-- 
-- For very large tables (10M+ embeddings), consider:
-- - HNSW index instead of IVFFlat (better recall, slower build)
-- - Partitioning by org_id or source_type
-- - Separate indexes per source_type

-- ============================================================
-- GRANTS (Security)
-- ============================================================

-- Revoke public access
REVOKE ALL ON embeddings FROM PUBLIC;
REVOKE ALL ON embedding_cache FROM PUBLIC;
REVOKE ALL ON embedding_stats FROM PUBLIC;

-- Grant appropriate access based on your RLS setup
-- GRANT SELECT, INSERT, UPDATE, DELETE ON embeddings TO authenticated;
-- GRANT ALL ON embeddings TO service_role;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 002_vector_system.sql completed successfully';
  RAISE NOTICE 'pgvector extension enabled';
  RAISE NOTICE 'Created embeddings table with IVFFlat index';
  RAISE NOTICE 'Created embedding cache system';
  RAISE NOTICE 'Hybrid search function created';
  RAISE NOTICE 'Vector system ready for semantic search';
END $$;
