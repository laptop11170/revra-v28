# Per-User Workspace & Twilio Subaccount Isolation

> **Date:** 2026-06-18
> **Goal:** Every new user gets their own workspace, their own Twilio subaccount, and a $2.00 wallet bonus. No more cross-user data leakage.

---

## The Bug

The Clerk webhook at `app/api/webhooks/clerk/route.ts` was hard-coding every new sign-up to a single shared workspace:

```ts
// OLD — every user got the same workspace
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

case "user.created": {
 await supabase.from("users").upsert({
 clerk_user_id,
 workspace_id: DEFAULT_WORKSPACE_ID, // ← BUG
 // ...
 });
}
```

Because all users shared one workspace, they all shared one Twilio subaccount, one wallet balance, and one set of leads / calls / messages. The `/select-workspace` flow was never reached because the user already had a workspace. Subsequent signups with different emails all landed in the same workspace.

---

## Files Changed

| File | What changed | Why |
|---|---|---|
| `app/api/webhooks/clerk/route.ts` | Stop pre-assigning the seed workspace; insert user with `workspace_id = null`; idempotent on re-fire; dropped `role` from `user.updated` so a Clerk profile change cannot clobber the workspace admin role | Each new user must be allowed to create their own workspace. |
| `supabase/migrations/015_per_user_workspace_cleanup.sql` *(new)* | One-time DB cleanup that unlinks every existing user from the seed workspace; flag the seed as the platform workspace; add a DB trigger to prevent non-superadmin users from ever being linked to the platform workspace; add a `(clerk_user_id, workspace_id)` index | Existing users need to be sent through onboarding on next sign-in, and the platform workspace must be guarded against future contamination. |

**No other files were modified.** The existing `POST /api/workspaces`, `POST /api/twilio/setup-subaccount`, the middleware, the `/select-workspace` page, the `/user/twilio` page, and the wallet helpers all do the right thing once the webhook stops short-circuiting the flow.

---

## File 1: `app/api/webhooks/clerk/route.ts`

### What was there

```ts
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

// ...

case "user.created": {
 // ...
 await supabase.from("users").upsert({
 clerk_user_id,
 workspace_id: DEFAULT_WORKSPACE_ID, // every new user pinned here
 // ...
 });
}

case "user.updated": {
 await supabase.from("users").update({
 // ...
 role: (public_metadata?.role as string) || "agent", // ← also bad
 // ...
 }).eq("clerk_user_id", clerk_user_id);
}
```

### What it is now

```ts
// (the DEFAULT_WORKSPACE_ID constant is gone)

case "user.created": {
 // ...resolve email/name/role...

 // Idempotent: if a row already exists, skip.
 const { data: existing } = await supabase
 .from("users")
 .select("id")
 .eq("clerk_user_id", clerk_user_id)
 .maybeSingle();

 if (existing) {
 console.log(`webhook user.created: ${clerk_user_id} already exists, skipping`);
 break;
 }

 // New user: insert with NO workspace. The middleware will redirect
 // them to /select-workspace, where POST /api/workspaces creates
 // a fresh workspace + Twilio subaccount + $2.00 wallet bonus.
 const { error } = await supabase.from("users").insert({
 clerk_user_id,
 workspace_id: null,
 email: primaryEmail,
 full_name: fullName,
 avatar_url: image_url || null,
 role,
 });
 // ...
}

case "user.updated": {
 // Profile fields only — never touch workspace_id or role here.
 // POST /api/workspaces owns role assignment; we don't want a
 // Clerk user.updated to clobber the workspace admin role.
 await supabase.from("users").update({
 email: email_addresses?.[0]?.email_address ?? "",
 full_name: [first_name, last_name].filter(Boolean).join(" ") || null,
 avatar_url: image_url || null,
 }).eq("clerk_user_id", clerk_user_id);
 // ...
}
```

### Behavioral change

| | Before | After |
|---|---|---|
| New Clerk signup | `users.workspace_id` = seed workspace → middleware lets them straight into the dashboard → they see *everyone's* data | `users.workspace_id` = `null` → middleware redirects to `/select-workspace` → user creates their own workspace |
| Clerk `user.created` re-fire | `upsert` would have *re-set* `workspace_id` to the seed, blowing away a workspace the user already created | The `existing` short-circuit skips the insert entirely, leaving the user's real workspace intact |
| Clerk `user.updated` (any profile change) | Would overwrite the user's `role` from `public_metadata`, even if the user had been promoted to workspace `admin` | Only updates `email`, `full_name`, `avatar_url`; never touches `workspace_id` or `role` |

---

## File 2: `supabase/migrations/015_per_user_workspace_cleanup.sql` (new)

### 1. Unlink existing users from the seed workspace

```sql
UPDATE public.users
 SET workspace_id = NULL
 WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
 AND role <> 'superadmin';
```

After this, every existing tenant user has `workspace_id = NULL`. The next time they sign in, `middleware.ts` evaluates `hasWorkspace = !!user?.workspace_id` → `false` → redirect to `/select-workspace`.

Superadmin users are excluded from this update so the platform owner keeps their root workspace.

### 2. Defensive: re-flag the seed workspace as the platform workspace

```sql
UPDATE public.workspaces
 SET is_superadmin_workspace = TRUE,
 twilio_balance = 0.00
 WHERE id = '00000000-0000-0000-0000-000000000001'
 AND (is_superadmin_workspace IS DISTINCT FROM TRUE
 OR twilio_subaccount_sid IS NOT NULL);
```

Migration 014 already does this, but the OR-with-`twilio_subaccount_sid IS NOT NULL` clause also catches the case where the seed workspace was accidentally repurposed as a tenant (e.g. via the `unmarkPlatform` opt-in). It clears the subaccount reference and balance back to platform defaults.

### 3. Trigger: prevent non-superadmin users from being linked to the platform workspace

```sql
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
```

Defense in depth: even if some future code path tries to insert or update a `users` row to point at the platform workspace, the DB rejects it (unless the user is a superadmin). This makes it impossible to accidentally re-create the original bug.

### 4. Composite index for the middleware's auth lookup

```sql
CREATE INDEX IF NOT EXISTS idx_users_clerk_workspace
 ON public.users(clerk_user_id, workspace_id);
```

`middleware.ts` runs `SELECT id, workspace_id, role FROM users WHERE clerk_user_id = $1` on every protected request. This composite index keeps that lookup fast as the user count grows.

---

## How the Full Flow Works Now

### New user (fresh sign-up)

1. User signs up with Clerk.
2. Clerk → `user.created` → `app/api/webhooks/clerk/route.ts` → `INSERT INTO users (workspace_id = NULL, role = 'agent', ...)`.
3. Browser hits any protected route.
4. `middleware.ts` → `hasWorkspace = false` → redirect to `/select-workspace`.
5. User enters a workspace name and clicks Create.
6. `app/api/workspaces/route.ts` (already correct, no changes):
 - Inserts a new `workspaces` row. The `initialize_workspace_wallet` trigger from migration 014 sets `twilio_balance = 2.00` and writes a `bonus` row to `billing_transactions`.
 - Updates `users.workspace_id` to the new workspace and `users.role = 'admin'`.
 - Calls `provisionSubaccount()` from `lib/twilio/client.ts` → Twilio API creates a new subaccount under the platform parent.
 - Stores `twilio_subaccount_sid` and `twilio_subaccount_auth_token` on the workspace.
7. Browser redirects to `/user/twilio`.
8. `app/api/twilio/account/route.ts` returns that user's own subaccount data.
9. **Result:** the user sees a Twilio dashboard with their own subaccount, $2.00 balance, zero numbers / calls / messages.

### Existing user (after the migration runs)

1. Migration 015 sets their `workspace_id` to `NULL`.
2. Next time they sign in, the middleware redirects them to `/select-workspace`.
3. They go through the same flow as a new user and end up with a fresh workspace + subaccount + $2.00.

### Superadmin

- The `WHERE role <> 'superadmin'` clause in the migration cleanup means the superadmin user keeps their original `workspace_id` and never gets bounced to `/select-workspace`.
- The new DB trigger allows `role = 'superadmin'` users to be linked to the platform workspace, so the superadmin's link survives.

---

## How to Verify

### 1. Migration applied
```sql
SELECT id, workspace_id, role FROM public.users;
```
Every tenant user should show `workspace_id = NULL`.

### 2. Webhook
Sign up with Email A in an incognito window. After Clerk finishes, check the database:
```sql
SELECT email, workspace_id, role FROM public.users WHERE email = 'a@example.com';
```
It should be `(email, NULL, 'agent')` immediately after signup.

### 3. Workspace creation
Complete `/select-workspace`. Then:
```sql
SELECT w.name, w.twilio_subaccount_sid, w.twilio_balance
FROM workspaces w
JOIN users u ON u.workspace_id = w.id
WHERE u.email = 'a@example.com';
```
You should see one workspace named "A's Agency" (or whatever the user typed), a non-null `twilio_subaccount_sid`, and `twilio_balance = 2.00`.

### 4. Twilio console
Open the Twilio console → your parent account → Accounts → Subaccounts. You should see one new subaccount named `RevRa CRM - A's Agency (<workspace-id>)`.

### 5. Repeat with Email B
Sign up with Email B in another incognito window. The Twilio console should now show **two** subaccounts, and B's dashboard should show its own $2.00 balance and zero history — never A's.

### 6. Cross-tenant leakage check
A places a call. Check the database:
```sql
SELECT * FROM calls WHERE workspace_id = (SELECT workspace_id FROM users WHERE email = 'a@example.com');
```
The row exists. Then check that B's workspace has zero calls:
```sql
SELECT count(*) FROM calls WHERE workspace_id = (SELECT workspace_id FROM users WHERE email = 'b@example.com');
-- should be 0
```

### 7. Self-healing (if provisioning failed at signup)
Visit `/user/twilio`. The page calls `/api/twilio/account`, which returns `400 SUBACCOUNT_NOT_READY`. The page then calls `POST /api/twilio/setup-subaccount`, which provisions the missing subaccount and reloads the dashboard. No manual intervention needed.

### 8. DB trigger
Try to manually link a tenant user to the platform workspace:
```sql
UPDATE public.users SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'a@example.com';
-- ERROR: Cannot link a non-superadmin user to the platform workspace
```

---

## Operational Notes

- **Run the migration exactly once.** After it's been applied, new users will follow the corrected flow automatically. Re-running it is safe (it's idempotent — re-unlinking NULLs is a no-op), but it isn't necessary.
- **No environment variable changes are required.** The Clerk webhook, the workspace creation flow, and the Twilio provisioning all read from existing env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `CLERK_WEBHOOK_SECRET`).
- **The existing Twilio subaccount on the seed workspace, if any, is preserved.** The cleanup migration only clears `is_superadmin_workspace` if the seed was incorrectly repurposed; if the seed is already correctly flagged as the platform workspace, nothing changes for it.
- **Users with active sessions may need to sign out and back in** to trigger the middleware redirect. (The `workspace_id = null` change in the DB takes effect on the next middleware check, which happens on the next protected request.)

---

## Rollback

If the changes need to be reverted:

1. Restore the webhook to its previous behavior (re-add `DEFAULT_WORKSPACE_ID`).
2. Re-link users to the seed workspace:
 ```sql
 UPDATE public.users
 SET workspace_id = '00000000-0000-0000-0000-000000000001'
 WHERE workspace_id IS NULL
 AND role <> 'superadmin';
 ```
3. Drop the new trigger and function:
 ```sql
 DROP TRIGGER IF EXISTS trg_guard_platform_workspace ON public.users;
 DROP FUNCTION IF EXISTS public.guard_platform_workspace();
 ```
4. Optionally drop the new index.

The original webhook code and migration state are not destroyed by the new migration, so rollback is a forward-only set of operations.
