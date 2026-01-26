-- ============================================================
-- AXIOM - Migration 009: VPS Server Management
-- Created: 2026-01-16
-- Description: Store VPS server configs in database (not .env)
-- ============================================================

-- VPS Servers Table
CREATE TABLE IF NOT EXISTS vps_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 22,
    username VARCHAR(255) NOT NULL,
    password TEXT, -- Encrypted in production
    ssh_key TEXT,  -- Alternative to password
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unreachable')),
    last_connected_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vps_servers_status_idx ON vps_servers(status);

COMMENT ON TABLE vps_servers IS 'VPS server configurations for worker deployment';
COMMENT ON COLUMN vps_servers.password IS 'Encrypted password (use encryption in production)';
COMMENT ON COLUMN vps_servers.ssh_key IS 'SSH private key as alternative to password';

-- Link existing workers to VPS servers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS vps_server_id UUID REFERENCES vps_servers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workers_vps_server_idx ON workers(vps_server_id) WHERE vps_server_id IS NOT NULL;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_vps_server_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vps_servers_updated_at ON vps_servers;
CREATE TRIGGER vps_servers_updated_at
    BEFORE UPDATE ON vps_servers
    FOR EACH ROW
    EXECUTE FUNCTION update_vps_server_timestamp();

-- Insert default VPS server (Lekhika's current server)
INSERT INTO vps_servers (
    name,
    description,
    host,
    port,
    username,
    password,
    status
) VALUES (
    'Lekhika Production Server',
    'Main production VPS running worker processes',
    '103.190.93.28',
    22,
    'lekhi7866',
    '3edcCDE#Amitesh123', -- In production, use encrypted storage
    'active'
) ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE vps_servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access to vps_servers" ON vps_servers;
CREATE POLICY "Superadmin full access to vps_servers"
    ON vps_servers FOR ALL
    USING (auth.jwt() ->> 'role' = 'superadmin');

COMMENT ON TABLE vps_servers IS 'VPS servers for worker deployment - managed via UI';
