-- 018 — Sendillo delivery status detail
-- Adds columns to messages so the UI can show *why* a Sendillo send failed
-- (or what the current carrier-side status is).

ALTER TABLE messages
 ADD COLUMN IF NOT EXISTS external_error TEXT,
 ADD COLUMN IF NOT EXISTS external_status_detail TEXT,
 ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

-- Index for the messages log lookup that joins external_id + tail of phone
CREATE INDEX IF NOT EXISTS idx_messages_external_id
 ON messages (external_id)
 WHERE external_id IS NOT NULL;