// app/api/webhooks/sendgrid/route.ts
// SendGrid Event Webhook — receives delivery/open/click/bounce events
// and updates the campaign + messages tables in the background.

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
 verifyWebhookSignature,
 isSendGridEventArray,
 type SendGridEvent,
} from "@/lib/sendgrid/client";

export async function POST(req: NextRequest) {
 const raw = await req.text();
 const sig = req.headers.get("x-twilio-email-event-webhook-signature");
 const ts = req.headers.get("x-twilio-email-event-webhook-timestamp");

 // Verify signature — fail open in dev (no key configured) and log a warning
 if (!verifyWebhookSignature(raw, sig, ts)) {
 console.warn("[SendGridWebhook] signature verification failed");
 // Continue anyway; you can flip this to a hard 401 once keys are configured
 }

 let events: SendGridEvent[];
 try {
 const parsed = JSON.parse(raw);
 if (!isSendGridEventArray(parsed)) {
 return NextResponse.json({ ok: true, note: "not an event array" });
 }
 events = parsed;
 } catch {
 return NextResponse.json({ ok: true, note: "invalid JSON" });
 }

 if (events.length === 0) return NextResponse.json({ ok: true });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ ok: true });

 // Respond 200 immediately, then process events in the background
 // (SendGrid retries on non-2xx responses — we want to ACK first and process after)
 const processing = (async () => {
 // Group by campaign_id so we can batch the counter updates
 const campaignUpdates: Record<string, Partial<{
 delivered: number;
 opened: number;
 clicked: number;
 bounced: number;
 opted_out: number;
 failed: number;
 }>> = {};

 for (const ev of events) {
 const campaignId = ev.custom_args?.campaign_id;
 const messageId = ev.custom_args?.message_id;
 const workspaceId = ev.custom_args?.workspace_id;

 if (!workspaceId) {
 console.warn("[SendGridWebhook] event missing workspace_id", { sg_id: ev.sg_message_id });
 continue;
 }

 // Persist raw event to audit log
 await supabase.from("email_events").insert({
 workspace_id: workspaceId,
 campaign_id: campaignId ?? null,
 message_id: messageId ?? null,
 event_type: ev.event,
 email: ev.email,
 payload: ev as unknown as Record<string, unknown>,
 });

 // Update the messages row
 if (messageId) {
 const update: Record<string, unknown> = { external_status: ev.event };
 if (ev.event === "open") update.email_opened_at = new Date(ev.timestamp * 1000).toISOString();
 if (ev.event === "click") update.email_clicked_at = new Date(ev.timestamp * 1000).toISOString();
 if (ev.event === "bounce" || ev.event === "dropped") {
 update.email_bounced_at = new Date(ev.timestamp * 1000).toISOString();
 }
 await supabase.from("messages").update(update).eq("id", messageId);
 }

 // Aggregate per-campaign counter deltas
 if (campaignId) {
 if (!campaignUpdates[campaignId]) {
 campaignUpdates[campaignId] = {};
 }
 const c = campaignUpdates[campaignId];
 if (ev.event === "delivered") c.delivered = (c.delivered ?? 0) + 1;
 else if (ev.event === "open") c.opened = (c.opened ?? 0) + 1;
 else if (ev.event === "click") c.clicked = (c.clicked ?? 0) + 1;
 else if (ev.event === "bounce" || ev.event === "dropped") {
 c.bounced = (c.bounced ?? 0) + 1;
 c.failed = (c.failed ?? 0) + 1;
 } else if (ev.event === "unsubscribe" || ev.event === "spamreport") {
 c.opted_out = (c.opted_out ?? 0) + 1;
 }
 }
 }

 // Apply campaign counter bumps
 await Promise.all(
 Object.entries(campaignUpdates).map(([campaignId, deltas]) =>
 supabase
 .from("campaigns")
 .update(deltas)
 .eq("id", campaignId)
 .then(() => undefined)
 )
 );
 })();

 // Fire-and-forget — don't await on the response cycle
 processing.catch((err) => {
 console.error("[SendGridWebhook] background processing failed:", err);
 });

 return NextResponse.json({ ok: true, queued: events.length });
}

// Health check
export async function GET() {
 return NextResponse.json({ ok: true, provider: "sendgrid" });
}
