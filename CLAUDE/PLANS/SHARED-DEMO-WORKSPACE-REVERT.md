# Plan: Revert per-user workspace isolation — share one demo workspace for all users, use main Twilio account from env

## Context

Three recent commits (`2d61934` `update dialer, call features, ai voice agent, twiml app`, `caf94a1` `workspace Update`, `091355a` `new workspace update`) switched the product to **per-user workspace isolation**: every new Clerk signup is sent to `/select-workspace` to create their own workspace + Twilio subaccount, with a $2.00 wallet bonus. The product decision has been reversed:

- **One shared demo workspace** (`00000000-0000-0000-0000-000000000001`) for every user.
- **Twilio main account** (`TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` from env) is used for ALL outbound calls and SMS. No per-workspace subaccounts, no wallet, no provisioning flow.
- Database migrations 015/016/017 stay in place; application code will simply hard-code the demo workspace ID and ignore the subaccount columns.

The user is seeing a "bug" because the new flow forces every new user to pick a workspace, and dialer/call features stopped working end-to-end (subaccount provisioning fails / UI is broken). Going back to the pre-`2d61934` behavior with the main Twilio account fixes it.

## Files Changed

### Core reverts (restore pre-`2d61934` behavior)

| File | Action | Why |
|------|--------|-----|
| `app/api/webhooks/clerk/route.ts` | Re-add `DEFAULT_WORKSPACE_ID` constant, change `user.created` to `upsert` with that workspace, restore `role` in `user.updated` | Every new signup is auto-pinned to the shared demo workspace so they land straight on the dashboard |
| `middleware.ts` | Drop the `guard_platform_workspace` lookup, remove the "user has no workspace" insert fallback, keep the simple "redirect to /select-workspace if no workspace" logic but it will never trigger because webhook sets it | Middleware no longer touches the user table or pre-creates a row |
| `app/api/workspaces/route.ts` | Revert to the simple pre-`2d61934` version (no slug generation, no subaccount provisioning, no `SIGNUP_BONUS_USD`, no `provisionSubaccount` import) | Workspace creation is a no-op for the demo; keep endpoint but it just inserts a row with the given name |
| `app/api/twiml/route.ts` | Revert to the pre-`2d61934` version that does not look up the workspace by phone number | Inbound calls route by lead phone across the (shared) workspace |
| `app/user/calls/page.tsx` | Revert to the pre-`2d61934` version (smaller, no DEMO_CALLS array, no `router.replace("/select-workspace")`) | The page was bloated in `091355a` with redundant demo data and 404 → /select-workspace redirect logic that fires incorrectly when the shared workspace legitimately has zero calls |

### Twilio main-account simplification (no subaccounts)

| File | Action | Why |
|------|--------|-----|
| `lib/twilio/client.ts` | Replace with the pre-`2d61934` version: `getTwilioClient()` returns `twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)`; `initiateCall`, `hangupCall`, `fetchCall` use the main client; `mintVoiceToken` mints against the parent account; drop all subaccount helpers (`getWorkspaceTwilioClient`, `getWorkspaceTwilioClientFromDB`, `getParentTwilioClient`, `provisionSubaccount`, `mintWorkspaceVoiceToken`, `buildAgentIdentity`) | Every call uses the main Twilio account — no per-workspace subaccount |
| `lib/twilio/context.ts` | **Delete** | Workspace Twilio context resolver is no longer needed |
| `app/api/calls/token/route.ts` | Revert to the pre-`2d61934` version: mints a token against the main account using `TWILIO_API_KEY_SID`/`TWILIO_API_KEY_SECRET`/`TWILIO_VOICE_TWIML_APP_SID` from env | The browser Twilio.Device uses the main account's voice grant |
| `app/api/calls/initiate/route.ts` | Revert to the pre-`2d61934` version: looks up the user's workspace_id (the shared one), creates the `calls` row, returns the parent's `TWILIO_PHONE_NUMBER` as the caller ID; no `getWorkspaceTwilioContext` check, no subaccount check | Calls are placed through the main account using `TWILIO_PHONE_NUMBER` as caller id |

### Files added by the recent commits to remove

| File | Action | Why |
|------|--------|-----|
| `app/api/twilio/account/route.ts` | **Delete** | Only used by the subaccount dashboard |
| `app/api/twilio/numbers/buy/route.ts` | **Delete** | Subaccount-only |
| `app/api/twilio/numbers/search/route.ts` | **Delete** | Subaccount-only |
| `app/api/twilio/setup-subaccount/route.ts` | **Delete** | Subaccount provisioning |
| `app/api/billing/recharge/route.ts` | **Delete** | Wallet top-up, no wallet anymore |
| `app/api/billing/transactions/route.ts` | **Delete** | Wallet history, no wallet anymore |
| `app/api/webhooks/stripe-recharge/route.ts` | **Delete** | Stripe top-up webhook, no wallet |
| `lib/twilio/wallet.ts` | **Delete** | Wallet ledger logic |
| `app/user/twilio/page.tsx` | Revert to the pre-`2d61934` simple version (or to a thin stub if the pre-version is hard to recover cleanly — see implementation note below) | Subaccount dashboard makes no sense without subaccounts |
| `docs/sendillo-subaccount-architecture.md` | **Delete** | Subaccount architecture doc, irrelevant now |

### Other cleanup

- `app/api/twiml/outbound/route.ts` (added in `2d61934`) — keep or revert? Will check during implementation. If the new outbound route is functionally identical to the old one (just uses the same main-account Twilio client), keep it. Otherwise revert.
- `app/api/calls/outbound/route.ts` (if it exists from the new code) — handle similarly.

## Migrations: leave in place

Per the user's choice, the SQL migrations `015_per_user_workspace_cleanup.sql`, `016_share_demo_workspace_for_all_users.sql`, and `017_restore_per_user_workspace_isolation.sql` stay in the repo. The application code will simply:
- Hard-code `DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001"` in the Clerk webhook.
- Stop calling `provisionSubaccount`, `getWorkspaceTwilioClientFromDB`, etc.

This means the `trg_guard_platform_workspace` trigger and the `workspaces.is_superadmin_workspace` flag remain in the DB but are never exercised by the application. That's fine.

## Implementation steps

1. **Revert the four core source files** using `git show HEAD~3:<file>` to recover the pre-`2d61934` content, then apply the small tweaks noted in the table above:
 - `app/api/webhooks/clerk/route.ts`
 - `middleware.ts`
 - `app/api/workspaces/route.ts`
 - `app/api/twiml/route.ts`
 - `app/user/calls/page.tsx`
2. **Rewrite `lib/twilio/client.ts`** to a single-account version (recover from `git show HEAD~3:lib/twilio/client.ts` as the base, add back `mintVoiceToken` and `buildAgentIdentity` helpers that use the env credentials).
3. **Delete `lib/twilio/context.ts`** (no longer imported).
4. **Revert `app/api/calls/token/route.ts`** to use `mintVoiceToken` with the env creds.
5. **Revert `app/api/calls/initiate/route.ts`** to use the main account and `TWILIO_PHONE_NUMBER` as caller id.
6. **Delete** the eight subaccount/billing files listed above.
7. **Revert or stub `app/user/twilio/page.tsx`** — recover the pre-`2d61934` version from git; if it doesn't exist or is too thin, replace with a simple "Twilio is connected via main account, balance not tracked" placeholder.
8. **Delete `docs/sendillo-subaccount-architecture.md`**.
9. **Run `npm run build`** to confirm no broken imports remain.
10. **Spot-check** by grepping for any leftover references to `provisionSubaccount`, `getWorkspaceTwilioClient`, `getWorkspaceTwilioContext`, `SUBACCOUNT_NOT_READY`, `twilio_subaccount_sid`, `twilio_subaccount_auth_token` — should all be gone.

## Risks / notes

- **User data**: the three SQL migrations are still in the repo. The current `users` table may have `workspace_id = NULL` for most rows (from 017). The reverted Clerk webhook will set `workspace_id = DEFAULT_WORKSPACE_ID` on every new `user.created` and on `upsert` re-fires. Existing users with `workspace_id = NULL` will still be redirected to `/select-workspace` by the middleware. To make the demo work for *all* users (existing and new), the simplest path is to leave that as-is — the user can manually run a one-line `UPDATE public.users SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE role <> 'superadmin';` in Supabase when they want. (This is mentioned in the wrap-up message; the user can decide whether to actually run it.)
- **Twilio voice caller ID**: with the main account, every outbound call uses `TWILIO_PHONE_NUMBER` (+18047924045) as the caller ID. That's the intended behavior per the user's request.
- **No wallet / no recharge flow**: deleting `app/api/billing/*` and `lib/twilio/wallet.ts` is safe — the wallet was only consumed by the subaccount flow.
- **Wallet balance column**: `workspaces.twilio_balance` and `billing_transactions` rows from migration 014 stay in the DB but are unused. No application code reads them after this revert.
