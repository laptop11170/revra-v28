-- ============================================================
-- MARKETPLACE SCHEMA — Lead Marketplace (Phase 4)
-- ============================================================

-- 1. RevRa pool tiers (platform-level fixed prices)
CREATE TABLE IF NOT EXISTS marketplace_tiers (
  tier TEXT PRIMARY KEY CHECK (tier IN ('premium', 'normal', 'aged')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default prices: Premium=$50, Normal=$25, Aged=$15
INSERT INTO marketplace_tiers (tier, price_cents, description) VALUES
  ('premium', 5000, 'Premium leads — highest quality'),
  ('normal',  2500, 'Normal leads — standard quality'),
  ('aged',    1500, 'Aged leads — older data, lower price')
ON CONFLICT (tier) DO NOTHING;

-- 2. Workspace pool tiers (admin custom prices per workspace)
CREATE TABLE IF NOT EXISTS marketplace_workspace_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('premium', 'normal', 'aged')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, tier)
);

-- 3. RevRa marketplace leads (platform pool)
CREATE TABLE IF NOT EXISTS marketplace_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  superadmin_id UUID REFERENCES users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  lead_type TEXT,
  source TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('premium', 'normal', 'aged')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'removed')),
  notes TEXT,
  custom_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  sold_to UUID REFERENCES users(id),
  sold_price_cents INTEGER
);

-- 4. Workspace marketplace leads (admin pool)
CREATE TABLE IF NOT EXISTS marketplace_workspace_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  lead_type TEXT,
  source TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('premium', 'normal', 'aged')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'removed')),
  notes TEXT,
  custom_fields JSONB DEFAULT '[]',
  price_cents INTEGER NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  sold_to UUID REFERENCES users(id)
);

-- 5. Marketplace purchases log
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_source TEXT NOT NULL CHECK (lead_source IN ('revra', 'workspace')),
  marketplace_lead_id UUID REFERENCES marketplace_leads(id),
  workspace_lead_id UUID REFERENCES marketplace_workspace_leads(id),
  buyer_id UUID REFERENCES users(id),
  buyer_workspace_id UUID REFERENCES workspaces(id),
  seller_workspace_id UUID REFERENCES workspaces(id),
  price_cents INTEGER NOT NULL,
  stripe_payment_intent TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add marketplace_data column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketplace_data JSONB;

-- 7. Add stripe_account_id to workspaces for Stripe Connect
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE marketplace_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_workspace_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_workspace_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;

-- marketplace_tiers: all authenticated users can read, superadmins write
CREATE POLICY "marketplace_tiers_read" ON marketplace_tiers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "marketplace_tiers_update" ON marketplace_tiers
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));

-- marketplace_workspace_tiers: workspace members read, workspace admins write
CREATE POLICY "marketplace_workspace_tiers_read" ON marketplace_workspace_tiers
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "marketplace_workspace_tiers_insert" ON marketplace_workspace_tiers
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE workspace_id = workspace_id AND role IN ('admin', 'superadmin'))
  );
CREATE POLICY "marketplace_workspace_tiers_update" ON marketplace_workspace_tiers
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE workspace_id = workspace_id AND role IN ('admin', 'superadmin'))
  );

-- marketplace_leads: all authenticated users can see available leads
CREATE POLICY "marketplace_leads_read" ON marketplace_leads
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'available');
CREATE POLICY "marketplace_leads_insert" ON marketplace_leads
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));
CREATE POLICY "marketplace_leads_update" ON marketplace_leads
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin'));

-- marketplace_workspace_leads: workspace members see their pool
CREATE POLICY "marketplace_workspace_leads_read" ON marketplace_workspace_leads
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "marketplace_workspace_leads_insert" ON marketplace_workspace_leads
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE workspace_id = workspace_id AND role IN ('admin', 'superadmin'))
  );
CREATE POLICY "marketplace_workspace_leads_update" ON marketplace_workspace_leads
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE workspace_id = workspace_id AND role IN ('admin', 'superadmin'))
  );

-- marketplace_purchases: buyers see own, superadmins see all
CREATE POLICY "marketplace_purchases_read" ON marketplace_purchases
  FOR SELECT USING (
    buyer_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM users WHERE role = 'superadmin')
  );
CREATE POLICY "marketplace_purchases_insert" ON marketplace_purchases
  FOR INSERT WITH CHECK (true);