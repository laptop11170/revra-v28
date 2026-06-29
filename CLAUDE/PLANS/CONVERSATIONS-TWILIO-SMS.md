# Plan: Enable Twilio SMS in the Conversations page

## Context

The Conversations UI ([app/user/conversations/page.tsx](app/user/conversations/page.tsx)) already has a fully built composer (input + send button), conversation list, message bubbles with delivery-state checkmarks (`pending` / `sent` / `delivered` / `failed`), and a 5-second polling loop. The frontend POSTs to `/api/leads/{leadId}/messages` with `{ channel: "sms", body }` on Enter or send-button click. **The frontend wiring is complete.**

The only thing missing is the actual SMS delivery: the POST handler at [app/api/leads/[id]/messages/route.ts:92-128](app/api/leads/[id]/messages/route.ts#L92-L128) currently routes outbound SMS through **Sendillo** (`sendSMS` from `lib/sendillo/client.ts`), which requires a `sendillo_phone_numbers` row with `is_active = true` for the workspace. In the shared-demo-workspace setup (per the `SHARED-DEMO-WORKSPACE-REVERT.md` plan), no such row exists — so every send fails with `"No active SMS sender number configured for this workspace"` and the message is saved with `external_status = "failed"`.

Meanwhile, Twilio is fully configured for **voice** (calls) using the platform's main account — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` are read by `getTwilioClient()` and `getTwilioPhoneNumber()` in [lib/twilio/client.ts](lib/twilio/client.ts). The same Twilio account can send SMS via `client.messages.create({ from, to, body })` — Twilio's Programmable SMS API. No new env vars are needed; the existing `TWILIO_PHONE_NUMBER` (e.g. `+18047924045`) becomes the SMS sender for the demo.

Goal: when a user sends an SMS in the Conversations page, dispatch it through the platform's Twilio account (the same one used for voice), persist the message + delivery state in Supabase, and let the existing UI show `sent` / `delivered` / `failed` status.

## Approach

Add a small `sendSms()` helper to `lib/twilio/client.ts` and switch the messages POST route to use it instead of Sendillo. Leave the Sendillo client in place (other features/sequences may still depend on it). Frontend requires **zero** changes — its current request shape and response shape already match.

### Files to change

| File | Change |
|------|--------|
| [lib/twilio/client.ts](lib/twilio/client.ts) | Add `sendSms({ to, body })` helper that calls `client.messages.create({ from: TWILIO_PHONE_NUMBER, to, body })` and returns `{ sid, status }`. Throws on Twilio API error. |
| [app/api/leads/[id]/messages/route.ts](app/api/leads/[id]/messages/route.ts) | Replace the Sendillo branch in the POST handler with a call to `sendSms({ to: lead.phone, body: messageBody })`. Map the Twilio response: `external_status = "sent"`, `external_id = <message sid>`. On error, set `external_status = "failed"` and log the message. |

### Why this scope

- **No frontend changes** — the UI already POSTs `{ channel: "sms", body }` and reads `data.message.external_status`. The shape stays identical; only the underlying provider changes.
- **No schema changes** — `messages.external_id` and `messages.external_status` already exist ([supabase/schema.sql:360-361](supabase/schema.sql#L360-L361)). The Twilio message SID is a natural fit for `external_id`.
- **No new env vars** — `TWILIO_PHONE_NUMBER` is already required for voice; reusing it as the SMS "From" keeps the demo config minimal.
- **Per the shared-workspace plan** — every user shares the demo workspace, so every outbound SMS comes from the same `TWILIO_PHONE_NUMBER`. That matches the voice caller-id behavior.
- **Sendillo is not removed** — the `lib/sendillo/client.ts` import in the messages route is replaced, not the file itself. Other code paths (campaigns, sequences) may still use it.

## sendSms helper

```ts
// lib/twilio/client.ts (additions)
export interface TwilioSmsResult {
 sid: string;
 status: string; // queued | sent | delivered | failed | undelivered
}

export async function sendSms(options: {
 to: string;
 body: string;
}): Promise<TwilioSmsResult> {
 const client = getTwilioClient();
 const from = getTwilioPhoneNumber();

 const msg = await client.messages.create({
 from,
 to: options.to,
 body: options.body,
 });

 return { sid: msg.sid, status: msg.status };
}
```

`getTwilioClient()` and `getTwilioPhoneNumber()` already validate the env vars and throw a clear error if unconfigured, so the new helper inherits that.

## Updated POST branch in the messages route

Replace lines 92-128 of [app/api/leads/[id]/messages/route.ts](app/api/leads/[id]/messages/route.ts) with:

```ts
if (channel === "sms") {
 if (!lead.phone) {
 return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 });
 }

  try {
 const result = await sendSms({ to: lead.phone, body: messageBody });
 externalStatus = "sent";
 externalId = result.sid; // Twilio message SID, e.g. "SMxxxxxxxx"
 } catch (err: unknown) {
 const e = err as { message?: string };
 console.error("[Twilio] SMS send failed:", e.message);
 externalStatus = "failed";
 }
}
```

Drop the `sendSMS` import from `@/lib/sendillo/client` and add `sendSms` to the import from `@/lib/twilio/client`. The rest of the handler (insert `messages` row, update `conversations` upsert, link `conversation_id`, return 201/207) stays exactly as-is.

## Delivery-status follow-up (optional, not in this plan)

For full `delivered` updates we'd need a Twilio status-callback webhook — same pattern Sendillo uses today. The current UI shows `sent` as a check-checkmark and the user will see the message in the lead's thread. If we want `delivered` to light up later, the change is one new route handler at `app/api/webhooks/twilio-sms-status/route.ts` that updates `messages.external_status` from Twilio's POST. **Not part of this change** — the user's ask is to "enable SMS sending," not full delivery receipts. Mention it in the wrap-up so the user can opt in.

## Verification

1. `npm run build` — confirm no broken imports.
2. `grep -rn "sendillo_phone_numbers\|from.*sendillo/client" app/` — should no longer reference Sendillo in the messages route.
3. Manual: open `/user/conversations`, pick a contact, type a message, hit send. The bubble should appear immediately, and the recipient's phone should receive the SMS from `TWILIO_PHONE_NUMBER`. If Twilio env vars are unset, the server returns 500 with the existing `getEnv()` error and the UI shows the message with `Failed` — same as before for the failure path.

## Risks / notes

- **Sender number is shared across all demo users** — every outbound SMS comes from the same `TWILIO_PHONE_NUMBER` (currently `+18047924045`). For a production multi-tenant setup this would be per-workspace, but that's already the case for voice and is intentional for the shared-demo config.
- **Opt-out handling is unchanged** — `leads.opted_out` is still checked before send. If a lead has opted out, the route returns 400 and no message is persisted.
- **No rate limiting added** — Twilio handles its own queuing; for a demo with one demo workspace this is fine.
