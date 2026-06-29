-- Phase 4 Sendillo Integration — Database Changes
-- Run 004_sendillo_schema_enum.sql FIRST before running this file.
-- (004_sendillo_schema_enum.sql adds 'sendillo' to the integration_provider enum)

-- ── sendillo_phone_numbers: purchased numbers assigned to agents ─────────────
CREATE TABLE IF NOT EXISTS sendillo_phone_numbers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES users(id),
  phone_number  TEXT NOT NULL,
  label         TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_sendillo_phone_numbers_agent ON sendillo_phone_numbers(agent_id);

-- ── leads: opt-out tracking ───────────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opted_out    BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

-- ── campaigns: expand for Sendillo SMS analytics + keyword config ────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sender_phone_id    UUID REFERENCES sendillo_phone_numbers(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS message_body     TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS positive_keywords TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS optout_keywords  TEXT[] DEFAULT '{"STOP","UNSUBSCRIBE","CANCEL"}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed            INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS opted_out         INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS emma_synced       INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES users(id);

-- ── messages: campaign attribution ──────────────────────────────────────────
ALTER TABLE messages ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

-- ── RLS: enable on sendillo_phone_numbers ───────────────────────────────────
ALTER TABLE sendillo_phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins manage sendillo phone numbers" ON sendillo_phone_numbers;
CREATE POLICY "Superadmins manage sendillo phone numbers" ON sendillo_phone_numbers FOR ALL USING (true);

DROP POLICY IF EXISTS "Agents view sendillo phone numbers" ON sendillo_phone_numbers;
CREATE POLICY "Agents view sendillo phone numbers" ON sendillo_phone_numbers FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
  ));

-- ── integrations: add Sendillo provider row ─────────────────────────────────
INSERT INTO integrations (id, workspace_id, name, category, provider, description, credentials, status, is_connected)
VALUES (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000001',
  'Sendillo', 'messaging', 'sendillo',
  'Bulk SMS campaigns via Sendillo', '{}', 'active', false
) ON CONFLICT DO NOTHING;

-- ── Campaign counter RPCs ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_campaign_sent(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE campaigns SET sent = sent + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_delivered(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE campaigns SET delivered = delivered + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_failed(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE campaigns SET failed = failed + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_replied(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE campaigns SET replied = replied + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_optout(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE campaigns SET opted_out = opted_out + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_campaign_emma_synced(campaign_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE campaigns SET emma_synced = emma_synced + 1 WHERE id = campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_conversation_unread(conv_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE conversations SET unread_count = unread_count + 1 WHERE id = conv_id;
END;
$$;
