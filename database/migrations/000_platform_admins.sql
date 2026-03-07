-- ============================================================
-- PLATFORM ADMINS TABLE (MISSING BASE TABLE)
-- ============================================================

-- This table should have been created in initial migration
-- All other migrations reference it but it was never created

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);

-- Insert default superadmin
-- Email: anweshrath@gmail.com
-- Password: 3edcCDE#
-- Hash generated with bcrypt(12 rounds)
INSERT INTO platform_admins (email, password_hash, full_name, is_active)
VALUES (
  'anweshrath@gmail.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/AwWXEzyKiU7xVGK7W',
  'Anwesh Rath',
  true
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

-- Enable RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Platform admins can read their own data"
  ON platform_admins
  FOR SELECT
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Platform admins can update their own data"
  ON platform_admins
  FOR UPDATE
  USING (email = auth.jwt() ->> 'email');
