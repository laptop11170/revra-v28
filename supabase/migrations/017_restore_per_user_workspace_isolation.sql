-- ============================================================
-- Migration 017: Restore per-user workspace isolation
--
-- Migration 016 linked every non-superadmin user to the shared seed
-- workspace (id 00000000-0000-0000-0000-000000000001) so all tenants
-- shared one Twilio account and one pool of leads/calls/messages.
-- The product decision has been reversed: every new user gets their
-- own workspace + their own Twilio subaccount.
--
-- This migration reverses 016 and re-applies 015's guard trigger so
-- the auto-link bug can't reoccur. After this runs:
-- * All non-superadmin users have workspace_id = NULL and will land
-- on /select-workspace on their next request, where they create
-- their own workspace via POST /api/workspaces.
-- * The seed workspace is the superadmin platform workspace again.
-- * The trg_guard_platform_workspace trigger rejects any future
-- attempt to link a non-superadmin user to a workspace whose
-- is_superadmin_workspace = TRUE.
-- ============================================================

BEGIN;

-- ── 1. Defensive: drop the guard trigger if 016 left any residue ─
DROP TRIGGER IF EXISTS trg_guard_platform_workspace ON public.users;
DROP FUNCTION IF EXISTS public.guard_platform_workspace();

-- ── 2. Unlink every non-superadmin user from the seed workspace ──
-- After this, the middleware sees hasWorkspace = false for every
-- doer and redirects them to /select-workspace, where they create
-- their own workspace + Twilio subaccount.
UPDATE public.users
 SET workspace_id = NULL
 WHERE role <> 'superadmin';

-- ── 3. Re-create the guard trigger from 015 ─────────────────────
-- Prevents accidental cross-tenant contamination by rejecting any
-- INSERT or UPDATE that links a non-superadmin user to a workspace
-- whose is_superadmin_workspace = TRUE.
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

CREATE TRIGGER trg_guard_platform_workspace
 BEFORE INSERT OR UPDATE OF workspace_id, role ON public.users
 FOR EACH ROW
 EXECUTE FUNCTION public.guard_platform_workspace();

-- ── 4. Re-flag the seed workspace as the superadmin workspace ───
-- The seed workspace is the platform itself — the parent Twilio
-- account lives here, no per-tenant subaccount, no $2 bonus.
UPDATE public.workspaces
 SET is_superadmin_workspace = TRUE,
 twilio_subaccount_sid = NULL,
 twilio_balance = 0.00
 WHERE id = '00000000-0000-0000-0000-000000000001'
 AND (is_superadmin_workspace IS DISTINCT FROM TRUE
 OR twilio_subaccount_sid IS NOT NULL
 OR twilio_balance <> 0.00);

-- ── 5. Helpful comment for the next person reading this ────────
COMMENT ON COLUMN public.workspaces.is_superadmin_workspace
 IS 'TRUE for the platform seed workspace. The guard trigger trg_guard_platform_workspace rejects any attempt to link a non-superadmin user to a workspace with this flag set.';

COMMIT;
