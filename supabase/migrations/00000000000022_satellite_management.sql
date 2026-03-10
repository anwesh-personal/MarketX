BEGIN;

CREATE TABLE IF NOT EXISTS sending_domains (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id          UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  domain              TEXT NOT NULL,
  tld                 TEXT NOT NULL,
  provider            TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'mailgun', 'ses')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  dkim_status         TEXT NOT NULL DEFAULT 'pending' CHECK (dkim_status IN ('pending', 'verified', 'failed')),
  spf_status          TEXT NOT NULL DEFAULT 'pending' CHECK (spf_status IN ('pending', 'verified', 'failed')),
  dmarc_status        TEXT NOT NULL DEFAULT 'pending' CHECK (dmarc_status IN ('pending', 'verified', 'failed')),
  warmup_status       TEXT NOT NULL DEFAULT 'not_started' CHECK (warmup_status IN ('not_started', 'warming', 'ready', 'paused')),
  warmup_started_at   TIMESTAMPTZ,
  warmup_completed_at TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partner_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_sending_domains_partner ON sending_domains(partner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sending_domains_warmup ON sending_domains(warmup_status, verification_status);

CREATE TABLE IF NOT EXISTS sending_satellites (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id            UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  domain_id             UUID NOT NULL REFERENCES sending_domains(id) ON DELETE CASCADE,
  mailbox_local_part    TEXT NOT NULL,
  mailbox_email         TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'warming', 'active', 'paused', 'disabled')),
  reputation_score      NUMERIC(6,5) NOT NULL DEFAULT 0.5 CHECK (reputation_score BETWEEN 0 AND 1),
  daily_send_cap        INT NOT NULL DEFAULT 3000 CHECK (daily_send_cap > 0),
  current_daily_sent    INT NOT NULL DEFAULT 0 CHECK (current_daily_sent >= 0),
  warmup_day            INT NOT NULL DEFAULT 0 CHECK (warmup_day >= 0),
  warmup_target_days    INT NOT NULL DEFAULT 14 CHECK (warmup_target_days >= 1),
  last_send_at          TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partner_id, mailbox_email)
);

CREATE INDEX IF NOT EXISTS idx_sending_satellites_partner_status ON sending_satellites(partner_id, status, is_active);
CREATE INDEX IF NOT EXISTS idx_sending_satellites_domain ON sending_satellites(domain_id);

DROP TRIGGER IF EXISTS trigger_update_sending_domains_timestamp ON sending_domains;
CREATE TRIGGER trigger_update_sending_domains_timestamp
BEFORE UPDATE ON sending_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_sending_satellites_timestamp ON sending_satellites;
CREATE TRIGGER trigger_update_sending_satellites_timestamp
BEFORE UPDATE ON sending_satellites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

COMMIT;
