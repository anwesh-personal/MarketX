-- Worker Jobs Tables
-- Required by dream-state-worker and other workers for job tracking

-- ============================================================
-- DREAM JOBS (Dream State Worker tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS dream_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS dream_jobs_org_idx ON dream_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dream_jobs_status_idx ON dream_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS dream_jobs_type_idx ON dream_jobs(type, created_at DESC);

-- ============================================================
-- WORKER JOB LOGS (General worker activity)
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(100) NOT NULL,
    queue_name VARCHAR(50) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    attempt INTEGER DEFAULT 1,
    payload JSONB,
    result JSONB,
    error TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS worker_job_logs_queue_idx ON worker_job_logs(queue_name, created_at DESC);
CREATE INDEX IF NOT EXISTS worker_job_logs_status_idx ON worker_job_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS worker_job_logs_org_idx ON worker_job_logs(org_id, created_at DESC);

-- ============================================================
-- RETRY QUEUE (For failed jobs that need retry)
-- ============================================================
CREATE TABLE IF NOT EXISTS retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id VARCHAR(100) NOT NULL,
    queue_name VARCHAR(50) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'exhausted')),
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS retry_queue_status_idx ON retry_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS retry_queue_org_idx ON retry_queue(org_id);

-- ============================================================
-- QUERY CACHE (For RAG optimization)
-- ============================================================
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

CREATE INDEX IF NOT EXISTS query_cache_lookup_idx ON query_cache(org_id, query_hash);
CREATE INDEX IF NOT EXISTS query_cache_expiry_idx ON query_cache(expires_at);

-- ============================================================
-- RAG METRICS (For pattern precomputation)
-- ============================================================
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

CREATE INDEX IF NOT EXISTS rag_metrics_org_idx ON rag_metrics(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rag_metrics_query_idx ON rag_metrics USING gin(to_tsvector('english', query_text));

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE dream_jobs IS 'Tracks dream state worker jobs (memory consolidation, cleanup, etc.)';
COMMENT ON TABLE worker_job_logs IS 'General log of all worker job executions';
COMMENT ON TABLE retry_queue IS 'Queue for jobs that failed and need retry';
COMMENT ON TABLE query_cache IS 'Cache for RAG query responses';
COMMENT ON TABLE rag_metrics IS 'Metrics for RAG query performance analysis';
