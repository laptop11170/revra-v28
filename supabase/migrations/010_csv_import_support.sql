-- 1. Add import traceability and normalization to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS import_row_number INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_normalized TEXT GENERATED ALWAYS AS (REGEXP_REPLACE(phone, '\D', '', 'g')) STORED;

-- 2. Indexes for upload/duplicate detection
CREATE INDEX IF NOT EXISTS idx_leads_email_workspace ON leads(workspace_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized_workspace ON leads(workspace_id, phone_normalized) 
  WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';
CREATE INDEX IF NOT EXISTS idx_leads_import_batch ON leads(import_batch_id);

-- 3. Campaign lead enrollment (critical missing table)
CREATE TABLE IF NOT EXISTS campaign_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','replied','opted_out')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead ON campaign_leads(lead_id);

-- 4. Import jobs tracking table
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','partial')),
  total_rows INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_import_jobs_workspace ON import_jobs(workspace_id);

-- 5. Trigger to validate pipeline_stage exists or fallback to 'new_lead'
CREATE OR REPLACE FUNCTION validate_pipeline_stage()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pipeline_stages 
    WHERE workspace_id = NEW.workspace_id AND slug = NEW.pipeline_stage
    UNION
    SELECT 1 FROM default_pipeline_stages WHERE slug = NEW.pipeline_stage
  ) THEN
    NEW.pipeline_stage := 'new_lead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_pipeline_stage ON leads;
CREATE TRIGGER trg_validate_pipeline_stage
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION validate_pipeline_stage();

-- 6. RLS Policies
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access import jobs" ON import_jobs;
CREATE POLICY "Users access import jobs" ON import_jobs FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users access campaign leads" ON campaign_leads;
CREATE POLICY "Users access campaign leads" ON campaign_leads FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE workspace_id IN (
        SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
      )
    )
  );
