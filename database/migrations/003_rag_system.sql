-- ============================================================
-- AXIOM BRAIN - MIGRATION 003: RAG Orchestration System
-- Created: 2026-01-15
-- Description: Advanced Retrieval-Augmented Generation with
--              query expansion, reranking, caching, and analytics
-- ============================================================

-- ============================================================
-- RAG QUERY CACHE
-- ============================================================

-- Cache complete RAG results to reduce redundant processing
CREATE TABLE rag_query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query_hash VARCHAR(64) NOT NULL, -- SHA256 of query text
  query_text TEXT NOT NULL,
  results JSONB NOT NULL, -- Complete RAG result including documents and metadata
  retrieval_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(query_hash, org_id)
);

-- Indexes for cache lookups
CREATE INDEX rag_cache_hash_idx ON rag_query_cache(query_hash, org_id);
CREATE INDEX rag_cache_org_idx ON rag_query_cache(org_id);
CREATE INDEX rag_cache_accessed_idx ON rag_query_cache(accessed_at);

-- Comments
COMMENT ON TABLE rag_query_cache IS 'Cache layer for RAG query results with 5-minute TTL';
COMMENT ON COLUMN rag_query_cache.query_hash IS 'SHA256 hash of original query text';
COMMENT ON COLUMN rag_query_cache.results IS 'Complete RAG response: context, documents, scores, metadata';

-- ============================================================
-- QUERY EXPANSIONS
-- ============================================================

-- Track query expansion strategies and results
CREATE TABLE query_expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_query TEXT NOT NULL,
  expanded_queries TEXT[] NOT NULL,
  expansion_method VARCHAR(50) CHECK (expansion_method IN ('synonyms', 'llm', 'embedding_neighbors', 'hybrid')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX query_expansions_org_idx ON query_expansions(org_id, created_at DESC);
CREATE INDEX query_expansions_method_idx ON query_expansions(expansion_method);

-- Comments
COMMENT ON TABLE query_expansions IS 'Track query expansion patterns for learning loop optimization';
COMMENT ON COLUMN query_expansions.expansion_method IS 'Method used: synonyms (rule-based), llm (GPT-generated), embedding_neighbors (vector similarity)';

-- ============================================================
-- RERANKING MODELS
-- ============================================================

-- Registry of reranking models for result optimization
CREATE TABLE reranking_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('cross_encoder', 'llm', 'custom')),
  model_identifier VARCHAR(255), -- e.g., 'cross-encoder/ms-marco-MiniLM-L-12-v2'
  provider_id UUID REFERENCES ai_providers(id), -- For LLM-based reranking
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX reranking_models_type_idx ON reranking_models(model_type, is_active);
CREATE INDEX reranking_models_active_idx ON reranking_models(is_active);

-- Comments
COMMENT ON TABLE reranking_models IS 'Registry of reranking models for improving retrieval relevance';
COMMENT ON COLUMN reranking_models.model_type IS 'cross_encoder: dedicated reranker, llm: GPT-based scoring, custom: user implementation';

-- Insert default reranking models
INSERT INTO reranking_models (name, model_type, model_identifier, config) VALUES
(
  'MS-MARCO MiniLM v2',
  'cross_encoder',
  'cross-encoder/ms-marco-MiniLM-L-12-v2',
  '{
    "max_length": 512,
    "batch_size": 32,
    "description": "Fast and accurate reranker for general queries"
  }'::JSONB
),
(
  'LLM Reranker (GPT-4)',
  'llm',
  'gpt-4-turbo-preview',
  '{
    "temperature": 0.0,
    "prompt": "Score the relevance of the following passage to the query on a scale of 0-10. Query: {query}\n\nPassage: {passage}\n\nRelevance score:",
    "description": "High-quality but slower reranking using GPT-4"
  }'::JSONB
);

-- ============================================================
-- RAG PERFORMANCE METRICS
-- ============================================================

-- Track detailed RAG performance metrics per query
CREATE TABLE rag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brain_template_id UUID REFERENCES brain_templates(id),
  query_text TEXT,
  query_hash VARCHAR(64),
  retrieval_time_ms INTEGER,
  reranking_time_ms INTEGER,
  total_time_ms INTEGER,
  total_docs_retrieved INTEGER,
  final_docs_count INTEGER,
  avg_relevance_score FLOAT,
  cache_hit BOOLEAN DEFAULT false,
  expansion_used BOOLEAN DEFAULT false,
  reranking_used BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX rag_metrics_org_idx ON rag_metrics(org_id, created_at DESC);
CREATE INDEX rag_metrics_brain_idx ON rag_metrics(brain_template_id, created_at DESC);
CREATE INDEX rag_metrics_hash_idx ON rag_metrics(query_hash);
CREATE INDEX rag_metrics_cache_idx ON rag_metrics(cache_hit, created_at DESC);

-- Comments
COMMENT ON TABLE rag_metrics IS 'Detailed performance metrics for every RAG query';
COMMENT ON COLUMN rag_metrics.avg_relevance_score IS 'Average relevance score of retrieved documents (0-1)';

-- ============================================================
-- MATERIALIZED VIEW: RAG Performance Statistics
-- ============================================================

-- Aggregated RAG performance metrics
CREATE MATERIALIZED VIEW rag_performance_stats AS
SELECT 
  brain_template_id,
  DATE(created_at) as date,
  COUNT(*) as total_queries,
  AVG(retrieval_time_ms) as avg_retrieval_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY retrieval_time_ms) as p95_retrieval_ms,
  AVG(reranking_time_ms) as avg_reranking_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY reranking_time_ms) as p95_reranking_ms,
  AVG(total_time_ms) as avg_total_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_time_ms) as p95_total_ms,
  AVG(total_docs_retrieved) as avg_docs_retrieved,
  AVG(final_docs_count) as avg_final_docs,
  AVG(avg_relevance_score) as avg_relevance,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as cache_hit_rate,
  SUM(CASE WHEN expansion_used THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as expansion_usage_rate,
  SUM(CASE WHEN reranking_used THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as reranking_usage_rate
FROM rag_metrics
WHERE created_at >= NOW() - INTERVAL '90 days'
  AND total_time_ms IS NOT NULL
GROUP BY brain_template_id, DATE(created_at);

-- Indexes on materialized view
CREATE INDEX rag_perf_stats_brain_date_idx ON rag_performance_stats(brain_template_id, date DESC);
CREATE INDEX rag_perf_stats_date_idx ON rag_performance_stats(date DESC);

-- Comments
COMMENT ON MATERIALIZED VIEW rag_performance_stats IS 'Daily aggregated RAG performance metrics for analytics dashboard';

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Cleanup old RAG cache entries (5 minute TTL)
CREATE OR REPLACE FUNCTION cleanup_rag_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rag_query_cache
  WHERE accessed_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_rag_cache IS 'Remove RAG cache entries older than 5 minutes (called by cron)';

-- Refresh RAG performance statistics
CREATE OR REPLACE FUNCTION refresh_rag_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY rag_performance_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_rag_stats IS 'Refresh RAG performance statistics materialized view';

-- Update RAG metrics (called by RAG orchestrator)
CREATE OR REPLACE FUNCTION log_rag_metrics(
  org_uuid UUID,
  brain_uuid UUID,
  query TEXT,
  query_sha256 VARCHAR,
  retrieval_ms INTEGER,
  reranking_ms INTEGER,
  total_ms INTEGER,
  docs_retrieved INTEGER,
  docs_final INTEGER,
  avg_score FLOAT,
  is_cache_hit BOOLEAN,
  used_expansion BOOLEAN,
  used_reranking BOOLEAN,
  extra_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO rag_metrics (
    org_id,
    brain_template_id,
    query_text,
    query_hash,
    retrieval_time_ms,
    reranking_time_ms,
    total_time_ms,
    total_docs_retrieved,
    final_docs_count,
    avg_relevance_score,
    cache_hit,
    expansion_used,
    reranking_used,
    metadata
  ) VALUES (
    org_uuid,
    brain_uuid,
    query,
    query_sha256,
    retrieval_ms,
    reranking_ms,
    total_ms,
    docs_retrieved,
    docs_final,
    avg_score,
    is_cache_hit,
    used_expansion,
    used_reranking,
    extra_metadata
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_rag_metrics IS 'Log RAG query performance metrics';

-- Get cached RAG result
CREATE OR REPLACE FUNCTION get_rag_cache(
  query_sha256 VARCHAR,
  org_uuid UUID
)
RETURNS JSONB AS $$
DECLARE
  cached_result JSONB;
BEGIN
  -- Get cached result if not expired
  SELECT results INTO cached_result
  FROM rag_query_cache
  WHERE query_hash = query_sha256
    AND org_id = org_uuid
    AND accessed_at >= NOW() - INTERVAL '5 minutes';
  
  -- Update access stats if found
  IF cached_result IS NOT NULL THEN
    UPDATE rag_query_cache
    SET 
      accessed_at = NOW(),
      access_count = access_count + 1
    WHERE query_hash = query_sha256
      AND org_id = org_uuid;
  END IF;
  
  RETURN cached_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_rag_cache IS 'Retrieve cached RAG result and update access stats';

-- Cache RAG result
CREATE OR REPLACE FUNCTION cache_rag_result(
  query_sha256 VARCHAR,
  org_uuid UUID,
  query TEXT,
  result JSONB,
  retrieval_ms INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO rag_query_cache (
    org_id,
    query_hash,
    query_text,
    results,
    retrieval_time_ms
  ) VALUES (
    org_uuid,
    query_sha256,
    query,
    result,
    retrieval_ms
  )
  ON CONFLICT (query_hash, org_id) DO UPDATE SET
    results = EXCLUDED.results,
    retrieval_time_ms = EXCLUDED.retrieval_time_ms,
    accessed_at = NOW(),
    access_count = rag_query_cache.access_count + 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cache_rag_result IS 'Cache RAG query result';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at for reranking models
CREATE OR REPLACE FUNCTION update_reranking_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reranking_models_updated_at 
BEFORE UPDATE ON reranking_models
FOR EACH ROW 
EXECUTE FUNCTION update_reranking_models_updated_at();

-- ============================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================

-- To maintain optimal RAG cache performance:
-- 1. Run cleanup_rag_cache() every minute via cron
-- 2. Monitor cache hit rate via rag_performance_stats
-- 3. Adjust TTL if needed (currently 5 minutes)
-- 4. Consider partitioning rag_metrics by month for very high volume
--
-- Recommended cron schedule:
-- */1 * * * * - cleanup_rag_cache()
-- */15 * * * * - refresh_rag_stats()

-- ============================================================
-- GRANTS (Security)
-- ============================================================

-- Revoke public access
REVOKE ALL ON rag_query_cache FROM PUBLIC;
REVOKE ALL ON query_expansions FROM PUBLIC;
REVOKE ALL ON reranking_models FROM PUBLIC;
REVOKE ALL ON rag_metrics FROM PUBLIC;

-- Grant appropriate access
-- GRANT SELECT ON rag_query_cache TO authenticated;
-- GRANT ALL ON rag_query_cache TO service_role;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 003_rag_system.sql completed successfully';
  RAISE NOTICE 'Created RAG query cache with 5-minute TTL';
  RAISE NOTICE 'Created query expansion tracking';
  RAISE NOTICE 'Created reranking models registry';
  RAISE NOTICE 'Created RAG performance metrics system';
  RAISE NOTICE 'Inserted 2 default reranking models';
  RAISE NOTICE 'RAG orchestration system ready';
END $$;
