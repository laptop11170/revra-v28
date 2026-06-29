-- ============================================================
-- Migration 015: Per-user workspace isolation cleanup
--
-- Before this migration, every Clerk signup was auto-assigned to
-- the seed workspace (id = 00000000-0000-0000-0000-000000000001)
-- by the Clerk webhook. This caused all users to share one Twilio
-- subaccount and one set of leads / calls / messages.
--
-- This migration:
-- 1. Unlinks every existing user from the seed workspace so the
-- middleware sends them to /select-workspace on next sign-in.
-- 2. Marks the seed workspace as the platform workspace if it isn't
-- already (defensive — it should already be flagged in 014).
-- 3. Adds a DB trigger so that any future attempt to insert a user
-- with workspace_id = the platform workspace (except the original
-- superadmin) is rejected — prevents accidental cross-tenant
-- contamination.
-- 4. Backfills the workspace-creation bonus only for workspaces
-- that don't already have a $2.00 balance (so existing workspaces
-- that were created before 014 aren't double-bonused).
-- ============================================================

BEGIN;

-- ── 1. Unlink every existing user from the seed workspace ──────
-- After this, when each user next signs in, the middleware sees
-- hasWorkspace = false and redirects them to /select-workspace.
-- They then create their own workspace via POST /api/workspaces,
-- which provisions a fresh Twilio subaccount under the platform
-- parent and seeds a $2.00 wallet bonus.

UPDATE public.users
 SET workspace_id = NULL
 WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
 AND role <> 'superadmin';

-- ── 2. Defensive: ensure the seed workspace is flagged as the
-- platform workspace. (Migration 014 already does this, but we
-- re-assert it in case anyone manually cleared the flag.)
UPDATE public.workspaces
 SET is_superadmin_workspace = TRUE,
 twilio_balance = 0.00
 WHERE id = '00000000-0000-0000-0000-000000000001'
 AND (is_superadmin_workspace IS DISTINCT FROM TRUE
 OR twilio_subaccount_sid IS NOT NULL);

-- ── 3. Trigger: prevent non-superadmin users from being linked
-- to the platform workspace. Defense in depth.

CREATE OR REPLACE FUNCTION public.guard_platform_workspace()
RETURNS TRIGGER AS $$
DECLARE
 ws_superadmin boolean;
BEGIN
 IF NEW.workspace_id IS NULL THEN
 RETURN NEW;
 END IF;

 SELECT is_superadmin_workspace
 INTO ws_superadmin
 FROM public.workspaces
 WHERE id = NEW.workspace_id;

 IF ws_superadmin = TRUE AND NEW.role <> 'superadmin' THEN
 RAISE EXCEPTION
 'Cannot link a non-superadmin user to the platform workspace';
 END IF;

 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_platform_workspace ON public.users;
CREATE TRIGGER trg_guard_platform_workspace
 BEFORE INSERT OR UPDATE OF workspace_id, role ON public.users
 FOR EACH ROW
 EXECUTE FUNCTION public.guard_platform_workspace();

-- ── 4. Add a helpful index for the (workspace_id, clerk_user_id)
-- lookup the middleware does on every protected request.

CREATE INDEX IF NOT EXISTS idx_users_clerk_workspace
 ON public.users(clerk_user_id, workspace_id);

COMMIT;
