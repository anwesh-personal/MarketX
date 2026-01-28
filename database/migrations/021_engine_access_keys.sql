-- Migration: 021_engine_access_keys
-- Description: Create table for authenticating external calls TO the engine

CREATE TABLE engine_access_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,         -- Stored securely (SHA-256)
    key_prefix VARCHAR(10) NOT NULL,-- Public prefix for ID (e.g. "sk-abc...")
    label VARCHAR(100),             -- User-friendly name (e.g. "Zapier Integration")
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,         -- Optional expiration
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_engine_access_keys_engine_id ON engine_access_keys(engine_id);
CREATE INDEX idx_engine_access_keys_key_hash ON engine_access_keys(key_hash);

COMMENT ON TABLE engine_access_keys IS 'Access keys for external systems to trigger this workflow engine';
