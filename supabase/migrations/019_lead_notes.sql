-- ============================================================
-- Phase 19 — Lead Notes (per-lead note timeline)
-- Each row is one note attached to a lead. Supports CRUD.
-- ============================================================

BEGIN;

-- ── ENUMS ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
 CREATE TYPE note_visibility AS ENUM ('private', 'team');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── TABLE ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_notes (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 author_id UUID REFERENCES users(id) ON DELETE SET NULL,
 body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 10000),
 visibility note_visibility NOT NULL DEFAULT 'team',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lead_notes_workspace_id ON lead_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_author_id ON lead_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(lead_id, created_at DESC);

-- ── UPDATED-AT TRIGGER ──────────────────────────────────────────────────────
-- Reuses the generic set_updated_at() function if it exists; otherwise we
-- inline the equivalent so this migration is self-contained.
DO $$ BEGIN
 CREATE OR REPLACE FUNCTION set_lead_notes_updated_at()
 RETURNS TRIGGER AS $fn$
 BEGIN
 NEW.updated_at = NOW();
 RETURN NEW;
 END;
 $fn$ LANGUAGE plpgsql;
EXCEPTION WHEN duplicate_function THEN null;
END $$;

DROP TRIGGER IF EXISTS trg_lead_notes_updated_at ON lead_notes;
CREATE TRIGGER trg_lead_notes_updated_at
 BEFORE UPDATE ON lead_notes
 FOR EACH ROW EXECUTE FUNCTION set_lead_notes_updated_at();

-- ── ROW-LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; the API uses the service-role key so no policies
-- are strictly required. We add read/write policies anyway so that if a future
-- feature switches to anon/authenticated keys, the workspace isolation is in
-- place.

DROP POLICY IF EXISTS "lead_notes_select_workspace" ON lead_notes;
CREATE POLICY "lead_notes_select_workspace" ON lead_notes
 FOR SELECT
 USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "lead_notes_insert_workspace" ON lead_notes;
CREATE POLICY "lead_notes_insert_workspace" ON lead_notes
 FOR INSERT
 WITH CHECK (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "lead_notes_update_workspace" ON lead_notes;
CREATE POLICY "lead_notes_update_workspace" ON lead_notes
 FOR UPDATE
 USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()))
 WITH CHECK (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "lead_notes_delete_workspace" ON lead_notes;
CREATE POLICY "lead_notes_delete_workspace" ON lead_notes
 FOR DELETE
 USING (workspace_id = (SELECT workspace_id FROM users WHERE id = auth.uid()));

COMMIT;

-- ── RELOAD POSTGREST SCHEMA CACHE ────────────────────────────────────────────
-- New tables / foreign keys aren't visible to the PostgREST API until its
-- in-memory schema cache is reloaded. Without this, queries that use the
-- `!fkname` join hint (e.g. `author:users!lead_notes_author_id(...)`) fail
-- with PGRST200 even though the FK constraint exists.
NOTIFY pgrst, 'reload schema';