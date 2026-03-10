BEGIN;

CREATE TABLE IF NOT EXISTS global_contact_suppression (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE,
  domain          TEXT,
  reason_code     TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'compliance', 'bounce', 'complaint', 'unsubscribe')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_contact_suppression_email ON global_contact_suppression(email);
CREATE INDEX IF NOT EXISTS idx_global_contact_suppression_domain ON global_contact_suppression(domain);

CREATE TABLE IF NOT EXISTS partner_contact_suppression (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id      UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  email           TEXT,
  domain          TEXT,
  reason_code     TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'partner_request', 'bounce', 'complaint', 'unsubscribe')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (email IS NOT NULL OR domain IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_partner_contact_suppression_partner_email ON partner_contact_suppression(partner_id, email);
CREATE INDEX IF NOT EXISTS idx_partner_contact_suppression_partner_domain ON partner_contact_suppression(partner_id, domain);

CREATE TABLE IF NOT EXISTS identity_pool (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id          UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  icp_id              UUID NOT NULL REFERENCES icp(id) ON DELETE CASCADE,
  source              TEXT NOT NULL DEFAULT 'manual_import' CHECK (source IN ('manual_import', 'imt', 'enrichment', 'api')),
  external_person_id  TEXT,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  domain              TEXT NOT NULL,
  company_name        TEXT,
  title               TEXT,
  seniority_level     TEXT,
  buying_role         TEXT,
  country             TEXT,
  industry            TEXT,
  annual_revenue      NUMERIC(18,2),
  employee_count      INT,
  technologies        TEXT[] NOT NULL DEFAULT '{}',
  verification_status TEXT NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('verified', 'risky', 'invalid', 'unknown')),
  identity_confidence NUMERIC(6,5) NOT NULL DEFAULT 0.5 CHECK (identity_confidence BETWEEN 0 AND 1),
  in_market_signals   TEXT[] NOT NULL DEFAULT '{}',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_suppressed       BOOLEAN NOT NULL DEFAULT FALSE,
  suppression_reason  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partner_id, icp_id, email)
);

CREATE INDEX IF NOT EXISTS idx_identity_pool_partner_icp_active ON identity_pool(partner_id, icp_id, is_active);
CREATE INDEX IF NOT EXISTS idx_identity_pool_partner_email ON identity_pool(partner_id, email);
CREATE INDEX IF NOT EXISTS idx_identity_pool_confidence ON identity_pool(identity_confidence DESC);

CREATE TABLE IF NOT EXISTS contact_decisions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id            UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  icp_id                UUID NOT NULL REFERENCES icp(id) ON DELETE CASCADE,
  identity_id           UUID NOT NULL REFERENCES identity_pool(id) ON DELETE CASCADE,
  decision              TEXT NOT NULL CHECK (decision IN ('CONTACT_NOW', 'DELAY', 'SUPPRESS')),
  confidence_score      NUMERIC(6,5) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  reason_codes          TEXT[] NOT NULL DEFAULT '{}',
  rationale             TEXT NOT NULL,
  recommended_delay_days INT,
  decided_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta                  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_contact_decisions_partner_icp_time ON contact_decisions(partner_id, icp_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_decisions_identity_time ON contact_decisions(identity_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_decisions_decision ON contact_decisions(decision, decided_at DESC);

DROP TRIGGER IF EXISTS trigger_update_global_contact_suppression_timestamp ON global_contact_suppression;
CREATE TRIGGER trigger_update_global_contact_suppression_timestamp
BEFORE UPDATE ON global_contact_suppression
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_partner_contact_suppression_timestamp ON partner_contact_suppression;
CREATE TRIGGER trigger_update_partner_contact_suppression_timestamp
BEFORE UPDATE ON partner_contact_suppression
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_identity_pool_timestamp ON identity_pool;
CREATE TRIGGER trigger_update_identity_pool_timestamp
BEFORE UPDATE ON identity_pool
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

COMMIT;
