-- 00000000000023_deliverability_monitoring.sql
-- Deliverability monitoring: per-satellite daily snapshots + reputation tracking

CREATE TABLE IF NOT EXISTS public.deliverability_snapshots (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      uuid NOT NULL REFERENCES public.partner(id),
    satellite_id    uuid NOT NULL REFERENCES public.sending_satellites(id),
    snapshot_date   date NOT NULL DEFAULT CURRENT_DATE,
    sends           int  NOT NULL DEFAULT 0,
    deliveries      int  NOT NULL DEFAULT 0,
    bounces         int  NOT NULL DEFAULT 0,
    complaints      int  NOT NULL DEFAULT 0,
    opens           int  NOT NULL DEFAULT 0,
    clicks          int  NOT NULL DEFAULT 0,
    bounce_rate     numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN sends > 0 THEN bounces::numeric / sends ELSE 0 END
    ) STORED,
    complaint_rate  numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN sends > 0 THEN complaints::numeric / sends ELSE 0 END
    ) STORED,
    open_rate       numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN deliveries > 0 THEN opens::numeric / deliveries ELSE 0 END
    ) STORED,
    click_rate      numeric(5,4) GENERATED ALWAYS AS (
        CASE WHEN opens > 0 THEN clicks::numeric / opens ELSE 0 END
    ) STORED,
    reputation_score numeric(5,2) NOT NULL DEFAULT 100.00,
    flags           jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (satellite_id, snapshot_date)
);

CREATE INDEX idx_ds_partner_date ON public.deliverability_snapshots(partner_id, snapshot_date DESC);
CREATE INDEX idx_ds_satellite_date ON public.deliverability_snapshots(satellite_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS public.deliverability_alerts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      uuid NOT NULL REFERENCES public.partner(id),
    satellite_id    uuid REFERENCES public.sending_satellites(id),
    domain_id       uuid REFERENCES public.sending_domains(id),
    alert_type      text NOT NULL CHECK (alert_type IN (
        'high_bounce_rate', 'high_complaint_rate', 'low_open_rate',
        'reputation_drop', 'blacklist_detected', 'warmup_stalled', 'daily_cap_exhausted'
    )),
    severity        text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    message         text NOT NULL,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    acknowledged    boolean NOT NULL DEFAULT false,
    acknowledged_by uuid REFERENCES auth.users(id),
    acknowledged_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_da_partner ON public.deliverability_alerts(partner_id, created_at DESC);
CREATE INDEX idx_da_unacked ON public.deliverability_alerts(partner_id, acknowledged) WHERE acknowledged = false;

CREATE TRIGGER deliverability_snapshots_updated_at
    BEFORE UPDATE ON public.deliverability_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
