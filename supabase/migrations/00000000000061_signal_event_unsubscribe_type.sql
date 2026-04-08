-- ============================================================
-- MIGRATION 061: Add 'unsubscribe' to signal_event event_type
-- ============================================================
-- The unified webhook handler now processes unsubscribe events
-- for CAN-SPAM/GDPR compliance. The original CHECK constraint
-- on signal_event.event_type only allowed:
--   send, reply, click, booking, show, revenue, bounce, complaint, open
--
-- This migration adds 'unsubscribe' and 'delivery' to the allowed values.
-- 'delivery' is included for future deliverability tracking.
-- ============================================================

BEGIN;

-- Drop old constraint and recreate with expanded values
ALTER TABLE signal_event
  DROP CONSTRAINT IF EXISTS signal_event_event_type_check;

ALTER TABLE signal_event
  ADD CONSTRAINT signal_event_event_type_check
  CHECK (event_type IN (
    'send',
    'delivery',
    'open',
    'click',
    'reply',
    'bounce',
    'complaint',
    'unsubscribe',
    'booking',
    'show',
    'revenue'
  ));

COMMIT;
                                                          