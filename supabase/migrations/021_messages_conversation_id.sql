-- ============================================================
-- Phase 21 — Link every messages row to its conversation thread
--
-- The conversations table has existed since before this migration
-- folder, but `messages.conversation_id` was never added to the
-- deployed database. This migration adds it (matching what
-- 007_conversations_schema.sql was trying to do) and backfills
-- existing rows so they group correctly in /user/conversations.
--
-- Non-destructive: the column is nullable with ON DELETE SET NULL,
-- so deleting a conversation row won't cascade-delete messages.
-- ============================================================

BEGIN;

-- ── 1. Add the column if it doesn't exist yet. ─────────────────────
ALTER TABLE messages
 ADD COLUMN IF NOT EXISTS conversation_id UUID
 REFERENCES conversations(id) ON DELETE SET NULL;

-- ── 2. Partial index — most rows will be non-null going forward,
-- but a partial index keeps the read path cheap and avoids bloating
-- the index with historical rows that never get linked.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
 ON messages(conversation_id)
 WHERE conversation_id IS NOT NULL;

-- ── 3. Backfill: link every existing message to its matching
-- conversation row. The match is (workspace_id, lead_id, channel)
-- which is exactly the natural key on conversations for SMS threads.
-- Idempotent: WHERE conversation_id IS NULL ensures re-runs are
-- no-ops once everything is linked.
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.lead_id IS NOT NULL
 AND m.workspace_id = c.workspace_id
 AND c.lead_id = m.lead_id
 AND c.channel = m.channel
 AND m.conversation_id IS NULL;

-- ── 4. Reload PostgREST schema cache so the new column is visible
-- to the API immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;