-- ============================================================
-- MIGRATION 060: Complaint rate circuit breaker config
-- ============================================================
-- Seeds config keys for the complaint-rate circuit breaker.
-- Only runs if config_table exists (it was created in migration 012).
-- If config_table doesn't exist, the code uses hardcoded defaults.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'config_table' AND table_schema = 'public') THEN
    INSERT INTO public.config_table (key, value, description)
    VALUES
      ('complaint_rate_threshold', '{"value": 0.001}'::jsonb, 'Max complaint rate before circuit breaker trips (0.001 = 0.1%)'),
      ('complaint_rate_lookback_days', '{"value": 7}'::jsonb, 'Days of signal_event history for complaint rate'),
      ('complaint_rate_min_sends', '{"value": 100}'::jsonb, 'Min sends before complaint rate is evaluated')
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
