-- supabase/migrations/023_calls_retell_integration.sql
--
-- Adds Retell AI call integration columns to the calls table:
-- - retell_call_id : the call_id returned by the Retell API (used to
-- correlate our call record with Retell's call events)
-- - retell_status : last known status from Retell webhook ("queued",
-- "ringing", "in-progress", "completed", etc.)
--
-- Also adds a retell_call_id index for fast webhook lookups.
--
-- This migration is idempotent — all changes use IF NOT EXISTS / ADD IF NOT EXISTS
-- where supported, so re-running is safe.

BEGIN;

-- ── retell_call_id ────────────────────────────────────────────────────────────
-- Unique TEXT column storing Retell's call_id. We look up by this on every
-- webhook event, so it must be indexed. Nullable so existing rows are fine.
ALTER TABLE calls
 ADD COLUMN IF NOT EXISTS retell_call_id TEXT;

-- ── retell_status ────────────────────────────────────────────────────────────
-- Mirrors the Retell-side status so the UI can show it without hitting
-- the Retell API directly. Free-form text; nullable.
ALTER TABLE calls
 ADD COLUMN IF NOT EXISTS retell_status TEXT;

-- ── Index for fast webhook correlation ──────────────────────────────────────
-- Retell POSTs to /api/webhooks/retell on every event with the call_id.
-- Without this index every webhook would do a sequential scan of the calls table.
CREATE INDEX IF NOT EXISTS idx_calls_retell_call_id ON calls(retell_call_id);

COMMIT;
