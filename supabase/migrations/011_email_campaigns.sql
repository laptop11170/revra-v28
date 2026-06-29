-- ── Email campaigns schema additions ────────────────────────────────────────
-- Adds support for the new Email Campaigns channel (SendGrid by Twilio).
-- campaigns.channel already accepts 'email' from the original schema.

ALTER TABLE campaigns
 ADD COLUMN IF NOT EXISTS subject  TEXT,
 ADD COLUMN IF NOT EXISTS template_id TEXT,
 ADD COLUMN IF NOT EXISTS html_body TEXT,
 ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS last_sent_at  TIMESTAMPTZ;

-- Index for fast list-by-channel queries
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_channel
 ON campaigns(workspace_id, channel);

-- Extend the messages table with email-specific tracking columns
ALTER TABLE messages
 ADD COLUMN IF NOT EXISTS email_message_id TEXT,
 ADD COLUMN IF NOT EXISTS email_opened_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS email_clicked_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS email_bounced_at TIMESTAMPTZ;

-- Index for matching webhook events to messages
CREATE INDEX IF NOT EXISTS idx_messages_email_message_id
 ON messages(email_message_id)
 WHERE email_message_id IS NOT NULL;

-- Audit log of every SendGrid event
CREATE TABLE IF NOT EXISTS email_events (
 id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
 message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
 event_type TEXT NOT NULL,  -- 'delivered','open','click','bounce','spamreport','unsubscribe','dropped'
 email TEXT,
 payload JSONB DEFAULT '{}',
 created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_workspace
 ON email_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign
 ON email_events(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_message
 ON email_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type
 ON email_events(event_type);

-- RLS
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their workspace email_events" ON email_events;
CREATE POLICY "Users can view their workspace email_events" ON email_events
 FOR SELECT USING (
 workspace_id IN (
 SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
 )
 );

-- Service role bypasses RLS automatically (used by the webhook route).
