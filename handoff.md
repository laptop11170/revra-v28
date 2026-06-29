# RevRa — Phase 3 Handoff

## What's Built

### Emma AI (LunarGrowth) Integration
**Status: Implemented, needs env vars + Emma webhook delivery**

Emma AI is RevRa's unified AI engine for messaging (Instagram, WhatsApp, FB Messenger, Telegram), voice (via Twilio/Retell), and calendar (Google Calendar OAuth). It's integrated at the platform level — not per-workspace.

#### Files
- `lib/emma/client.ts` — Emma AI API client (clients, leads, connect links)
- `app/api/emma/setup/route.ts` — Check/verify Emma API key
- `app/api/emma/clients/route.ts` — Create/list Emma clients
- `app/api/emma/leads/route.ts` — Push lead to Emma
- `app/api/emma/leads/[id]/route.ts` — Update Emma lead status
- `app/api/emma/leads/bulk/route.ts` — Bulk push leads to Emma
- `app/api/emma/messaging/connect-link/route.ts` — OAuth link for messaging platforms
- `app/api/emma/calendar/connect-link/route.ts` — OAuth link for Google Calendar
- `app/api/leads/route.ts` — Auto-push new leads to Emma on create
- `app/api/leads/[id]/route.ts` — Auto-sync lead stage to Emma on update

#### Schema Changes
- `users.emma_client_id TEXT` — per-user Emma client ID (future multi-client)
- `conversations.unread_count INTEGER DEFAULT 0` — unread badge tracking
- `idx_conversations_unread` — partial index on unread conversations

#### Setup Required
1. Set `EMMA_API_KEY` env var on Railway
2. Run `supabase/migrations/003_emma_ai_schema.sql` in Supabase SQL Editor

#### Pending (waiting on Emma AI team)
- **Inbound webhook** — Emma webhooks not yet delivered. When delivered, build `POST /api/webhooks/emma/route.ts` to handle inbound messages on connected channels.
- **AI draft generation** — Emma AI endpoint for message suggestions not yet delivered. When delivered, wire "AI Draft" button in `app/user/texts/page.tsx`.
- **iMessage/SMS/RCS channels** — Emma team still building
- **Call recording/transcription/summary fetch** — Emma team still building

---

### Sendillo Bulk SMS Integration
**Status: Fully implemented, needs env var + webhook setup in Sendillo dashboard**

Sendillo handles outbound bulk/blast SMS campaigns. Inbound replies route to Emma AI for warm lead handling.

#### Files
- `lib/sendillo/client.ts` — Sendillo API client (SMS, bulk SMS, numbers, brands)
- `app/api/webhooks/sendillo/route.ts` — Handle 4 webhook events:
  - `inbound.received` — store reply, check keywords, push to Emma or opt-out
  - `message.delivered` — update delivery status
  - `message.sent` — update sent status
  - `message.failed` — update failed status
- `app/api/sendillo/numbers/route.ts` — List from Sendillo / list registered in RevRa / add number
- `app/api/sendillo/numbers/[id]/route.ts` — Update/delete registered number
- `app/api/sendillo/brands/route.ts` — List Sendillo brands
- `app/api/campaigns/route.ts` — List/create campaigns
- `app/api/campaigns/[id]/route.ts` — Get/update/delete campaign
- `app/api/campaigns/[id]/send/route.ts` — Execute campaign send via Sendillo
- `app/api/campaigns/[id]/stats/route.ts` — Per-campaign stats
- `app/api/campaigns/stats/route.ts` — Aggregate workspace stats
- `app/user/campaigns/page.tsx` — Campaign list UI + 5-step create wizard
- `app/user/leads/page.tsx` — "Send Bulk SMS" modal now wired to create + send campaigns
- `app/superadmin/sendillo/page.tsx` — Superadmin: manage Sendillo numbers, view brands

#### Schema Changes (see `supabase/migrations/004_sendillo_schema.sql`)
- `sendillo_phone_numbers` table — purchased numbers assigned to agents
- `leads.opted_out` + `leads.opted_out_at` — opt-out tracking
- `campaigns` expanded: `sender_phone_id`, `message_body`, `positive_keywords`, `optout_keywords`, `failed`, `opted_out`, `emma_synced`, `created_by`
- `messages.campaign_id` — campaign attribution
- `integrations` row for Sendillo added
- 7 counter RPCs: `increment_campaign_sent/delivered/failed/replied/optout/emma_synced`, `increment_conversation_unread`
- RLS policies for `sendillo_phone_numbers`

#### Setup Required
1. Set `SENDILLO_API_KEY` env var on Railway
2. Run `supabase/migrations/004_sendillo_schema_enum.sql` (one line: add `'sendillo'` to enum)
3. Run `supabase/migrations/004_sendillo_schema.sql` (rest of the schema)
4. In Sendillo dashboard, set webhook URL to:
   `https://app.letsrevra.com/api/webhooks/sendillo`
   Enable these events:
   - `inbound.received`
   - `message.delivered`
   - `message.sent`
   - `message.failed`

---

## Architecture Summary

### Messaging Flow
```
Agent creates campaign → RevRa calls Sendillo bulk SMS API
  → Sendillo delivers SMS to all leads
  → Lead replies → Sendillo fires webhook to RevRa
    ├── "STOP" → mark lead opted_out, no Emma push
    ├── "interested" → push lead to Emma AI, increment emma_synced
    └── Other reply → store as inbound SMS in RevRa conversation
  → Delivery receipts → update message status in DB
```

### Keyword Routing (per campaign, configurable by agent)
- **Positive keywords** → route to Emma AI (warm leads handled by AI)
- **Opt-out keywords** → mark lead as opted out, skip Emma push
- Default opt-out: `STOP`, `UNSUBSCRIBE`, `CANCEL`
- Default positive: `interested`, `yes`, `more info` (agent sets per campaign)

### Delivery Status Tracking
Each outbound SMS message has `external_status` updated via webhooks:
- `pending` → inserted when campaign sends
- `sent` → Sendillo accepted it
- `delivered` → confirmed delivered to handset
- `failed` → delivery failed

Campaign analytics reflect: sent, delivered, failed, opted_out, replied, emma_synced.

---

## Files Modified in Existing Codebase

| File | Change |
|------|--------|
| `supabase/schema.sql` | Emma AI + Sendillo schema changes (single source of truth) |
| `app/api/leads/route.ts` | Auto-push new leads to Emma on create |
| `app/api/leads/[id]/route.ts` | Auto-sync lead stage to Emma on update |
| `app/user/campaigns/page.tsx` | Rebuilt for Sendillo campaign workflow |
| `app/user/leads/page.tsx` | Bulk SMS modal wired to Sendillo campaign API |
| `components/layouts/Shell.tsx` | Added "Sendillo" to superadmin sidebar |

---

## Env Vars to Set on Railway

| Var | Where Used |
|-----|-----------|
| `EMMA_API_KEY` | `lib/emma/client.ts` — Emma AI API calls |
| `SENDILLO_API_KEY` | `lib/sendillo/client.ts` — Sendillo API calls |

---

## Single Source of Truth

**`supabase/schema.sql`** contains the full database schema including all Emma AI and Sendillo changes. For fresh setups, run this file entirely. For incremental updates, use the migration files.

**Migration files for incremental updates:**
- `supabase/migrations/003_emma_ai_schema.sql` — Emma AI schema
- `supabase/migrations/004_sendillo_schema_enum.sql` — Sendillo enum addition (run first)
- `supabase/migrations/004_sendillo_schema.sql` — Sendillo schema (run after enum)

---

## What's Still Pending

1. **Emma AI webhooks** — once Emma team delivers, build `POST /api/webhooks/emma/route.ts`
2. **AI draft generation** — wire Emma AI for message suggestions in `app/user/texts/page.tsx`
3. **Inbound message → Emma routing** — the `inbound.received` webhook pushes to `emma.createLead()` with "warm-lead" tag; may need refinement once Emma's inbound message API is confirmed
4. **iMessage/SMS/RCS channels** — pending Emma AI team
5. **Call recording/transcription/summary** — pending Emma AI team
