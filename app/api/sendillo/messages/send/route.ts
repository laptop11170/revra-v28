// app/api/sendillo/messages/send/route.ts
// POST /api/sendillo/messages/send
// Send a 1-to-1 SMS from one of the workspace's registered Sendillo numbers
// to any E.164 destination (e.g. +91XXXXXXXXXX for India, +1… for US/Canada).
//
// Flow:
// 1. Auth user, find their workspace
// 2. Verify the requested `from` number is registered for the workspace + active
// 3. Validate the `to` number (basic E.164 sanity check)
// 4. POST to Sendillo /api/v1/messages with { from, to, body, clientRef }
// 5. Persist a row in `messages` so the Sendillo page log shows it immediately
// 6. Best-effort link to a lead by phone, upsert the SMS conversation
//
// Webhooks from Sendillo (message.sent, message.delivered, message.failed)
// will later update external_status via app/api/webhooks/sendillo/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { sendSMS, SendilloAPIError } from "@/lib/sendillo/client";
import {
 findOrCreateLeadFromPhone,
 upsertConversation,
} from "@/lib/sendillo/lead-from-phone";

const E164 = /^\+[1-9]\d{6,14}$/;

// Coerce a possibly-messy value into E.164. Used as defense in depth —
// the sendillo_phone_numbers table has historically stored numbers with
// inconsistent formats ("+1407…", "1407…", "+1 407 …").
function coerceE164(raw: string): string {
 const cleaned = raw.trim().replace(/[\s\-()]/g, "");
 if (cleaned.startsWith("+")) return cleaned;
 if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
 if (/^1\d{10}$/.test(cleaned)) return `+${cleaned}`;
 return cleaned;
}

export async function POST(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace" }, { status: 404 });
 }

 const body = await req.json().catch(() => null);
 if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

 const from = coerceE164((body.from ?? "").toString());
 const to = (body.to ?? "").toString().trim().replace(/[\s\-()]/g, "");
 const text = (body.body ?? "").toString().trim();

 if (!E164.test(from)) {
 return NextResponse.json(
 { error: "Invalid 'from' number. Must be E.164 (e.g. +15551234567)." },
 { status: 400 }
 );
 }
 if (!E164.test(to)) {
 return NextResponse.json(
 { error: "Invalid 'to' number. Must be E.164 with country code (e.g. +91XXXXXXXXXX for India, +1XXXXXXXXXX for US)." },
 { status: 400 }
 );
 }
 if (!text) {
 return NextResponse.json({ error: "Message body is required" }, { status: 400 });
 }
 if (text.length > 1600) {
 return NextResponse.json({ error: "Message too long (max 1600 chars)." }, { status: 400 });
 }

 // 1) Verify the from-number belongs to this workspace and is active.
 // Compare by last-10-digits because stored values may not have "+1".
 const fromTail = from.replace(/^\+/, "").slice(-10);
 const { data: senderCandidates, error: phoneErr } = await supabase
 .from("sendillo_phone_numbers")
 .select("id, phone_number, label, is_active, agent_id")
 .eq("workspace_id", user.workspace_id);

 if (phoneErr) {
 return NextResponse.json({ error: phoneErr.message }, { status: 500 });
 }

 const senderPhone = (senderCandidates ?? []).find((p) => {
 const pTail = (p.phone_number ?? "").replace(/\D/g, "").slice(-10);
 return pTail && pTail === fromTail;
 });

 if (!senderPhone) {
 return NextResponse.json(
 { error: "That sender number is not registered for your workspace. Ask your superadmin to register it." },
 { status: 403 }
 );
 }
 if (!senderPhone.is_active) {
 return NextResponse.json(
 { error: "That sender number is inactive. Activate it from the admin page first." },
 { status: 403 }
 );
 }

 // 2) Resolve a lead for the destination phone. Match an existing lead
 // by last-10-digits, or auto-create a "Dialed Contact" lead so the
 // outbound has a real lead_id (and the eventual inbound reply can be
 // linked back to the same conversation).
 const resolvedLead = await findOrCreateLeadFromPhone(supabase, {
 workspaceId: user.workspace_id,
 phone: to,
 source: "sendillo_outbound",
 });

 if (!resolvedLead) {
 return NextResponse.json(
 { error: "Could not resolve or create a lead for that destination phone." },
 { status: 500 }
 );
 }

 const matchedLead = resolvedLead.lead;

 if (matchedLead.opted_out) {
 return NextResponse.json(
 { error: "This contact has opted out of SMS. Remove the opt-out flag or choose a different recipient." },
 { status: 400 }
 );
 }

 // 3) Upsert the SMS conversation. Doing this before the message insert
 // means we can write `conversation_id` directly in the message row —
 // no follow-up UPDATE needed.
 const conv = await upsertConversation(supabase, {
 workspaceId: user.workspace_id,
 leadId: matchedLead.id,
 channel: "sms",
 lastMessage: text,
 // Outbound from us — no unread increment.
 incrementUnread: false,
 });

 if (!conv) {
 return NextResponse.json(
 { error: "Could not upsert conversation thread." },
 { status: 500 }
 );
 }

 // 4) Generate a clientRef so Sendillo webhooks can update this row.
 // IMPORTANT: clientRef must equal messages.id so the webhook handler's
 // .eq("id", clientRef) lookup matches.
 const messageId = crypto.randomUUID();
 const clientRef = messageId;

 // 5) Send via Sendillo.
 let sendOk = true;
 let sendError: string | null = null;
 try {
 await sendSMS({ from, to, body: text, clientRef });
 } catch (err: unknown) {
 sendOk = false;
 if (err instanceof SendilloAPIError) {
 sendError = err.message;
 } else {
 const e = err as { message?: string };
 sendError = e.message ?? "Unknown Sendillo error";
 }
 }

 // 6) Persist the message row. conversation_id is set in one shot, so
 // /user/conversations can group by thread immediately.
 const { data: msg, error: insertErr } = await supabase
 .from("messages")
 .insert({
 id: messageId,
 workspace_id: user.workspace_id,
 lead_id: matchedLead.id,
 conversation_id: conv.id,
 agent_id: user.id,
 channel: "sms",
 direction: "outbound",
 body: text,
 external_id: from, // matches the existing log filter for "this number"
 external_status: sendOk ? "sent" : "failed",
 provider: "sendillo",
 sent_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (insertErr) {
 return NextResponse.json({ error: insertErr.message }, { status: 500 });
 }

 // 7) Update the lead's last_message_at so the conversation list
 // surfaces the new outbound.
 await supabase
 .from("leads")
 .update({ last_message_at: new Date().toISOString() })
 .eq("id", matchedLead.id);

 if (!sendOk) {
 return NextResponse.json(
 {
 message: msg,
 warning: `Message saved but Sendillo rejected the send: ${sendError}`,
 },
 { status: 502 }
 );
 }

 return NextResponse.json({ message: msg, sent: true }, { status: 201 });
}