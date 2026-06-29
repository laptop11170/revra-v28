-- ============================================================
-- Migration 013: Call transcription support
-- Adds Twilio transcription tracking columns to the calls table
-- so we can persist the SID Twilio returns when a recording's
-- transcription finishes, plus a transcription URL and timestamps.
-- ============================================================

ALTER TABLE calls
 ADD COLUMN IF NOT EXISTS twilio_transcription_sid TEXT,
 ADD COLUMN IF NOT EXISTS transcription_url TEXT,
 ADD COLUMN IF NOT EXISTS transcription_status TEXT,
 ADD COLUMN IF NOT EXISTS transcription_text TEXT,
 ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;

-- The existing `transcription` column (TEXT) was already in the schema
-- from migration.sql — we keep it for backwards compatibility, but the
-- new dedicated columns give us structured access to the URL and SID.

CREATE INDEX IF NOT EXISTS idx_calls_transcription_sid
 ON calls(twilio_transcription_sid);
