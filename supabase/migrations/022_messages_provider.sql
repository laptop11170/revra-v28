-- ============================================================
-- Phase 22 — messages.provider (Sendillo vs Twilio tag)
-- Distinguishes which provider carried an SMS message. The
-- /user/conversations chat uses this to label each bubble.
-- Idempotent and non-destructive: existing rows default to NULL
-- and are backfilled to 'twilio' if they look like Twilio.
-- ============================================================

BEGIN;

ALTER TABLE messages
 ADD COLUMN IF NOT EXISTS provider TEXT;

-- Backfill: anything that was a Twilio SID gets 'twilio'.
-- Anything else stays NULL, and new Sendillo writes will set 'sendillo'.
UPDATE messages
 SET provider = 'twilio'
 WHERE provider IS NULL
 AND channel = 'sms'
 AND external_id LIKE 'SM%';

-- Reload PostgREST schema cache so the new column is queryable.
NOTIFY pgrst, 'reload schema';

COMMIT;
