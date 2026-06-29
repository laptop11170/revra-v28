-- 009_sequences_schema.sql
-- SMS drip sequences and AI re-engagement support

-- Sequences (drip campaigns)
CREATE TABLE IF NOT EXISTS sequences (
  id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name  TEXT NOT NULL,
  description  TEXT,
  status  TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  trigger_type  TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual','pipeline_stage','tag_added','lead_created')),
  trigger_config  JSONB DEFAULT '{}',
  sender_phone_id UUID REFERENCES sendillo_phone_numbers(id),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequences_workspace_id ON sequences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(status);

-- Steps within a sequence (ordered)
CREATE TABLE IF NOT EXISTS sequence_steps (
  id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id  UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_number  INTEGER NOT NULL,
  name  TEXT NOT NULL,
  channel  TEXT DEFAULT 'sms' CHECK (channel IN ('sms','email')),
  body  TEXT NOT NULL,
  delay_days  INTEGER NOT NULL DEFAULT 1,
  delay_hours  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);

-- Enrollments (which leads are in which sequence)
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id  UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  lead_id  UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_step  INTEGER NOT NULL DEFAULT 0,
  status  TEXT DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
  next_send_at  TIMESTAMPTZ,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  last_sent_at  TIMESTAMPTZ,
  messages_sent  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence_id ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_lead_id ON sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_send ON sequence_enrollments(next_send_at) WHERE status = 'active';

-- Sequence message log (what was sent when)
CREATE TABLE IF NOT EXISTS sequence_messages (
  id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id  UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  step_id  UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  message_id  UUID REFERENCES messages(id) ON DELETE SET NULL,
  sent_at  TIMESTAMPTZ DEFAULT NOW(),
  status  TEXT DEFAULT 'sent' CHECK (status IN ('sent','delivered','failed','bounced'))
);

CREATE INDEX IF NOT EXISTS idx_sequence_messages_enrollment_id ON sequence_messages(enrollment_id);
