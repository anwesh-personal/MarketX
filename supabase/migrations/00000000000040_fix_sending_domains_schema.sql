-- ============================================================
-- MIGRATION 040: FIX SENDING DOMAINS SCHEMA
-- ============================================================
-- Critical fixes for go-live:
--   1. Expand provider CHECK to include 'mailwizz', 'sendgrid', etc.
--   2. Expand warmup_status CHECK to include 'active', 'completed'
--   3. Add missing columns: dns_records, warmup_day, warmup_target_days
--   4. Make tld nullable (domain route doesn't set it, only provision does)
--   5. Add DNS verification boolean columns for the deliverability dashboard
-- ============================================================

BEGIN;

-- ── 1. Fix provider CHECK constraint ────────────────────────
-- Base migration only allows ('manual', 'mailgun', 'ses')
-- Domain route and MailWizzAdapter use 'mailwizz'
ALTER TABLE sending_domains
  DROP CONSTRAINT IF EXISTS sending_domains_provider_check;

ALTER TABLE sending_domains
  ADD CONSTRAINT sending_domains_provider_check
  CHECK (provider IN ('manual', 'mailgun', 'ses', 'mailwizz', 'sendgrid', 'postmark', 'sparkpost', 'smtp', 'custom', 'other'));

-- ── 2. Fix warmup_status CHECK constraint ───────────────────
-- Base migration allows ('not_started', 'warming', 'ready', 'paused')
-- Domain route inserts 'active' and 'completed', which crash it
ALTER TABLE sending_domains
  DROP CONSTRAINT IF EXISTS sending_domains_warmup_status_check;

ALTER TABLE sending_domains
  ADD CONSTRAINT sending_domains_warmup_status_check
  CHECK (warmup_status IN ('not_started', 'warming', 'ready', 'active', 'paused', 'completed'));

-- ── 3. Add missing columns ──────────────────────────────────
-- dns_records: JSONB array of required DNS records (SPF, DKIM, DMARC, MX)
-- The domain route SELECTs and INSERTs this column
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS dns_records JSONB DEFAULT '[]'::jsonb;

-- warmup_day: current day in warmup schedule (exists on satellites but NOT domains)
-- Domain route SELECTs this from sending_domains
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS warmup_day INT DEFAULT 0 CHECK (warmup_day >= 0);

-- warmup_target_days: total warmup period (exists on satellites but NOT domains)
-- Domain route SELECTs this from sending_domains
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS warmup_target_days INT DEFAULT 21 CHECK (warmup_target_days > 0);

-- ── 4. Make tld nullable ────────────────────────────────────
-- Domain route (POST /api/domains) doesn't set tld. Only the provision route does.
-- Without this, the domain route INSERT crashes with NOT NULL violation.
ALTER TABLE sending_domains
  ALTER COLUMN tld DROP NOT NULL;

-- ── 5. Add DNS verification boolean columns ─────────────────
-- Used by the deliverability dashboard and domain verification checks
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS dkim_verified BOOLEAN DEFAULT false;
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS spf_verified BOOLEAN DEFAULT false;
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS dmarc_verified BOOLEAN DEFAULT false;
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS mx_verified BOOLEAN DEFAULT false;
ALTER TABLE sending_domains
  ADD COLUMN IF NOT EXISTS last_dns_check TIMESTAMPTZ DEFAULT NULL;

COMMIT;
