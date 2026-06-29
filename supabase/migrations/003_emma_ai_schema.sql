-- Phase 3 AI Integration — Database Changes
-- Updated: removed Emma-specific columns, kept useful additions

-- conversations table: add unread count (used by frontend conversations page)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- index on conversations for fast unread queries
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON conversations(unread_count)
  WHERE unread_count > 0;
