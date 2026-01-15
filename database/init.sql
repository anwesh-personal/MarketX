-- 01-KB Storage
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    stage VARCHAR(20) NOT NULL,
    data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Writer Runs
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type VARCHAR(20),
    input_snapshot JSONB NOT NULL,
    output_snapshot JSONB,
    status VARCHAR(20) DEFAULT 'PENDING',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 04-Analytics Events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES runs(id),
    variant_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for speed
CREATE INDEX idx_analytics_date ON analytics_events(occurred_at);
CREATE INDEX idx_analytics_variant ON analytics_events(variant_id);
