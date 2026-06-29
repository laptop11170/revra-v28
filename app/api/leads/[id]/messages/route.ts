import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/sendillo/client";
import {
 resolveSendilloFromNumber,
 upsertConversation,
} from "@/lib/sendillo/lead-from-phone";

// GET /api/leads/[id]/messages — get conversation history for a lead
export async function GET(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id: leadId } = await params;
 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("workspace_id")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 const limit = parseInt(new URL(req.url).searchParams.get("limit") || "20");

 const { data, error } = await supabase
 .from("messages")
 .select("*")
 .eq("lead_id", leadId)
 .eq("workspace_id", user.workspace_id)
 .order("created_at", { ascending: true })
 .limit(limit);

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 return NextResponse.json({ messages: data });
}

// POST /api/leads/[id]/messages — send a message to a lead
//
// Sends via Sendillo (not Twilio). The chat composer at
// /user/conversations calls this endpoint; we resolve the
// workspace's Sendillo number, optionally validate an explicit
// `from` from the client (when the workspace has multiple
// registered numbers), and persist the outbound message in the
// same `messages` row shape that inbound replies land in. The
// chat's 5-second poll will then render the new bubble.
export async function POST(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id: leadId } = await params;
 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 const body = await req.json().catch(() => null);
 if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
 const { channel = "sms", body: messageBody, from: requestedFrom } = body;

 if (!messageBody) {
 return NextResponse.json({ error: "Message body is required" }, { status: 400 });
 }

 const { data: lead } = await supabase
 .from("leads")
 .select("id, phone, opted_out")
 .eq("id", leadId)
 .eq("workspace_id", user.workspace_id)
 .single();

 if (!lead) {
 return NextResponse.json({ error: "Lead not found" }, { status: 404 });
 }

 if (lead.opted_out) {
 return NextResponse.json({ error: "Lead has opted out of messaging" }, { status: 400 });
 }

 // For SMS channel: send via Sendillo. Twilio is no longer used here.
 let externalStatus = "pending";
 let externalId: string | null = null;
 const messageId = crypto.randomUUID();

 if (channel === "sms") {
 if (!lead.phone) {
 return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 });
 }

 // Resolve which Sendillo number to send from. Returns null if no
 // active number is registered for this workspace — refuse the send
 // with a clear actionable message rather than silently falling back
 // to anything.
 const fromResult = await resolveSendilloFromNumber(
 supabase,
 user.workspace_id,
 typeof requestedFrom === "string" ? requestedFrom : undefined
 );
 if (!fromResult) {
 return NextResponse.json(
 {
 error:
 "No active Sendillo number is registered for your workspace. Ask your admin to register one in the Sendillo admin page first.",
 },
 { status: 409 }
 );
 }
 if (fromResult.needsPicker) {
 return NextResponse.json(
 {
 error:
 "Multiple Sendillo numbers are registered for your workspace. Pick one to send from.",
 needsPicker: true,
 },
 { status: 409 }
 );
 }

 const from = fromResult.from;

 // Send via Sendillo. clientRef equals messages.id so the webhook
 // handler can later update this row's external_status via .eq("id",
 // clientRef).
 try {
 await sendSMS({ from, to: lead.phone, body: messageBody, clientRef: messageId });
 externalStatus = "sent";
 externalId = messageId; // Sendillo doesn't return a Twilio-style SID
 } catch (err: unknown) {
 const e = err as { message?: string };
 console.error("[Sendillo] SMS send failed:", e.message ?? e);
 externalStatus = "failed";
 externalId = messageId;
 }
 }

 // Upsert the conversation BEFORE the message insert so the new row
 // can carry conversation_id in one shot (no follow-up UPDATE).
 const conv = await upsertConversation(supabase, {
 workspaceId: user.workspace_id,
 leadId,
 channel,
 lastMessage: messageBody,
 // Outbound from us — no unread bump.
 incrementUnread: false,
 });
 if (!conv) {
 return NextResponse.json(
 { error: "Could not upsert conversation thread." },
 { status: 500 }
 );
 }

 // Insert the message with conversation_id and provider set in one
 // shot. provider='sendillo' powers the channel-indicator pill on
 // each chat bubble.
 const { data: msg, error } = await supabase
 .from("messages")
 .insert({
 id: messageId,
 workspace_id: user.workspace_id,
 lead_id: leadId,
 conversation_id: conv.id,
 agent_id: user.id,
 channel,
 direction: "outbound",
 body: messageBody,
 external_id: externalId,
 external_status: externalStatus,
 provider: channel === "sms" ? "sendillo" : null,
 sent_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 // Update lead's last_message_at so the conversation list surfaces it.
 await supabase
 .from("leads")
 .update({ last_message_at: new Date().toISOString() })
 .eq("id", leadId);

 if (externalStatus === "failed") {
 return NextResponse.json(
 { message: msg, warning: "Message saved but failed to send via Sendillo" },
 { status: 207 }
 );
 }

 return NextResponse.json({ message: msg }, { status: 201 });
}