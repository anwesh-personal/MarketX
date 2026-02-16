-- ============================================================
-- IMT ICP (Ideal Customer Profile) Records
-- Ticket #70 - Stores ICP records from InMarket Traffic
-- Used by Brain for content generation
-- ============================================================

CREATE TABLE IF NOT EXISTS imt_icps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imt_icp_id UUID NOT NULL UNIQUE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    job_id UUID,
    campaign_name VARCHAR(255),
    segment_name VARCHAR(255),
    revenue_band_min INTEGER DEFAULT 0,
    revenue_band_max INTEGER DEFAULT 1000,
    primary_industries JSONB DEFAULT '[]',
    seniority_levels JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imt_icps_org ON imt_icps(org_id);
CREATE INDEX IF NOT EXISTS idx_imt_icps_client ON imt_icps(client_id);
CREATE INDEX IF NOT EXISTS idx_imt_icps_imt_id ON imt_icps(imt_icp_id);

COMMENT ON TABLE imt_icps IS 'Ideal Customer Profile records from InMarket Traffic for Brain content generation';
COMMENT ON COLUMN imt_icps.imt_icp_id IS 'IMT-issued ICP UUID - used for downstream IMT API calls';
COMMENT ON COLUMN imt_icps.client_id IS 'IMT client UUID - references organizations.client_id';

CREATE TRIGGER trigger_update_imt_icps_timestamp
BEFORE UPDATE ON imt_icps FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
