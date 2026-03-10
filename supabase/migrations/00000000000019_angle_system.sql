-- Phase 1: MarketWriter Angle System
BEGIN;

CREATE TABLE IF NOT EXISTS offer_angles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  offer_id     UUID NOT NULL REFERENCES offer(id) ON DELETE CASCADE,
  angle_code   TEXT NOT NULL,
  angle_name   TEXT NOT NULL,
  core_concept TEXT NOT NULL,
  entry_point  TEXT NOT NULL,
  is_system    BOOLEAN NOT NULL DEFAULT true,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, angle_code)
);

CREATE INDEX IF NOT EXISTS idx_offer_angles_partner_offer ON offer_angles(partner_id, offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_angles_active ON offer_angles(is_active);

CREATE TABLE IF NOT EXISTS offer_angle_hooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  angle_id    UUID NOT NULL REFERENCES offer_angles(id) ON DELETE CASCADE,
  hook_text   TEXT NOT NULL,
  hook_order  INT NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (angle_id, hook_order)
);

CREATE INDEX IF NOT EXISTS idx_offer_angle_hooks_angle ON offer_angle_hooks(angle_id, is_active);

DROP TRIGGER IF EXISTS trigger_update_offer_angles_timestamp ON offer_angles;
CREATE TRIGGER trigger_update_offer_angles_timestamp
BEFORE UPDATE ON offer_angles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE offer_angles ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_angle_hooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offer_angles_select ON offer_angles;
CREATE POLICY offer_angles_select ON offer_angles FOR SELECT
USING (
  partner_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
);

DROP POLICY IF EXISTS offer_angles_write ON offer_angles;
CREATE POLICY offer_angles_write ON offer_angles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND users.org_id = offer_angles.partner_id
      AND role IN ('owner', 'admin')
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
);

DROP POLICY IF EXISTS offer_angle_hooks_select ON offer_angle_hooks;
CREATE POLICY offer_angle_hooks_select ON offer_angle_hooks FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM offer_angles oa
    WHERE oa.id = offer_angle_hooks.angle_id
      AND (
        oa.partner_id IN (SELECT org_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
      )
  )
);

DROP POLICY IF EXISTS offer_angle_hooks_write ON offer_angle_hooks;
CREATE POLICY offer_angle_hooks_write ON offer_angle_hooks FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM offer_angles oa
    JOIN users u ON u.id = auth.uid()
    WHERE oa.id = offer_angle_hooks.angle_id
      AND u.org_id = oa.partner_id
      AND u.role IN ('owner', 'admin')
  )
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
);

COMMIT;
