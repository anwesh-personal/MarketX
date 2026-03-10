-- 00000000000028_vector_rag_production_fix.sql
-- Fix vector system: align embeddings schema, RPCs, and RAG cache to match VectorStore.ts + RAGOrchestrator.ts

-- 1. Fix embeddings.source_type CHECK to match VectorStore expectations
ALTER TABLE embeddings DROP CONSTRAINT IF EXISTS embeddings_source_type_check;
ALTER TABLE embeddings ADD CONSTRAINT embeddings_source_type_check
    CHECK (source_type IN ('kb', 'conversation', 'user_memory', 'system', 'brain_memory'));

-- 2. Add source_id as UUID if it was VARCHAR (safe ALTER)
-- The legacy had VARCHAR(255), VectorStore expects UUID
-- We keep it flexible by not changing type — both work through RPC

-- 3. Drop old vector_search/hybrid_search and recreate with correct signatures

DROP FUNCTION IF EXISTS vector_search(UUID, vector, INTEGER, FLOAT, VARCHAR);
DROP FUNCTION IF EXISTS vector_search(vector, UUID, VARCHAR[], INTEGER, FLOAT);

CREATE OR REPLACE FUNCTION vector_search(
    query_embedding vector(1536),
    org_uuid UUID,
    source_types VARCHAR[] DEFAULT NULL,
    top_k INTEGER DEFAULT 5,
    min_similarity FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity_score FLOAT,
    source_type VARCHAR,
    source_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.content,
        e.metadata,
        (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity_score,
        e.source_type::VARCHAR,
        e.source_id::VARCHAR
    FROM embeddings e
    WHERE e.org_id = org_uuid
      AND (source_types IS NULL OR e.source_type = ANY(source_types))
      AND (1 - (e.embedding <=> query_embedding)) >= min_similarity
      AND (e.is_active IS NULL OR e.is_active = true)
    ORDER BY e.embedding <=> query_embedding
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

DROP FUNCTION IF EXISTS hybrid_search(UUID, TEXT, vector, INTEGER, FLOAT, FLOAT);
DROP FUNCTION IF EXISTS hybrid_search(vector, TEXT, UUID, VARCHAR[], INTEGER, FLOAT, FLOAT, FLOAT);

CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(1536),
    query_text TEXT,
    org_uuid UUID,
    source_types VARCHAR[] DEFAULT NULL,
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
    source_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH vs AS (
        SELECT
            e.id, e.content, e.metadata, e.source_type, e.source_id,
            (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity
        FROM embeddings e
        WHERE e.org_id = org_uuid
          AND (source_types IS NULL OR e.source_type = ANY(source_types))
          AND (1 - (e.embedding <=> query_embedding)) >= min_similarity
          AND (e.is_active IS NULL OR e.is_active = true)
        ORDER BY e.embedding <=> query_embedding
        LIMIT top_k * 2
    ),
    fs AS (
        SELECT
            e.id,
            ts_rank_cd(to_tsvector('english', e.content), plainto_tsquery('english', query_text))::FLOAT AS rank
        FROM embeddings e
        WHERE e.org_id = org_uuid
          AND (source_types IS NULL OR e.source_type = ANY(source_types))
          AND to_tsvector('english', e.content) @@ plainto_tsquery('english', query_text)
          AND (e.is_active IS NULL OR e.is_active = true)
        LIMIT top_k * 2
    )
    SELECT DISTINCT ON (vs.id)
        vs.id,
        vs.content,
        vs.metadata,
        (vs.similarity * vector_weight + COALESCE(fs.rank, 0) * fts_weight)::FLOAT AS combined_score,
        vs.similarity AS vector_score,
        COALESCE(fs.rank, 0)::FLOAT AS fts_score,
        vs.source_type::VARCHAR,
        vs.source_id::VARCHAR
    FROM vs
    LEFT JOIN fs ON vs.id = fs.id
    ORDER BY vs.id, combined_score DESC
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. batch_insert_embeddings
CREATE OR REPLACE FUNCTION batch_insert_embeddings(embeddings_data JSONB)
RETURNS INTEGER AS $$
DECLARE inserted_count INTEGER;
BEGIN
    INSERT INTO embeddings (org_id, source_type, source_id, chunk_index, content, embedding, metadata)
    SELECT
        (value->>'org_id')::UUID,
        value->>'source_type',
        value->>'source_id',
        COALESCE((value->>'chunk_index')::INTEGER, 0),
        value->>'content',
        (value->>'embedding')::vector(1536),
        COALESCE((value->'metadata')::JSONB, '{}'::JSONB)
    FROM jsonb_array_elements(embeddings_data);
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. get_rag_cache
CREATE OR REPLACE FUNCTION get_rag_cache(query_sha256 VARCHAR, org_uuid UUID)
RETURNS JSONB AS $$
DECLARE cached_result JSONB;
BEGIN
    SELECT results INTO cached_result
    FROM rag_query_cache
    WHERE query_hash = query_sha256
      AND org_id = org_uuid
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (last_accessed_at IS NULL OR last_accessed_at >= NOW() - INTERVAL '5 minutes');
    IF cached_result IS NOT NULL THEN
        UPDATE rag_query_cache
        SET last_accessed_at = NOW(), access_count = access_count + 1
        WHERE query_hash = query_sha256 AND org_id = org_uuid;
    END IF;
    RETURN cached_result;
END;
$$ LANGUAGE plpgsql;

-- 6. cache_rag_result
CREATE OR REPLACE FUNCTION cache_rag_result(
    query_sha256 VARCHAR, org_uuid UUID, query TEXT, result JSONB, retrieval_ms INTEGER
)
RETURNS void AS $$
BEGIN
    INSERT INTO rag_query_cache (org_id, query_hash, query_text, results, result_count, expires_at, last_accessed_at)
    VALUES (org_uuid, query_sha256, query, result, COALESCE(jsonb_array_length(result->'documents'), 0), NOW() + INTERVAL '5 minutes', NOW())
    ON CONFLICT (org_id, query_hash) DO UPDATE SET
        results = EXCLUDED.results,
        result_count = EXCLUDED.result_count,
        expires_at = NOW() + INTERVAL '5 minutes',
        last_accessed_at = NOW(),
        access_count = rag_query_cache.access_count + 1;
END;
$$ LANGUAGE plpgsql;

-- 7. update_embedding_stats
CREATE OR REPLACE FUNCTION update_embedding_stats(
    org_uuid UUID, stat_date DATE,
    search_time_ms INTEGER DEFAULT NULL,
    cache_hit BOOLEAN DEFAULT NULL,
    tokens_used INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO embedding_stats (org_id, date, total_embeddings, cache_hits, cache_misses, tokens_used)
    VALUES (org_uuid, stat_date, 0,
        CASE WHEN cache_hit = true THEN 1 ELSE 0 END,
        CASE WHEN cache_hit = false THEN 1 ELSE 0 END,
        COALESCE(tokens_used, 0))
    ON CONFLICT (org_id, date) DO UPDATE SET
        cache_hits = embedding_stats.cache_hits + CASE WHEN cache_hit = true THEN 1 ELSE 0 END,
        cache_misses = embedding_stats.cache_misses + CASE WHEN cache_hit = false THEN 1 ELSE 0 END,
        tokens_used = embedding_stats.tokens_used + COALESCE(tokens_used, 0);
END;
$$ LANGUAGE plpgsql;

-- 8. update_cache_access
CREATE OR REPLACE FUNCTION update_cache_access(cache_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE embedding_cache SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE id = cache_uuid;
END;
$$ LANGUAGE plpgsql;

-- 9. get_org_embedding_count
CREATE OR REPLACE FUNCTION get_org_embedding_count(org_uuid UUID)
RETURNS INTEGER AS $$
DECLARE count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count FROM embeddings WHERE org_id = org_uuid;
    RETURN count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. delete_embeddings_by_source
CREATE OR REPLACE FUNCTION delete_embeddings_by_source(source_uuid UUID, org_uuid UUID)
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM embeddings WHERE source_id = source_uuid::VARCHAR AND org_id = org_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. FTS index if missing
CREATE INDEX IF NOT EXISTS embeddings_fts_idx ON embeddings USING gin(to_tsvector('english', content));

COMMIT;
