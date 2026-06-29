-- ============================================================
-- RevRa CRM — Full Schema Migration (v2)
-- Run this in Supabase SQL Editor
-- ============================================================

BEGIN;

-- ── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMS ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE workspace_plan AS ENUM ('starter', 'professional', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'agent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_channel AS ENUM ('sms', 'imessage', 'whatsapp', 'rcs', 'email');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE call_status AS ENUM ('initiated', 'ringing', 'in_progress', 'completed', 'busy', 'no_answer', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('call', 'email', 'sms', 'follow_up', 'schedule', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_mode AS ENUM ('agent', 'chat');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_role AS ENUM ('user', 'assistant', 'system', 'tool');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE calendar_event_status AS ENUM ('confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_provider AS ENUM ('twilio', 'loopmessages', 'sendgrid', 'google');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('active', 'error', 'disconnected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_type AS ENUM ('medicare', 'aca', 'final_expense', 'life', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_disposition AS ENUM ('interested', 'not_interested', 'callback', 'not_reachable');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── WORKSPACES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  plan                 workspace_plan DEFAULT 'starter',
  twilio_account_sid   TEXT,
  loopmessages_api_key TEXT,
  sendgrid_api_key     TEXT,
  google_calendar_creds JSONB,
  settings             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id  TEXT UNIQUE NOT NULL,
  workspace_id   UUID REFERENCES workspaces(id),
  email          TEXT NOT NULL,
  full_name      TEXT,
  role           user_role NOT NULL DEFAULT 'agent',
  avatar_url     TEXT,
  last_active_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_workspace_id  ON users(workspace_id);

-- ── LEADS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES users(id),
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT NOT NULL,
  phone_formatted   TEXT,
  lead_type         lead_type,
  score             INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_breakdown   JSONB,
  pipeline_stage    TEXT DEFAULT 'new_lead',
  previous_stages   TEXT[] DEFAULT '{}',
  last_contacted_at TIMESTAMPTZ,
  last_call_at      TIMESTAMPTZ,
  last_message_at   TIMESTAMPTZ,
  source            TEXT,
  notes             TEXT,
  tags              TEXT[] DEFAULT '{}',
  enrichment_data   JSONB,
  calendar_event_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_id   ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent  ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage   ON leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_score            ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_phone             ON leads(phone);

-- ── PIPELINE STAGES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  position     INTEGER NOT NULL,
  color        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS default_pipeline_stages (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name     TEXT NOT NULL,
  slug     TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  color    TEXT
);

INSERT INTO default_pipeline_stages (name, slug, position, color) VALUES
  ('New Lead',   'new_lead',   0, '#a078ff'),
  ('Contacted',  'contacted',  1, '#00cbe6'),
  ('Qualified',  'qualified',  2, '#16a34a'),
  ('Quote Sent', 'quote_sent', 3, '#d97706'),
  ('Won',       'won',        4, '#22c55e'),
  ('Lost',      'lost',       5, '#dc2626')
ON CONFLICT DO NOTHING;

-- ── PIPELINE MOVES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_moves (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id  UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage   TEXT NOT NULL,
  moved_by   UUID REFERENCES users(id),
  moved_at   TIMESTAMPTZ DEFAULT NOW(),
  note       TEXT
);

CREATE INDEX IF NOT EXISTS idx_pipeline_moves_lead_id ON pipeline_moves(lead_id);

-- ── CALLS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calls (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id              UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id             UUID NOT NULL REFERENCES users(id),
  twilio_call_sid      TEXT UNIQUE,
  twilio_recording_sid TEXT,
  direction            call_direction,
  status               call_status DEFAULT 'initiated',
  started_at           TIMESTAMPTZ,
  ended_at             TIMESTAMPTZ,
  duration_seconds     INTEGER,
  transcription        TEXT,
  ai_summary           TEXT,
  ai_disposition       ai_disposition,
  ai_next_steps        TEXT,
  recording_url        TEXT,
  recording_duration   INTEGER,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_workspace_id  ON calls(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead_id       ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id      ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_sid    ON calls(twilio_call_sid);

-- ── MESSAGES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id        UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id       UUID REFERENCES users(id),
  channel        message_channel NOT NULL,
  direction      message_direction NOT NULL,
  body           TEXT NOT NULL,
  media_url      TEXT,
  external_id    TEXT,
  external_status TEXT,
  ai_generated   BOOLEAN DEFAULT FALSE,
  ai_context     JSONB,
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_workspace_id  ON messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id       ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id      ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel        ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_direction      ON messages(direction);

-- ── AI CONVERSATIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id     UUID NOT NULL REFERENCES users(id),
  lead_id      UUID REFERENCES leads(id),
  mode         ai_mode DEFAULT 'agent',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_workspace_id ON ai_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_agent_id     ON ai_conversations(agent_id);

-- ── AI MESSAGES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role           ai_role NOT NULL,
  content        TEXT,
  tool_calls     JSONB,
  tool_results   JSONB,
  tokens_used    INTEGER,
  latency_ms     INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);

-- ── TASKS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id          UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_agent_id UUID NOT NULL REFERENCES users(id),
  created_by       UUID REFERENCES users(id),
  type             task_type NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  due_date         TIMESTAMPTZ,
  priority         task_priority DEFAULT 'medium',
  status           task_status DEFAULT 'pending',
  source           TEXT DEFAULT 'manual',
  recurring        JSONB,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id         ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id              ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent       ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status               ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date             ON tasks(due_date);

-- ── CALENDAR EVENTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id          UUID REFERENCES leads(id) ON DELETE SET NULL,
  agent_id         UUID NOT NULL REFERENCES users(id),
  google_event_id  TEXT,
  title            TEXT NOT NULL,
  description      TEXT,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  location         TEXT,
  attendees        JSONB,
  google_meet_link  TEXT,
  status           calendar_event_status DEFAULT 'confirmed',
  reminder_sent    BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id     ON calendar_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_agent_id    ON calendar_events(agent_id);

-- ── INTEGRATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider     integration_provider NOT NULL,
  credentials  JSONB NOT NULL,
  settings     JSONB DEFAULT '{}',
  status       integration_status DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_workspace_id ON integrations(workspace_id);

-- ── WEBHOOKS LOG ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  payload     JSONB,
  processed   BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_log_workspace_id ON webhooks_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_processed   ON webhooks_log(processed);

-- ── AI PROVIDERS (superadmin managed) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_providers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  description  TEXT,
  config_json  JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN DEFAULT TRUE,
  stats        JSONB DEFAULT '{"total_calls": 0, "avg_cost": 0, "success_rate": 0}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON ai_providers(provider_type);

-- ── MESSAGE PROVIDERS (superadmin managed) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  provider_type   TEXT NOT NULL,
  description     TEXT,
  config_json     JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'active',
  usage_stats_json JSONB DEFAULT '{"total_messages": 0, "delivered": 0, "failed": 0}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);

-- ── RLS: Enable on all tables ────────────────────────────────────────────────
ALTER TABLE workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_moves   ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_providers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers        ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ─────────────────────────────────────────────────────────────
-- Note: auth.uid() returns UUID; clerk_user_id is TEXT.
-- Comparison: auth.uid()::text = clerk_user_id

DROP POLICY IF EXISTS "Superadmins manage all workspaces" ON workspaces;
CREATE POLICY "Superadmins manage all workspaces"
  ON workspaces FOR ALL
  USING (auth.jwt() ->> 'public_metadata' IS NOT NULL);

DROP POLICY IF EXISTS "Users view workspace members" ON users;
CREATE POLICY "Users view workspace members" ON users FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
    OR (auth.jwt() ->> 'public_metadata' = 'superadmin')
  );

DROP POLICY IF EXISTS "Admins manage workspace members" ON users;
CREATE POLICY "Admins manage workspace members" ON users FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Agents access assigned leads" ON leads;
CREATE POLICY "Agents access assigned leads" ON leads FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
    AND (
      assigned_agent_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1)
      OR (SELECT role FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1) IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Agents update leads" ON leads;
CREATE POLICY "Agents update leads" ON leads FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admins create leads" ON leads;
CREATE POLICY "Admins create leads" ON leads FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins delete leads" ON leads;
CREATE POLICY "Admins delete leads" ON leads FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Workspace stages visible to all members" ON pipeline_stages;
CREATE POLICY "Workspace stages visible to all members" ON pipeline_stages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admins manage stages" ON pipeline_stages;
CREATE POLICY "Admins manage stages" ON pipeline_stages FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Pipeline moves visible to workspace" ON pipeline_moves;
CREATE POLICY "Pipeline moves visible to workspace" ON pipeline_moves FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Agents create pipeline moves" ON pipeline_moves;
CREATE POLICY "Agents create pipeline moves" ON pipeline_moves FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Agents access workspace calls" ON calls;
CREATE POLICY "Agents access workspace calls" ON calls FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Agents create calls" ON calls;
CREATE POLICY "Agents create calls" ON calls FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Agents update calls" ON calls;
CREATE POLICY "Agents update calls" ON calls FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Agents access workspace messages" ON messages;
CREATE POLICY "Agents access workspace messages" ON messages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Agents create messages" ON messages;
CREATE POLICY "Agents create messages" ON messages FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Agents access own conversations" ON ai_conversations;
CREATE POLICY "Agents access own conversations" ON ai_conversations FOR SELECT
  USING (
    agent_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1)
    OR (SELECT role FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1) = 'superadmin'
  );

DROP POLICY IF EXISTS "Agents create conversations" ON ai_conversations;
CREATE POLICY "Agents create conversations" ON ai_conversations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Conversation messages visible to owner" ON ai_messages;
CREATE POLICY "Conversation messages visible to owner" ON ai_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations
      WHERE agent_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM users
        WHERE clerk_user_id = auth.uid()::text
        AND role = 'superadmin'
      )
    )
  );

DROP POLICY IF EXISTS "Agents add messages" ON ai_messages;
CREATE POLICY "Agents add messages" ON ai_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Agents access own tasks" ON tasks;
CREATE POLICY "Agents access own tasks" ON tasks FOR SELECT
  USING (
    assigned_agent_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1)
    OR workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Agents create tasks" ON tasks;
CREATE POLICY "Agents create tasks" ON tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Agents update tasks" ON tasks;
CREATE POLICY "Agents update tasks" ON tasks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Agents access own events" ON calendar_events;
CREATE POLICY "Agents access own events" ON calendar_events FOR SELECT
  USING (
    agent_id = (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1)
    OR workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Agents manage events" ON calendar_events;
CREATE POLICY "Agents manage events" ON calendar_events FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admins manage integrations" ON integrations;
CREATE POLICY "Admins manage integrations" ON integrations FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Admins view webhooks log" ON webhooks_log;
CREATE POLICY "Admins view webhooks log" ON webhooks_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "System inserts webhooks log" ON webhooks_log;
CREATE POLICY "System inserts webhooks log" ON webhooks_log FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Superadmins see ai providers" ON ai_providers;
CREATE POLICY "Superadmins see ai providers" ON ai_providers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmins manage ai providers" ON ai_providers;
CREATE POLICY "Superadmins manage ai providers" ON ai_providers FOR ALL USING (true);

DROP POLICY IF EXISTS "Superadmins see providers" ON providers;
CREATE POLICY "Superadmins see providers" ON providers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Superadmins manage providers" ON providers;
CREATE POLICY "Superadmins manage providers" ON providers FOR ALL USING (true);

-- ── HELPERS & TRIGGERS ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Lead stage history tracker
CREATE OR REPLACE FUNCTION track_pipeline_move()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO pipeline_moves (lead_id, from_stage, to_stage, moved_by)
    VALUES (
      NEW.id,
      OLD.pipeline_stage,
      NEW.pipeline_stage,
      (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS leads_pipeline_move ON leads;
CREATE TRIGGER leads_pipeline_move
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
  EXECUTE FUNCTION track_pipeline_move();

-- ── SEED DATA ────────────────────────────────────────────────────────────────
-- Demo workspace
INSERT INTO workspaces (id, name, slug, plan, twilio_account_sid, loopmessages_api_key, settings)
VALUES ('00000000-0000-0000-0000-000000000001', 'RevRa Demo Agency', 'revra-demo', 'professional', NULL, NULL, '{}')
ON CONFLICT (slug) DO NOTHING;

-- Demo users (use real Clerk user IDs in production)
INSERT INTO users (id, clerk_user_id, workspace_id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000011', 'demo-admin',    '00000000-0000-0000-0000-000000000001', 'admin@revra.demo',  'Sarah Mitchell',  'admin'),
  ('00000000-0000-0000-0000-000000000012', 'demo-agent-1',  '00000000-0000-0000-0000-000000000001', 'agent1@revra.demo', 'Marcus Johnson',  'agent'),
  ('00000000-0000-0000-0000-000000000013', 'demo-agent-2',  '00000000-0000-0000-0000-000000000001', 'agent2@revra.demo', 'Emily Chen',      'agent')
ON CONFLICT (clerk_user_id) DO NOTHING;

-- Demo leads
INSERT INTO leads (workspace_id, assigned_agent_id, first_name, last_name, email, phone, lead_type, score, pipeline_stage, source, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Robert', 'Williams', 'rwilliams@email.com', '+15551234001', 'medicare', 85, 'qualified', 'google_ads', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Patricia', 'Anderson', 'panderson@email.com', '+15551234002', 'medicare', 72, 'contacted', 'facebook', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Michael', 'Garcia', 'mgarcia@email.com', '+15551234003', 'aca', 90, 'qualified', 'referral', NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Linda', 'Martinez', 'lmartinez@email.com', '+15551234004', 'final_expense', 45, 'new_lead', 'cold_call', NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'James', 'Brown', 'jbrown@email.com', '+15551234005', 'life', 68, 'quote_sent', 'website', NOW() - INTERVAL '7 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'Jennifer', 'Davis', 'jdavis@email.com', '+15551234006', 'medicare', 92, 'qualified', 'google_ads', NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'William', 'Wilson', 'wwilson@email.com', '+15551234007', 'aca', 55, 'contacted', 'facebook', NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Elizabeth', 'Taylor', 'etaylor@email.com', '+15551234008', 'medicare', 78, 'qualified', 'referral', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'David', 'Thomas', 'dthomas@email.com', '+15551234009', 'final_expense', 38, 'new_lead', 'cold_call', NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'Barbara', 'Jackson', 'bjackson@email.com', '+15551234010', 'life', 82, 'quote_sent', 'website', NOW() - INTERVAL '8 days')
ON CONFLICT DO NOTHING;

-- Pipeline stages for demo workspace
INSERT INTO pipeline_stages (workspace_id, name, slug, position, color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'New Lead',   'new_lead',   0, '#a078ff'),
  ('00000000-0000-0000-0000-000000000001', 'Contacted',  'contacted',  1, '#00cbe6'),
  ('00000000-0000-0000-0000-000000000001', 'Qualified',  'qualified',  2, '#16a34a'),
  ('00000000-0000-0000-0000-000000000001', 'Quote Sent', 'quote_sent', 3, '#d97706'),
  ('00000000-0000-0000-0000-000000000001', 'Won',        'won',        4, '#22c55e'),
  ('00000000-0000-0000-0000-000000000001', 'Lost',       'lost',       5, '#dc2626')
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- AI Providers seed
INSERT INTO ai_providers (id, name, provider_type, description, config_json, is_active, stats) VALUES
  ('00000000-0000-0000-0000-000000000101', 'OpenAI',     'ai', 'GPT-4 and GPT-4 Turbo models', '{"model": "gpt-4-turbo"}', true, '{"total_calls": 45200, "avg_cost": 0.12, "success_rate": 99.8}'),
  ('00000000-0000-0000-0000-000000000102', 'Anthropic',  'ai', 'Claude 3 Opus and Sonnet models', '{"model": "claude-3-opus"}', true, '{"total_calls": 32100, "avg_cost": 0.15, "success_rate": 99.9}'),
  ('00000000-0000-0000-0000-000000000103', 'Twilio',     'sms', 'SMS and Voice via Twilio', '{"account_sid": ""}', true, '{"total_calls": 15420, "avg_cost": 0.0075, "success_rate": 99.2}'),
  ('00000000-0000-0000-0000-000000000104', 'LoopMessages', 'messaging', 'iMessage, WhatsApp, RCS via LoopMessages', '{"api_key": ""}', true, '{"total_calls": 8930, "avg_cost": 0.005, "success_rate": 98.7}')
ON CONFLICT DO NOTHING;

-- Message Providers seed
INSERT INTO providers (id, name, provider_type, description, config_json, is_active, status, usage_stats_json) VALUES
  ('00000000-0000-0000-0000-000000000201', 'Twilio SMS',    'sms',      'SMS via Twilio', '{"account_sid": ""}', true, 'active', '{"total_messages": 154200, "delivered": 151500, "failed": 2700}'),
  ('00000000-0000-0000-0000-000000000202', 'LoopMessages',  'messaging', 'iMessage, WhatsApp, RCS via LoopMessages', '{"api_key": ""}', true, 'active', '{"total_messages": 89300, "delivered": 88200, "failed": 1100}'),
  ('00000000-0000-0000-0000-000000000203', 'iMessage',      'imessage', 'iMessage via Apple Business Chat', '{"apple_id": ""}', true, 'active', '{"total_messages": 45600, "delivered": 44800, "failed": 800}'),
  ('00000000-0000-0000-0000-000000000204', 'WhatsApp',      'whatsapp', 'WhatsApp Business API', '{"phone_number_id": ""}', true, 'active', '{"total_messages": 32100, "delivered": 31500, "failed": 600}')
ON CONFLICT DO NOTHING;

COMMIT;