-- 008_calendar_sync_schema.sql
-- Add Google Calendar sync support to appointments table

-- Add sync fields to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local','synced','pending','error')),
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Index for quick Google event lookups
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id ON appointments(google_event_id);
CREATE INDEX IF NOT EXISTS idx_appointments_sync_status ON appointments(sync_status);

-- Update the existing appointments view to include sync status if needed
COMMENT ON COLUMN appointments.google_event_id IS 'Google Calendar event ID when synced';
COMMENT ON COLUMN appointments.sync_status IS 'local=not synced, synced=in both, pending=queued, error=failed';
