# Plan: Separate SMS Campaigns and Email Campaigns; add single-person email send

## Context

The current `/user/campaigns` page is one route with an in-page SMS/Email tab switcher (`ChannelTabs`). The two channels are visually distinct already (cyan vs violet), but they're crammed into the same shell — same header, same "New Campaign" button, same wizard modal slot. The result is awkward: when the user is on Email, they still see "SMS Campaigns via Sendillo" copy in the header, and switching channels re-renders the entire view from inside the same page state.

The user wants:
1. **Two visually separate sections** — each with its own page, header, KPIs, list, and wizard. No in-page tab switcher.
2. **Single-person email send** — the ability to email one lead without going through the bulk campaign flow. Reachable from the email section header and from the conversations list (so agents can fire off a one-off follow-up email while chatting with a contact).

The existing API surface (`/api/campaigns/email`, `/api/campaigns/email/[id]/send`, `/api/sendgrid/config`) is reusable for bulk. We only need a new endpoint for the single-send case.

## Approach

Split the campaigns page into **two routes**:
- `/user/campaigns` — SMS only (cyan, Megaphone icon stays)
- `/user/campaigns/email` — Email only (violet, Mail icon)

Add a second sidebar entry "Email Campaigns" right under "Campaigns" so each section stands alone. Reuse the existing `EmailCampaignWizard` and the `EmailCampaignsView` block — they just become the entire `/user/campaigns/email` page now instead of a tab.

For single-person email: add a small **quick-compose modal** triggered from two entry points:
- A "Send Email" button in the email campaigns page header.
- A per-lead email icon in the conversations list left rail (next to the existing call `Phone` icon).

The modal pre-selects the lead (or lets you pick one), lets you pick a template or write custom subject + html, and sends immediately via a new `POST /api/sendgrid/send-single` endpoint. The endpoint reuses the existing `sendEmail()` helper from [lib/sendgrid/client.ts:108](lib/sendgrid/client.ts#L108), persists a `messages` row tagged `channel: "email"`, and returns the result. Failures bubble up as toast + inline error.

### Files to create / modify

| File | Change |
|------|--------|
| [app/user/campaigns/page.tsx](app/user/campaigns/page.tsx) | Strip all email-related state, handlers, and the `EmailCampaignsView` inline block. Drop the `ChannelTabs` import and `Channel` import. The page becomes SMS-only. |
| **NEW** [app/user/campaigns/email/page.tsx](app/user/campaigns/email/page.tsx) | Move the email-related state (`emailCampaigns`, `loadingEmail`, `showEmailWizard`, `sendingEmailId`, `emailError`, `senderEmail`, `senderName`) and handlers (`fetchEmailCampaigns`, `sendEmailCampaign`, `pauseResumeEmail`, `deleteEmailCampaign`) into a new top-level client page. Add a new "Send Single Email" button in the header. |
| **NEW** [components/features/campaigns/SingleEmailComposer.tsx](components/features/campaigns/SingleEmailComposer.tsx) | Quick-compose modal: lead picker (search by name/email), template selector (reuse `EMAIL_TEMPLATES`), subject + html inputs with live preview, "Send" button. Calls `POST /api/sendgrid/send-single`. |
| **NEW** [app/api/sendgrid/send-single/route.ts](app/api/sendgrid/send-single/route.ts) | Single-recipient email endpoint. Validates lead belongs to workspace, looks up `email`, calls `sendEmail()` from `lib/sendgrid/client.ts`, persists a `messages` row with `channel: "email"`, returns `{ success, messageId }` or error. |
| [app/user/conversations/page.tsx](app/user/conversations/page.tsx) | Add a `Mail` icon button next to the existing `Phone` icon in each conversation list row. Opens `SingleEmailComposer` modal pre-populated with that lead's email. |
| [components/layouts/Shell.tsx](components/layouts/Shell.tsx) | Add a second sidebar entry under `Campaigns`: `{ label: "Email Campaigns", href: "/user/campaigns/email", icon: <Mail size={17} /> }`. |

### Why this scope

- **Two routes is the cleanest separation** — each page has its own URL (shareable, bookmarkable, sidebar active state is obvious). No shared `useState`, no conditional rendering of two views.
- **Reuse the email view code** — the existing `EmailCampaignsView` function (currently inlined in the SMS page) moves verbatim into the new `/user/campaigns/email/page.tsx`. Only the chrome (Shell, header, sidebar highlight) changes.
- **Reuse the email wizard** — `EmailCampaignWizard` already accepts `open`/`onClose`/`onCreated` and is renderable from anywhere. The new email page mounts it the same way the SMS page does today.
- **Single-send is a thin new endpoint** — `sendEmail()` already handles personalization (merge tags), reply-to, and tracking. We only add the route + a row in `messages` table + a UI modal.

## /user/campaigns (SMS only) — page changes

Remove from the page:
- `activeChannel` state, `ChannelTabs` import, `handleChannelChange`
- `emailCampaigns`, `loadingEmail`, `showEmailWizard`, `sendingEmailId`, `emailError`, `senderEmail`, `senderName` state
- `fetchEmailCampaigns`, `fetchSenderInfo`, `sendEmailCampaign`, `pauseResumeEmail`, `deleteEmailCampaign` handlers
- `<ChannelTabs>` block in JSX
- The `activeChannel === "email" && <EmailCampaignsView ...>` block
- The `<EmailCampaignWizard>` mount
- The `EmailCampaignsView` function definition at the bottom of the file
- The unused `Mail`, `Inbox` lucide imports

Keep everything else (the SMS KPI row, status tabs, SMS campaign list, the in-page wizard modal for SMS, all handlers for SMS campaigns). Update the header copy from `"Bulk SMS campaigns via Sendillo — ..."` to just `"Bulk SMS campaigns — send, track replies, and route warm leads to Emma AI."` (drop the conditional ternary now that there's no channel switcher).

## /user/campaigns/email — new page

A near-clone of the current `EmailCampaignsView` + the surrounding chrome:

- `Shell role="user"`, padding `32px 40px`
- Header: title "Email Campaigns", subtitle "Bulk email campaigns via SendGrid — design, send, and track open/click rates."
- Header actions: refresh button + **two** CTAs — `"New Campaign"` (opens `EmailCampaignWizard`) and a new `"Send Single Email"` button (opens `SingleEmailComposer`)
- KPI row: Total Sent, Delivery Rate, Open Rate, Opt-Outs (unchanged)
- Campaign list (the `EmailCampaignsView` JSX, inlined)
- `EmailCampaignWizard` mount for new campaigns
- `SingleEmailComposer` mount for one-off sends
- Error toast block (unchanged)

## SingleEmailComposer modal

State:
- `leadQuery` (search string), `selectedLeadId`, `leads[]` (loaded on open from `/api/leads?limit=500`)
- `mode` (`template` | `custom`)
- `templateId`, `subject`, `htmlBody`
- `sending`, `error`

UI: a 720px-wide modal matching the rest of the design system (`surface` bg, `line` border, `radius-2xl`, blur backdrop). Steps collapsed into one screen since it's a quick action:
1. **Lead picker** — typeahead, shows name + email. Locked once selected (or show "change" button).
2. **Subject + body** — text inputs + a small template dropdown + the same `EmailPreview` panel used by the wizard (live preview).
3. **Send** button at the bottom right.

Submission: `POST /api/sendgrid/send-single` with `{ lead_id, subject, html_body, template_id? }`. On success, close modal + show toast. On failure, show inline error and keep the modal open so the user can retry.

Validation:
- Lead must belong to the workspace
- Lead must have a valid `email` (else show error: "This lead has no email on file")
- Subject and html body must be non-empty after trim

## POST /api/sendgrid/send-single — endpoint

Mirrors [app/api/campaigns/email/[id]/send/route.ts](app/api/campaigns/email/[id]/send/route.ts) but for a single recipient:

1. Auth + workspace lookup (same as everywhere)
2. Read body: `{ lead_id, subject, html_body, template_id? }`
3. Load lead by `lead_id` + `workspace_id`; 404 if missing, 400 if no `email`
4. Skip opted-out check with a soft warning — opted-out leads block bulk campaigns but for a one-off it's reasonable to send. (User can override if needed; for now just allow and persist.)
5. Resolve body: template_id → `getTemplateById(id).html`, else `html_body` raw
6. Apply merge tags with `renderMergeTags` (uses agent name + lead first/last)
7. Pre-allocate a `messages` row with `id = crypto.randomUUID()`, `channel: "email"`, `direction: "outbound"`, `external_status: "pending"`
8. Call `sendEmail({ to: lead.email, subject: personalizedSubject, html, messageId: row.id, workspaceId, campaignId: "single" })`
9. Update the row: `external_id = result.messageId`, `external_status = result.success ? "sent" : "failed"`
10. Return `{ success: true, messageId, status: "sent" }` or 4xx/5xx on failure

No new env vars needed — `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` / `SENDGRID_FROM_NAME` are already required.

## Conversations page — per-lead "Send Email" button

In the left-rail conversation list rows ([app/user/conversations/page.tsx:427-520](app/user/conversations/page.tsx#L427-L520)), the current code only shows lead info. The "Send Email" affordance belongs in the **chat header** ([app/user/conversations/page.tsx:579-586](app/user/conversations/page.tsx#L579-L586)) next to the existing `Phone` icon — that's where actions on the active lead already live (the existing `Phone` icon is also placed there, not in each row). Mount `SingleEmailComposer` at the page root with `selectedLeadId={activeId}` so opening from the chat header pre-fills the active lead.

Add to imports: `Mail` from `lucide-react`. Add a `<button className="btn-icon p-2" title="Send email" onClick={() => setShowEmailComposer(true)} disabled={!currentLead?.email}>` next to the phone icon, with a tooltip explaining the lead has no email when `!currentLead?.email`.

The `disabled={!currentLead?.email}` matches the existing pattern (the phone icon also disables when `!currentLead.phone`).

## Shell sidebar — second nav entry

In [components/layouts/Shell.tsx:47-63](components/layouts/Shell.tsx#L47-L63), add to `userNav`:
```ts
{ label: "Email Campaigns", href: "/user/campaigns/email", icon: <Mail size={17} /> },
```
Import `Mail` from `lucide-react`. Place it directly under `Campaigns` so the two related entries are visually grouped.

## Verification

1. `npm run build` — confirm both routes compile and no orphaned imports remain.
2. Manual walk-through:
 - Visit `/user/campaigns` — see SMS campaigns only, no email-related chrome.
 - Visit `/user/campaigns/email` — see email campaigns only, with two header buttons (`New Campaign`, `Send Single Email`).
 - Click `Send Single Email`, pick a lead, pick a template, send. Confirm toast + the lead receives the email.
 - From `/user/conversations`, open a contact, click the new mail icon, confirm the modal opens with that lead pre-selected, send.
3. Smoke check: verify both routes return 200 on `/user/campaigns` and `/user/campaigns/email`.

## Risks / notes

- **No data model changes** — `messages.channel` enum already includes `'email'`; `campaigns.channel` already accepts `'email'`. No migration needed.
- **Single-send does not create a campaign row** — it's a one-off `messages` insert. If the user later wants to see a "single sends" log, that's a follow-up.
- **Opt-out for single send** — current bulk flow blocks opted-out leads; the single send allows it (it's a deliberate 1:1 action, not bulk marketing). Could be tightened later by adding an `opted_out` check if the team prefers.
- **Sidebar crowding** — the nav already has 14 items. Adding one more brings it to 15. Acceptable for the requested grouping, but the team may want a "grouped" sidebar later (separate icon row for Campaigns vs Email). Out of scope for this change.