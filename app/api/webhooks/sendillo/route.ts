// app/api/webhooks/sendillo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
 findOrCreateLeadFromPhone,
 upsertConversation,
} from "@/lib/sendillo/lead-from-phone";

// POST /api/webhooks/sendillo
// Handles all Sendillo webhook events:
// inbound.received, message.delivered, message.sent, message.failed
//
// The handler matches messages via messages.id == payload.clientRef.
// (The send route sets clientRef to the message's UUID so this lookup works.)

export async function POST(req: NextRequest) {
 const body = await req.json().catch(() => null);
 if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

 const { event } = body;

 switch (event) {
 case "inbound.received":
 await handleInbound(body).catch((e) => console.error("[SendilloWebhook] inbound error:", e));
 break;
 case "message.delivered":
 await handleDelivered(body).catch((e) => console.error("[SendilloWebhook] delivered error:", e));
 break;
 case "message.sent":
 await handleSent(body).catch((e) => console.error("[SendilloWebhook] sent error:", e));
 break;
 case "message.failed":
 await handleFailed(body).catch((e) => console.error("[SendilloWebhook] failed error:", e));
 break;
 default:
 console.warn(`[SendilloWebhook] Unknown event: ${event}`);
 }

 return NextResponse.json({ ok: true });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKeyword(text: string): string {
 return text.trim().toUpperCase();
}

function matchKeyword(body: string, keywords: string[]): boolean {
 const normalized = normalizeKeyword(body);
 return keywords.some((kw) => {
 const pattern = new RegExp(`\\b${normalizeKeyword(kw)}\\b`, "i");
 return pattern.test(normalized);
 });
}

// Resolve the workspace for an inbound reply by looking up our Sendillo
// sender number ("to") in sendillo_phone_numbers. Returns null if the
// "to" number isn't registered for any workspace.
async function resolveWorkspaceForInbound(
 supabaseRaw: ReturnType<typeof createServiceSupabaseClient>,
 to: string
): Promise<string | null> {
 const supabase = supabaseRaw!;
 const toTail = to.replace(/\D/g, "").slice(-10);
 if (!toTail) return null;

 const { data: senderNumbers } = await supabase
 .from("sendillo_phone_numbers")
 .select("id, workspace_id, phone_number")
 .not("phone_number", "is", null)
 .eq("is_active", true)
 .limit(500);

 const sender = (senderNumbers ?? []).find((s: { phone_number: string }) => {
 const sp = (s.phone_number ?? "").replace(/\D/g, "").slice(-10);
 return sp && sp === toTail;
 });
 return sender?.workspace_id ?? null;
}

async function handleInbound(payload: InboundPayload) {
 const supabase = createServiceSupabaseClient()!;
 const { from, to, body: messageBody } = payload;

 // 1. Resolve the lead. Try matching an existing one in the workspace
 // identified by our "to" number. If no workspace can be resolved from
 // the "to" number, drop the event (we have no place to file the reply).
 const workspaceId = await resolveWorkspaceForInbound(supabase, to);
 if (!workspaceId) {
 console.warn(`[SendilloWebhook] inbound dropped: 'to' ${to} not registered to any workspace`);
 return;
 }

 const resolved = await findOrCreateLeadFromPhone(supabase, {
 workspaceId,
 phone: from,
 source: "sendillo_inbound",
 });
 if (!resolved) {
 console.warn(`[SendilloWebhook] inbound dropped: could not resolve or create lead for ${from}`);
 return;
 }
 const { lead, created } = resolved;

 if (created) {
 await logWebhook(supabase, workspaceId, "sendillo", "lead.auto_created", {
 from,
 to,
 phone: lead.phone,
 });
 }

 // 2. Find the most recent outbound SMS to this lead — used for
 // campaign attribution (opt-out + replied counts).
 const { data: outboundMsg } = await supabase
 .from("messages")
 .select("id, campaign_id, workspace_id")
 .eq("lead_id", lead.id)
 .eq("direction", "outbound")
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 let campaignId: string | null = null;
 let optoutKeywords: string[] = ["STOP", "UNSUBSCRIBE", "CANCEL"];

 if (outboundMsg?.campaign_id) {
 campaignId = outboundMsg.campaign_id;
 const { data: campaign } = await supabase
 .from("campaigns")
 .select("optout_keywords")
 .eq("id", campaignId)
 .maybeSingle();

 if (campaign?.optout_keywords?.length) {
 optoutKeywords = campaign.optout_keywords;
 }
 }

 // 3. Opt-out check (set lead.opted_out + bump campaign optout counter).
 if (matchKeyword(messageBody, optoutKeywords)) {
 await supabase
 .from("leads")
 .update({ opted_out: true, opted_out_at: new Date().toISOString() })
 .eq("id", lead.id);

 if (campaignId) {
 await supabase.rpc("increment_campaign_optout", { campaign_id: campaignId });
 }
 await logWebhook(supabase, workspaceId, "sendillo", "optout", payload);
 return;
 }

 // 4. Upsert the SMS conversation. Doing this BEFORE the message insert
 // means the new inbound row's conversation_id is set in one shot.
 const conv = await upsertConversation(supabase, {
 workspaceId,
 leadId: lead.id,
 channel: "sms",
 lastMessage: messageBody,
 incrementUnread: true,
 });
 if (!conv) {
 console.warn(`[SendilloWebhook] inbound: conversation upsert failed for lead ${lead.id}`);
 return;
 }

 // 5. Insert the inbound message with conversation_id already set.
 await supabase.from("messages").insert({
 workspace_id: workspaceId,
 lead_id: lead.id,
 conversation_id: conv.id,
 channel: "sms",
 direction: "inbound",
 body: messageBody,
 external_id: from,
 external_status: "received",
 provider: "sendillo",
 campaign_id: campaignId,
 sent_at: new Date().toISOString(),
 });

 // 6. Update lead last_message_at so the conversation list surfaces it.
 await supabase
 .from("leads")
 .update({ last_message_at: new Date().toISOString() })
 .eq("id", lead.id);

 // 7. Update campaign replied count.
 if (campaignId) {
 await supabase.rpc("increment_campaign_replied", { campaign_id: campaignId });
 }

 // 8. Log webhook.
 await logWebhook(supabase, workspaceId, "sendillo", "inbound.received", payload);
}

async function handleDelivered(payload: DeliveredPayload) {
 const supabase = createServiceSupabaseClient()!;
 const { clientRef } = payload;

 const msg = await findMessage(supabase, clientRef);

 if (!msg) {
 console.warn(`[SendilloWebhook] delivered: clientRef ${clientRef} not found in messages`);
 return;
 }

 const update: Record<string, unknown> = { external_status: "delivered" };
 if (payload.messageId) update.provider_message_id = payload.messageId;
 if (payload.price !== undefined) update.external_status_detail = `price=$${payload.price}`;

 await supabase.from("messages").update(update).eq("id", msg.id);

 if (msg.campaign_id) {
 await supabase.rpc("increment_campaign_delivered", { campaign_id: msg.campaign_id });
 }

 await logWebhook(supabase, msg.workspace_id, "sendillo", "message.delivered", payload);
}

async function handleSent(payload: SentPayload) {
 const supabase = createServiceSupabaseClient()!;
 const { clientRef } = payload;

 const msg = await findMessage(supabase, clientRef);

 if (!msg) {
 console.warn(`[SendilloWebhook] sent: clientRef ${clientRef} not found in messages`);
 return;
 }
 const update: Record<string, unknown> = { external_status: "sent" };
 if (payload.messageId) update.provider_message_id = payload.messageId;
 if (payload.price !== undefined) update.external_status_detail = `price=$${payload.price}`;
 await supabase.from("messages").update(update).eq("id", msg.id);
}

async function handleFailed(payload: FailedPayload) {
 const supabase = createServiceSupabaseClient()!;
 const { clientRef, error } = payload;

 const msg = await findMessage(supabase, clientRef);

 if (!msg) {
 console.warn(`[SendilloWebhook] failed: clientRef ${clientRef} not found in messages`);
 return;
 }

 const update: Record<string, unknown> = {
 external_status: "failed",
 external_error: error ?? "Unknown failure",
 };
 if (payload.messageId) update.provider_message_id = payload.messageId;
 if (payload.errorCode) update.external_error = `[${payload.errorCode}] ${error ?? "failure"}`;

 await supabase.from("messages").update(update).eq("id", msg.id);

 if (msg.campaign_id) {
 await supabase.rpc("increment_campaign_failed", { campaign_id: msg.campaign_id });
 }

 await logWebhook(supabase, msg.workspace_id, "sendillo", "message.failed", { ...payload, error });
}

// Look up a message by clientRef. Tries the raw value as id first, then strips
// any "revra-" prefix the older send handler added, and finally falls back to
// the provider_message_id column for completeness.
async function findMessage(
 supabase: ReturnType<typeof createServiceSupabaseClient>,
 clientRef: string
) {
 if (!supabase || !clientRef) return null;

 const { data: byId } = await supabase
 .from("messages")
 .select("id, campaign_id, workspace_id")
 .eq("id", clientRef)
 .maybeSingle();
 if (byId) return byId;

 const stripped = clientRef.replace(/^revra-/i, "");
 if (stripped !== clientRef) {
 const { data: byStripped } = await supabase
 .from("messages")
 .select("id, campaign_id, workspace_id")
 .eq("id", stripped)
 .maybeSingle();
 if (byStripped) return byStripped;
 }

 const { data: byProvider } = await supabase
 .from("messages")
 .select("id, campaign_id, workspace_id")
 .eq("provider_message_id", clientRef)
 .maybeSingle();
 return byProvider ?? null;
}

// ── Webhook logging ────────────────────────────────────────────────────────────

async function logWebhook(
 supabase: ReturnType<typeof createServiceSupabaseClient> | null,
 workspaceId: string | null,
 provider: string,
 eventType: string,
 payload: unknown
) {
 if (!supabase || !workspaceId) return;
 await supabase.from("webhooks_log").insert({
 workspace_id: workspaceId,
 provider,
 event_type: eventType,
 payload: payload as Record<string, unknown>,
 processed: true,
 processed_at: new Date().toISOString(),
 });
}

// ── Payload types ─────────────────────────────────────────────────────────────

interface InboundPayload {
 event: "inbound.received";
 from: string;
 to: string;
 body: string;
 timestamp: string;
}

interface DeliveredPayload {
 event: "message.delivered";
 to: string;
 clientRef: string;
 timestamp: string;
 messageId?: string;
 errorCode?: string;
 price?: number;
}

interface SentPayload {
 event: "message.sent";
 to: string;
 clientRef: string;
 timestamp: string;
 messageId?: string;
 price?: number;
}

interface FailedPayload {
 event: "message.failed";
 to: string;
 clientRef: string;
 error: string;
 timestamp: string;
 messageId?: string;
 errorCode?: string;
}