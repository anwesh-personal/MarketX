BEGIN;

CREATE TABLE IF NOT EXISTS meeting (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id          UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  offer_id            UUID REFERENCES offer(id) ON DELETE SET NULL,
  icp_id              UUID REFERENCES icp(id) ON DELETE SET NULL,
  brief_id            UUID REFERENCES brief(id) ON DELETE SET NULL,
  belief_id           UUID REFERENCES belief(id) ON DELETE SET NULL,
  flow_id             UUID REFERENCES flow(id) ON DELETE SET NULL,
  flow_step_id        UUID REFERENCES flow_step(id) ON DELETE SET NULL,
  external_booking_id TEXT UNIQUE,
  source              TEXT NOT NULL DEFAULT 'crm' CHECK (source IN ('crm', 'calendar', 'manual')),
  status              TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'shown', 'cancelled', 'no_show')),
  booked_at           TIMESTAMPTZ NOT NULL,
  meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_partner_booked_at ON meeting(partner_id, booked_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_belief_id ON meeting(belief_id);
CREATE INDEX IF NOT EXISTS idx_meeting_status ON meeting(status);

DROP TRIGGER IF EXISTS trigger_update_meeting_timestamp ON meeting;
CREATE TRIGGER trigger_update_meeting_timestamp
BEFORE UPDATE ON meeting
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

COMMIT;
