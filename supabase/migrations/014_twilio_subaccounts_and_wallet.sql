-- ============================================================
-- Migration 014: Twilio subaccounts + wallet / billing ledger
--
-- Goal: isolate Twilio communication layers per workspace.
-- * Parent Twilio account (env vars) is owned by the superadmin
-- and is used ONLY to provision subaccounts.
-- * Each user/workspace gets its own Twilio subaccount
-- (twilio_subaccount_sid / twilio_subaccount_auth_token)
-- that is used for ALL calls, SMS, recordings, and webhooks.
-- * Each workspace has a virtual wallet balance (twilio_balance)
-- seeded with a $2.00 sign-up bonus, topped up via Stripe.
-- * Every credit movement is logged in billing_transactions.
-- ============================================================

BEGIN;

-- ── 1. Extend workspaces for per-tenant Twilio isolation ────────
ALTER TABLE workspaces
 ADD COLUMN IF NOT EXISTS twilio_subaccount_sid TEXT UNIQUE,
 ADD COLUMN IF NOT EXISTS twilio_subaccount_auth_token TEXT,
 ADD COLUMN IF NOT EXISTS twilio_balance DECIMAL(10, 2) DEFAULT 2.00,
 ADD COLUMN IF NOT EXISTS twilio_subaccount_status TEXT DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS twilio_subaccount_created_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS is_superadmin_workspace BOOLEAN DEFAULT FALSE,
 ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
 ADD COLUMN IF NOT EXISTS default_caller_id TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_twilio_sub
 ON workspaces(twilio_subaccount_sid);

-- The existing single master column keeps the parent (superadmin) Twilio
-- account. Tenant subaccounts live in twilio_subaccount_* columns above.
-- (twilio_account_sid already exists in the base schema.)

-- ── 2. Billing transactions ledger ─────────────────────────────
DO $$ BEGIN
 CREATE TYPE billing_tx_type AS ENUM (
 'recharge',
 'number_purchase',
 'call_cost',
 'sms_cost',
 'bonus',
 'refund',
 'adjustment'
 );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS billing_transactions (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 amount DECIMAL(10, 2) NOT NULL,
 type billing_tx_type NOT NULL,
 status TEXT DEFAULT 'success',
 description TEXT,
 reference_id TEXT,
 metadata JSONB DEFAULT '{}',
 created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_workspace_id
 ON billing_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at
 ON billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_type
 ON billing_transactions(type);

-- ── 3. Tracked phone numbers (workspace-owned Twilio numbers) ──
CREATE TABLE IF NOT EXISTS twilio_phone_numbers (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 twilio_sid TEXT UNIQUE NOT NULL,
 phone_number TEXT NOT NULL,
 friendly_name TEXT,
 country_code TEXT DEFAULT 'US',
 capabilities JSONB DEFAULT '{}',
 voice_url TEXT,
 sms_url TEXT,
 status TEXT DEFAULT 'active',
 is_active BOOLEAN DEFAULT TRUE,
 monthly_cost DECIMAL(10, 2) DEFAULT 1.15,
 purchased_at TIMESTAMPTZ DEFAULT NOW(),
 released_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twilio_phone_numbers_workspace
 ON twilio_phone_numbers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_twilio_phone_numbers_active
 ON twilio_phone_numbers(workspace_id, is_active);

ALTER TABLE twilio_phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members see own numbers" ON twilio_phone_numbers;
CREATE POLICY "Workspace members see own numbers"
 ON twilio_phone_numbers FOR SELECT
 USING (
 workspace_id IN (
 SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
 )
 OR EXISTS (
 SELECT 1 FROM users
 WHERE clerk_user_id = auth.uid()::text
 AND role = 'superadmin'
 )
 );

DROP POLICY IF EXISTS "Service manages phone numbers" ON twilio_phone_numbers;
CREATE POLICY "Service manages phone numbers"
 ON twilio_phone_numbers FOR ALL
 WITH CHECK (true);

-- ── 3. Initial sign-up bonus trigger ───────────────────────────
-- The MD guide awards $2.00 to a workspace the first time it is
-- provisioned. We add this via the workspace creation event by
-- inserting a `bonus` transaction and ensuring the balance column
-- defaults to 2.00 above.

CREATE OR REPLACE FUNCTION initialize_workspace_wallet()
RETURNS TRIGGER AS $$
BEGIN
 -- Superadmin workspace is the platform itself — no bonus, no auto-balance.
 IF NEW.is_superadmin_workspace = TRUE THEN
 NEW.twilio_balance := 0.00;
 RETURN NEW;
 END IF;

 -- Tenant workspaces get a $2.00 sign-up bonus.
 IF NEW.twilio_balance IS NULL THEN
 NEW.twilio_balance := 2.00;
 END IF;

 INSERT INTO billing_transactions (workspace_id, amount, type, description)
 VALUES (
 NEW.id,
 NEW.twilio_balance,
 'bonus',
 'Initial sign-up communication credit ($' || NEW.twilio_balance::text || ')'
 );

 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_workspace_created_bonus ON workspaces;
CREATE TRIGGER on_workspace_created_bonus
 BEFORE INSERT ON workspaces
 FOR EACH ROW
 EXECUTE FUNCTION initialize_workspace_wallet();

-- ── 4. Mark the seed demo workspace as the superadmin workspace ─
-- The seed in migration.sql uses a fixed demo workspace UUID. We
-- mark it as the superadmin platform workspace so the parent
-- Twilio account stays associated with it.
UPDATE workspaces
  SET is_superadmin_workspace = TRUE,
 twilio_subaccount_sid = NULL,
 twilio_balance = 0.00
 WHERE slug = 'revra-demo'
 AND is_superadmin_workspace IS DISTINCT FROM TRUE;

-- ── 5. RLS: workspace-scoped access to billing_transactions ────
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members see own billing" ON billing_transactions;
CREATE POLICY "Workspace members see own billing"
 ON billing_transactions FOR SELECT
 USING (
 workspace_id IN (
 SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()::text
 )
 OR EXISTS (
 SELECT 1 FROM users
 WHERE clerk_user_id = auth.uid()::text
 AND role = 'superadmin'
 )
  );

DROP POLICY IF EXISTS "Service inserts billing rows" ON billing_transactions;
CREATE POLICY "Service inserts billing rows"
 ON billing_transactions FOR INSERT
 WITH CHECK (true);

-- RLS: hide the superadmin workspace from tenant queries
DROP POLICY IF EXISTS "Superadmins manage all workspaces" ON workspaces;
CREATE POLICY "Superadmins manage all workspaces"
 ON workspaces FOR ALL
 USING (
 is_superadmin_workspace = FALSE
 OR (auth.jwt() ->> 'public_metadata' = 'superadmin')
 );

COMMIT;
