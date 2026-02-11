-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 04
-- Vector Embeddings & RAG System
-- Source: System B (002, 003)
-- ============================================================

CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'icp', 'offer', 'blueprint', 'layout', 'angle', 'cta', 'strategy',
        'brand', 'content', 'document', 'faq', 'knowledge'
    )),
    source_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    chunk_index INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 1,
    token_count INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_org ON embeddings(org_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_kb ON embeddings(kb_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_active ON embeddings(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS embedding_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    content_hash VARCHAR(64) NOT NULL,
    embedding vector(1536) NOT NULL,
    model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    UNIQUE(org_id, content_hash, model)
);

CREATE INDEX IF NOT EXISTS idx_embed_cache_hash ON embedding_cache(content_hash, org_id);

CREATE TABLE IF NOT EXISTS embedding_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_embeddings INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    avg_latency_ms DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, date)
);

-- RAG tables
CREATE TABLE IF NOT EXISTS rag_query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    results JSONB NOT NULL,
    result_count INTEGER DEFAULT 0,
    model VARCHAR(100),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, query_hash)
);

CREATE INDEX IF NOT EXISTS idx_rag_cache_hash ON rag_query_cache(query_hash, org_id);
CREATE INDEX IF NOT EXISTS idx_rag_cache_expires ON rag_query_cache(expires_at);

CREATE TABLE IF NOT EXISTS query_expansions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    original_query TEXT NOT NULL,
    expanded_queries TEXT[] NOT NULL,
    expansion_method VARCHAR(50) DEFAULT 'llm',
    model VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    retrieval_time_ms INTEGER,
    result_count INTEGER,
    rerank_applied BOOLEAN DEFAULT false,
    cache_hit BOOLEAN DEFAULT false,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_metrics_org ON rag_metrics(org_id, created_at DESC);

-- Query cache (from 013)
CREATE TABLE IF NOT EXISTS query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT NOT NULL,
    response JSONB NOT NULL,
    hit_count INTEGER DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, query_hash)
);

CREATE INDEX IF NOT EXISTS idx_query_cache_lookup ON query_cache(org_id, query_hash);
CREATE INDEX IF NOT EXISTS idx_query_cache_expiry ON query_cache(expires_at);

-- Response cache (from 011)
CREATE TABLE IF NOT EXISTS response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    response JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    UNIQUE(org_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_response_cache_key ON response_cache(cache_key, org_id);
CREATE INDEX IF NOT EXISTS idx_response_cache_expires ON response_cache(expires_at);

-- ============================================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION vector_search(
    p_org_id UUID,
    p_embedding vector(1536),
    p_match_count INTEGER DEFAULT 10,
    p_match_threshold FLOAT DEFAULT 0.7,
    p_source_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID, source_type VARCHAR, source_id VARCHAR,
    content TEXT, metadata JSONB, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.source_type, e.source_id,
           e.content, e.metadata,
           1 - (e.embedding <=> p_embedding) AS similarity
    FROM embeddings e
    WHERE e.org_id = p_org_id
      AND e.is_active = true
      AND (p_source_type IS NULL OR e.source_type = p_source_type)
      AND 1 - (e.embedding <=> p_embedding) > p_match_threshold
    ORDER BY e.embedding <=> p_embedding
    LIMIT p_match_count;
END;
$$;

CREATE OR REPLACE FUNCTION hybrid_search(
    p_org_id UUID,
    p_query TEXT,
    p_embedding vector(1536),
    p_match_count INTEGER DEFAULT 10,
    p_vector_weight FLOAT DEFAULT 0.7,
    p_text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    id UUID, source_type VARCHAR, source_id VARCHAR,
    content TEXT, metadata JSONB, combined_score FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.source_type, e.source_id,
           e.content, e.metadata,
           (p_vector_weight * (1 - (e.embedding <=> p_embedding)) +
            p_text_weight * ts_rank(to_tsvector('english', e.content), plainto_tsquery('english', p_query))
           ) AS combined_score
    FROM embeddings e
    WHERE e.org_id = p_org_id AND e.is_active = true
    ORDER BY combined_score DESC
    LIMIT p_match_count;
END;
$$;

-- KB processing status (used by workers)
CREATE TABLE IF NOT EXISTS kb_processing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_processing_kb ON kb_processing_status(kb_id);
