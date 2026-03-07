-- ============================================================
-- WORKER SYSTEM TABLES
-- ============================================================

-- Job tracking and status for all worker queues
CREATE TABLE IF NOT EXISTS worker_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name VARCHAR(100) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS worker_jobs_status_idx ON worker_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS worker_jobs_queue_idx ON worker_jobs(queue_name, status);
CREATE INDEX IF NOT EXISTS worker_jobs_type_idx ON worker_jobs(job_type, created_at DESC);

-- KB Processing specific tracking
CREATE TABLE IF NOT EXISTS kb_processing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  document_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  total_chunks INTEGER,
  processed_chunks INTEGER DEFAULT 0,
  total_embeddings INTEGER,
  processed_embeddings INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kb_processing_kb_idx ON kb_processing_status(kb_id, status);

-- Conversation summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversation_summaries_conv_idx ON conversation_summaries(conversation_id, created_at DESC);

-- Daily metrics aggregation
CREATE TABLE IF NOT EXISTS brain_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_template_id UUID REFERENCES brain_templates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  avg_response_time FLOAT,
  total_tokens INTEGER DEFAULT 0,
  avg_rating FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brain_template_id, date)
);

CREATE INDEX IF NOT EXISTS brain_daily_metrics_date_idx ON brain_daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS brain_daily_metrics_brain_idx ON brain_daily_metrics(brain_template_id, date DESC);

-- Validation
DO $$
BEGIN
  RAISE NOTICE 'Worker system tables created successfully';
END $$;
