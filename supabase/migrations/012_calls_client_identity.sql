-- ============================================================
-- Migration 012: Add client_identity to calls
-- Stores the Twilio Voice Client identity (e.g. agent-{clerkUserId})
-- used by the browser Twilio.Device so the webhook can correlate
-- events back to a specific agent session.
-- ============================================================

ALTER TABLE calls ADD COLUMN IF NOT EXISTS client_identity TEXT;

CREATE INDEX IF NOT EXISTS idx_calls_client_identity ON calls(client_identity);
