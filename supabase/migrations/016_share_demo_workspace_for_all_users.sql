-- ============================================================
-- Migration 016: Share the demo workspace across all users
--
-- Reverses the per-user isolation introduced in 015. The product
-- decision is that all "doer" (non-superadmin) users share the
-- same RevRa Demo workspace, so they see the same pool of leads,
-- calls, and messages — but each user still only sees the rows
-- their RLS policies allow. They no longer need to create or
-- select a workspace at signup.
--
-- IMPORTANT ORDERING:
-- The trigger from 015 (trg_guard_platform_workspace) rejects any
-- UPDATE that links a non-superadmin user to a workspace whose
-- is_superadmin_workspace = TRUE. If we try to re-link users
-- before dropping the trigger, this migration will fail with:
-- "Cannot link a non-superadmin user to the platform workspace".
-- So step 1 below drops the trigger first; step 2 then re-links.
-- ============================================================

BEGIN;

-- ── 1. Drop the guard trigger from 015 FIRST ────────────────────
-- Must come before the re-link UPDATE, otherwise that UPDATE
-- will be rejected by the trigger from migration 015.
DROP TRIGGER IF EXISTS trg_guard_platform_workspace ON public.users;
DROP FUNCTION IF EXISTS public.guard_platform_workspace();

-- ── 2. Re-link every non-superadmin user to the demo workspace ──
-- After this, every existing user with role <> 'superadmin' will
-- have workspace_id = the seed demo workspace, and the middleware
-- will let them straight through to /user (or wherever their role
-- routes them) without redirecting to /select-workspace.
UPDATE public.users
 SET workspace_id = '00000000-0000-0000-0000-000000000001'
 WHERE role <> 'superadmin'
 AND (workspace_id IS NULL
 OR workspace_id <> '00000000-0000-0000-0000-000000000001');

-- ── 3. Mark the seed workspace as the shared tenant workspace ───
-- We flip is_superadmin_workspace back to FALSE so that the seed
-- workspace is treated like any other tenant workspace. The parent
-- Twilio account SID (stored in the base `twilio_account_sid`
-- column) is what all doers' calls/SMS will route through.
UPDATE public.workspaces
 SET is_superadmin_workspace = FALSE
 WHERE id = '00000000-0000-0000-0000-000000000001'
 AND is_superadmin_workspace IS DISTINCT FROM FALSE;

-- ── 4. Defensive: ensure superadmins have no workspace_id ───────
-- The superadmin doesn't need a workspace assigned — they get the
-- superadmin dashboard regardless — but keeping the column NULL
-- avoids RLS surprises in policies that filter on workspace_id.
UPDATE public.users
 SET workspace_id = NULL
 WHERE role = 'superadmin'
 AND workspace_id IS NOT NULL;

-- ── 5. Helpful comment for the next person reading this ────────
COMMENT ON COLUMN public.workspaces.is_superadmin_workspace
 IS 'Reserved for future platform-owner isolation. The seed demo workspace is currently shared across all doer users, so this flag is FALSE on it.';

COMMIT;
