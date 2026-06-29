-- supabase/migrations/025_call_outcome_logs.sql
-- Creates the call_outcome_logs table to store call outcome logs including transcription, summary, tag, lead details.

CREATE TABLE IF NOT EXISTS call_outcome_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    lead_name TEXT,
    lead_phone TEXT,
    call_outcome TEXT NOT NULL,
    summary_notes TEXT,
    call_transcription TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_call_outcome_logs_call ON call_outcome_logs(call_id);
