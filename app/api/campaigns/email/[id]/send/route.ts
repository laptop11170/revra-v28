// app/api/campaigns/email/[id]/send/route.ts
// POST /api/campaigns/email/[id]/send — send a draft/scheduled email campaign

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
 sendBulkEmail,
 SendGridAPIError,
 getSendGridConfig,
} from "@/lib/sendgrid/client";
import { renderMergeTags } from "@/lib/sendgrid/templates";

const SEND_TIMEOUT_MS = 30_000;
const CONCURRENCY = 5;

export async function POST(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("id, workspace_id, full_name")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

 // Validate SendGrid
 let sendgridCfg;
 try {
 sendgridCfg = getSendGridConfig();
 } catch (e) {
 if (e instanceof SendGridAPIError) {
 return NextResponse.json({ error: e.message }, { status: 503 });
 }
 throw e;
 }

 const { id } = await params;

 // Load campaign
 const { data: campaign, error: cErr } = await supabase
 .from("campaigns")
 .select("*")
 .eq("id", id)
 .eq("workspace_id", user.workspace_id)
 .eq("channel", "email")
 .single();

 if (cErr || !campaign) {
 return NextResponse.json({ error: "Email campaign not found" }, { status: 404 });
 }

 if (campaign.status !== "draft" && campaign.status !== "scheduled") {
 return NextResponse.json(
 { error: "Campaign must be draft or scheduled to send" },
 { status: 400 }
 );
 }

 if (!campaign.subject || !campaign.html_body) {
 return NextResponse.json(
 { error: "Campaign is missing subject or html_body" },
 { status: 400 }
 );
 }

 // Load only the leads that were enrolled at campaign-creation time, joined
 // through the campaign_leads pivot table. This is the bug fix — previously
 // this query loaded all leads in the workspace.
 const { data: enrolled, error: lErr } = await supabase
 .from("campaign_leads")
 .select(`
 lead:leads!inner ( id, email, first_name, last_name, opted_out )
 `)
 .eq("campaign_id", id);

 if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

 // Flatten the join and re-apply the safety filters in case a lead opted out
 // or lost their email between create and send.
 type LeadRow = { id: string; email: string | null; first_name: string | null; last_name: string | null; opted_out: boolean };
 const leads: LeadRow[] = (enrolled ?? [])
 .map((row: any) => row.lead as LeadRow | null)
 .filter((l): l is LeadRow => !!l && !l.opted_out && !!l.email && l.email.includes("@"));

 if (leads.length === 0) {
 return NextResponse.json(
 { error: "This campaign has no enrolled leads. Delete it and recreate with the leads you want to email." },
 { status: 400 }
 );
 }

 // Pre-allocate one messages row per recipient — we need the IDs to put in customArgs
 const messageRows = leads.map((l) => ({
 id: crypto.randomUUID(),
 workspace_id: user.workspace_id,
 lead_id: l.id,
 agent_id: campaign.created_by ?? user.id,
 campaign_id: campaign.id,
 channel: "email" as const,
 direction: "outbound" as const,
 body: campaign.subject ?? "",
 external_status: "pending",
 sent_at: new Date().toISOString(),
 }));
 const { error: msgInsertErr } = await supabase.from("messages").insert(messageRows);
 if (msgInsertErr) {
 return NextResponse.json({ error: msgInsertErr.message }, { status: 500 });
 }

 // Build the bulk send queue
 const items = messageRows.map((row, i) => {
 const lead = leads[i];
 const personalized = renderMergeTags(campaign.html_body ?? "", {
 first_name: lead.first_name ?? "",
 last_name: lead.last_name ?? "",
 agent_name: user.full_name ?? "Your RevRa Advisor",
 });
 const personalizedSubject = renderMergeTags(campaign.subject ?? "", {
 first_name: lead.first_name ?? "",
 last_name: lead.last_name ?? "",
 agent_name: user.full_name ?? "Your RevRa Advisor",
 });
 return {
 to: lead.email!,
 subject: personalizedSubject,
 html: personalized,
 campaignId: campaign.id,
 messageId: row.id,
 workspaceId: user.workspace_id,
 clientRef: row.id,
 };
 });

 // Hard cap — refuse to send more than 10,000 in one call to keep this endpoint responsive
 if (items.length > 10_000) {
 return NextResponse.json(
 { error: `Refusing to send more than 10,000 emails in one call. Got ${items.length}.` },
 { status: 400 }
 );
 }

 // Race the send against a 30s timeout — if it times out we still return the queued count
 const sendPromise = sendBulkEmail(items, { concurrency: CONCURRENCY });
 const timeoutPromise = new Promise<{ timedOut: true }>((resolve) =>
 setTimeout(() => resolve({ timedOut: true }), SEND_TIMEOUT_MS)
 );

 let result: Awaited<typeof sendPromise> | { timedOut: true };
 try {
 result = await Promise.race([sendPromise, timeoutPromise]);
 } catch (err) {
 if (err instanceof SendGridAPIError) {
 return NextResponse.json({ error: err.message }, { status: 502 });
 }
 throw err;
 }

 if ("timedOut" in result) {
 // Partial send — return what we know
 await supabase
 .from("campaigns")
 .update({ status: "active", sent: items.length })
 .eq("id", campaign.id);
 return NextResponse.json({
 campaign_id: campaign.id,
 queued: 0,
 failed: 0,
 skipped: 0,
 timed_out: true,
 message: "Send still in progress; check back shortly for delivery stats.",
 });
 }

 // Update per-message status from results
 if (result.results.length > 0) {
 // Batch update in chunks of 100
 const updates = result.results
 .filter((r) => r.messageId)
 .map((r) =>
 supabase
 .from("messages")
 .update({
 external_id: r.messageId,
 external_status: r.success ? "pending" : "failed",
 })
 .eq("id", r.clientRef)
 );
 await Promise.all(updates);
 }

 // Update campaign counters
 await supabase
 .from("campaigns")
 .update({
 status: "active",
 sent: result.successful,
 failed: result.failed,
 last_sent_at: new Date().toISOString(),
 })
 .eq("id", campaign.id);

 return NextResponse.json({
 campaign_id: campaign.id,
 queued: result.successful,
 failed: result.failed,
 skipped: 0,
 total: result.total,
 });
}
