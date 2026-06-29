-- Phase 2: Conversations / Messaging — schema additions
-- Adds conversation_id to messages and missing RLS policies

-- 1. Add conversation_id to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- 2. Add status column to conversations for tracking (active, archived, closed)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed'));

-- 3. Add read_at to track when user last read a conversation
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Update webhook handler logic: inbound messages should link to conversation
-- (handled in app/api/webhooks/sendillo/route.ts)
