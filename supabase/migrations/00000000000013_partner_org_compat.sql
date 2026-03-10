-- ============================================================
-- AXIOM ENGINE - PARTNER/ORG COMPATIBILITY MAPPING
-- Phase A: A-02 (partner_id <-> organizations.id)
-- ============================================================

BEGIN;

-- Canonical mapping rule:
-- partner.id is always organizations.id (1:1 identity mapping).
-- This migration ensures existing and future organizations are mirrored into partner.

CREATE OR REPLACE FUNCTION public.map_org_status_to_partner_status(org_status TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE org_status
        WHEN 'active' THEN 'active'
        WHEN 'suspended' THEN 'suspended'
        WHEN 'cancelled' THEN 'archived'
        ELSE 'active'
    END;
END;
$$;

-- Backfill partner rows for all existing organizations (idempotent).
INSERT INTO partner (id, legal_name, status)
SELECT
    o.id,
    o.name,
    public.map_org_status_to_partner_status(o.status)
FROM organizations o
LEFT JOIN partner p ON p.id = o.id
WHERE p.id IS NULL;

-- Keep partner in sync for all future org inserts/updates.
CREATE OR REPLACE FUNCTION public.sync_partner_from_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO partner (id, legal_name, status)
    VALUES (
        NEW.id,
        NEW.name,
        public.map_org_status_to_partner_status(NEW.status)
    )
    ON CONFLICT (id) DO UPDATE
    SET
        legal_name = EXCLUDED.legal_name,
        status = EXCLUDED.status,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_partner_from_organization ON organizations;
CREATE TRIGGER trigger_sync_partner_from_organization
AFTER INSERT OR UPDATE OF name, status ON organizations
FOR EACH ROW
EXECUTE FUNCTION public.sync_partner_from_organization();

-- Explicit compatibility view used by services/migrations when both terms appear.
CREATE OR REPLACE VIEW public.partner_organization_map AS
SELECT
    o.id AS organization_id,
    p.id AS partner_id,
    o.name AS organization_name,
    p.legal_name AS partner_legal_name,
    o.status AS organization_status,
    p.status AS partner_status,
    (o.id = p.id) AS ids_match
FROM organizations o
LEFT JOIN partner p ON p.id = o.id;

COMMENT ON VIEW public.partner_organization_map IS
'Canonical compatibility map where partner_id is the same UUID as organizations.id';

COMMIT;
