# Plan: Email campaign respects selected leads (fix "sends to all" bug)

## Context

When a user selects 1 or 2 leads in the **Email Campaign wizard** (step 2 — "Choose Audience") and clicks **Launch**, the SendGrid API is actually called for **every lead in the workspace** that has a valid email — not just the selected ones.

The dashboard row correctly shows "2 leads" / "1 leads" (the count is stored on the campaign), but every recipient with an email gets the email.

### Root cause

The bug is on the **backend**, not the frontend:

1. **Wizard** ([components/features/campaigns/EmailCampaignWizard.tsx:208](components/features/campaigns/EmailCampaignWizard.tsx#L208)) sends `lead_ids: leadIds` (the selected IDs only) to `POST /api/campaigns/email`. ✅ Correct.
2. **Create endpoint** ([app/api/campaigns/email/route.ts:99-112](app/api/campaigns/email/route.ts#L99-L112)) filters `lead_ids` down to valid leads and stores the **count** in the `campaigns.leads` column. But it **does not** insert into the `campaign_leads` pivot table. The comment at line 137-138 says "we skip the pivot table — the send endpoint uses a separate query." ❌
3. **Send endpoint** ([app/api/campaigns/email/[id]/send/route.ts:73-83](app/api/campaigns/email/[id]/send/route.ts#L73-L83)) loads **all** non-opted-out leads with a valid email in the workspace:
 ```ts
 const { data: leads } = await supabase
 .from("leads")
 .select("id, email, first_name, last_name")
 .eq("workspace_id", user.workspace_id)
 .eq("opted_out", false)
 .not("email", "is", null)
 .ilike("email", "%@%");
 ```
 No reference to the campaign's audience — it always sends to everyone.

### The pivot table already exists

[supabase/migrations/010_csv_import_support.sql:13-23](supabase/migrations/010_csv_import_support.sql#L13-L23) already created:
```sql
CREATE TABLE IF NOT EXISTS campaign_leads (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 status TEXT DEFAULT 'pending',
 sent_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT NOW(),
 UNIQUE(campaign_id, lead_id)
);
```

with RLS already enabled and a workspace-scoping policy. Nobody is using it. The fix is to wire it up.

## Approach

Two surgical edits in the backend:

1. **Create endpoint** ([app/api/campaigns/email/route.ts](app/api/campaigns/email/route.ts)): after the campaign is inserted, insert one row into `campaign_leads` per valid lead. Wrap in a transaction-like batch insert (Supabase JS client supports `.insert([...])` with one network round trip).
2. **Send endpoint** ([app/api/campaigns/email/[id]/send/route.ts](app/api/campaigns/email/[id]/send/route.ts)): replace the "load all leads" query with a join through `campaign_leads`. If the campaign has zero `campaign_leads` rows (e.g. an old campaign created before this fix), refuse to send with a clear error — better than silently sending to everyone.

### Why this approach

- **The pivot table is already there** — schema, indexes, RLS, and `UNIQUE(campaign_id, lead_id)` are all in place. Zero migration work.
- **Service-role client bypasses RLS** — the endpoint uses `createServiceSupabaseClient()` which uses `SUPABASE_SERVICE_ROLE_KEY`, so we can insert directly. The workspace-scoping is enforced by the `leads.workspace_id` filter we already do in the create handler.
- **Backward compat is clean** — old campaigns (created before this fix) have no `campaign_leads` rows. By refusing to send those, we avoid the worst outcome (still spamming everyone). Operators can either delete those drafts or manually backfill the pivot table.
- **No frontend changes needed** — the wizard already sends `lead_ids`. The page already shows the audience count. Stats endpoint already reads `messages` table rows, which will only have entries for the actually-sent leads.

### Files to modify

| File | Change |
|------|--------|
| [app/api/campaigns/email/route.ts](app/api/campaigns/email/route.ts) | After successful campaign insert (~line 135), insert one `campaign_leads` row per `validLeadIds` entry. Drop the "we skip the pivot table" comment. |
| [app/api/campaigns/email/[id]/send/route.ts](app/api/campaigns/email/[id]/send/route.ts) | Replace the "load all leads" query (~lines 73-83) with a join through `campaign_leads`. Error out (400) if the campaign has zero enrolled leads. Drop the "for v1 we use ALL non-opted-out leads" comment. |

No frontend changes. No new env vars. No migration.

## Detailed changes

### Create endpoint — `app/api/campaigns/email/route.ts`

After the existing campaign insert succeeds and before the `return NextResponse.json({ campaign }, { status: 201 })`, add a batch insert:

```ts
// Enroll selected leads in campaign_leads (pivot table already exists in schema)
if (validLeadIds.length > 0) {
 const enrollRows = validLeadIds.map((leadId) => ({
 campaign_id: campaign.id,
 lead_id: leadId,
 status: "pending" as const,
 }));
 const { error: enrollErr } = await supabase
 .from("campaign_leads")
 .insert(enrollRows);
 if (enrollErr) {
 console.error("[EmailCampaign] campaign_leads insert failed:", enrollErr);
 // The campaign row exists; surface the error so the wizard can retry.
 return NextResponse.json({ error: enrollErr.message }, { status: 500 });
 }
}
```

Notes:
- `UNIQUE(campaign_id, lead_id)` prevents duplicates if the wizard ever sends the same lead twice in one call.
- We don't pre-check existence; the FK constraints + the `validLeadIds` filter already guarantee valid IDs.
- If `enrollErr` happens, we surface 500 rather than rolling back. The campaign row exists but has zero enrolled leads, which the send endpoint will then refuse. That's the desired behavior — no silent send-to-all fallback.

### Send endpoint — `app/api/campaigns/email/[id]/send/route.ts`

Replace this block (lines 73-83 area):

```ts
// Find leads — for v1 we use ALL non-opted-out leads with a valid email
// (later we can add a campaign_leads pivot table)
const { data: leads, error: lErr } = await supabase
 .from("leads")
 .select("id, email, first_name, last_name")
 .eq("workspace_id", user.workspace_id)
 .eq("opted_out", false)
 .not("email", "is", null)
 .ilike("email", "%@%");
```

with:

```ts
// Load only the leads that were selected at campaign-creation time,
// joined through the campaign_leads pivot table.
const { data: leads, error: lErr } = await supabase
 .from("campaign_leads")
 .select(`
 lead:leads!inner ( id, email, first_name, last_name, opted_out )
 `)
 .eq("campaign_id", campaign.id);

// Flatten and re-apply the safety filters (opted_out, valid email)
const flatLeads = (leads ?? [])
 .map((row: any) => row.lead)
 .filter((l: any) => l && !l.opted_out && l.email && l.email.includes("@"));

if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });
if (flatLeads.length === 0) {
 return NextResponse.json(
 { error: "This campaign has no enrolled leads. Delete it and recreate with the leads you want to email." },
 { status: 400 }
 );
}

// Use flatLeads everywhere `leads` is referenced below
const leads = flatLeads;
```

Notes:
- The `!inner` join enforces that the lead row must exist; if a lead was deleted after campaign creation, the row is silently dropped (FK cascade from leads.id handles it).
- Re-checking `opted_out` and email validity in code is defensive — handles the case where a lead opted out or lost their email between create and send.
- The "campaign has no enrolled leads" error is the safety net for legacy campaigns. After this fix, all NEW campaigns will have enrolled leads (because the wizard requires at least 1 lead to advance). Old campaigns will hit this and need to be recreated.

## Verification

1. `npm run build` — confirm both routes still typecheck and compile.
2. Manual test:
 - Create a new email campaign with **1 lead** selected.
 - Click Launch.
 - Confirm only 1 email was queued/sent in SendGrid's activity feed (not all leads).
 - Confirm the dashboard's "Total Sent" counter increments by 1, not by the total workspace count.
3. Repro the legacy case: try to Launch any of the 3 pre-existing campaigns ("Testing email", "Testcrm", "Testing"). Expect a 400 error toast: "This campaign has no enrolled leads. Delete it and recreate with the leads you want to email." If you want them functional without manual data entry, delete them and recreate via the wizard.
4. Edge case: create a campaign with 2 leads, then mark one as opted-out before sending. Send should go to 1 lead (the non-opted-out one).
5. Edge case: create a campaign with 2 leads, then delete one of those leads. Send should go to 1 lead (the surviving one — pivot row is FK-cascaded out automatically).

## Risks / notes

- **No data loss** — this is a pure-correction change. Existing campaigns stay in their current state. If you send one, you get a clear error instead of an unintended broadcast.
- **Existing campaigns need to be recreated** — the 3 campaigns in the screenshot ("Testing email" with 2 leads, "Testcrm" with 1 lead, "Testing" with 1 lead) have no `campaign_leads` rows. The safest path is to delete them and recreate via the wizard. If you want to preserve them, I can add a one-shot backfill that creates `campaign_leads` rows from the campaign's `leads` count + a query — but there's no source-of-truth list, so any backfill is a guess. Delete-and-recreate is the right call.
- **SMS send endpoint has the same bug shape** — [app/api/campaigns/[id]/send/route.ts:54-60](app/api/campaigns/[id]/send/route.ts#L54-L60) also loads all leads and ignores the request body's `lead_ids`. **Out of scope** for this fix (the user only reported email), but flagged here so it can be tracked separately.
- **Stats endpoint needs no change** — [app/api/campaigns/email/[id]/stats/route.ts](app/api/campaigns/email/[id]/stats/route.ts) reads from `messages`, which only has rows for the actually-sent leads.
- **No new env vars, no migration** — uses existing schema.