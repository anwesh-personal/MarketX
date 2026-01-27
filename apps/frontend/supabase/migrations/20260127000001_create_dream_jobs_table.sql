-- Add dream_jobs table for worker system
-- Based on WORKER_DEPLOYMENT_PLAN.md

CREATE TABLE IF NOT EXISTS dream_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id),
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX dream_jobs_org_idx ON dream_jobs(org_id, created_at DESC);
CREATE INDEX dream_jobs_status_idx ON dream_jobs(status);

COMMENT ON TABLE dream_jobs IS 'Queue for background worker jobs (Dream State, Learning Loop)';
