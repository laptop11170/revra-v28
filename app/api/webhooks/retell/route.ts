// app/api/webhooks/retell/route.ts
//
// Receives outbound call status webhooks from Retell AI and updates
// the corresponding call record in our database.
//
// Retell calls this endpoint as the call progresses:
// - call_started → status = ringing → in_progress
// - call_answered → status = in_progress
// - call_interrupted, call_hangup, call_expiring → status = ended/completed
// - call_summary → ai_summary, ai_disposition
//
// Set this URL in your Retell dashboard as the "Webhook URL":
// https://<your-public-url>/api/webhooks/retell

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { verifyRetellWebhook } from "@/lib/retell/client";

// Map Retell status strings to our internal call_status enum
const RETELL_STATUS_MAP: Record<string, string> = {
 queued: "initiated",
 ringing: "ringing",
 "call_started": "ringing",
 "call_answered": "in_progress",
 "in-progress": "in_progress",
 completed: "completed",
 ended: "completed",
 busy: "busy",
 "no-answer": "no_answer",
 failed: "failed",
};

export async function POST(req: NextRequest) {
 const rawBody = await req.text();

 // ── Verify webhook signature (skip in dev if no secret set) ──────────────────
 const signature = req.headers.get("x-webhook-secret") ?? "";
 const webhookSecret = process.env.RETELL_WEBHOOK_SECRET ?? "";
 if (webhookSecret && !verifyRetellWebhook(rawBody, signature, webhookSecret)) {
 console.warn("[RetellWebhook] Invalid webhook signature");
 return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
 }

 let payload: Record<string, unknown>;
 try {
 payload = JSON.parse(rawBody);
 } catch {
 return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
 }

 const eventType = (payload.event as string) ?? "";
 const retellCallId = (payload.call_id as string) ?? "";

 console.log(`[RetellWebhook] Event: ${eventType}, call_id: ${retellCallId}`);

 if (!retellCallId) {
 // Some events don't have a call_id (e.g. pings); acknowledge and move on
 return NextResponse.json({ ok: true });
 }

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ ok: true });

 // ── Find our call record by retell_call_id ─────────────────────────────────
 const { data: callRecord } = await supabase
 .from("calls")
 .select("id, retell_call_id")
 .eq("retell_call_id", retellCallId)
 .maybeSingle();

 if (!callRecord) {
 console.warn(`[RetellWebhook] No call found for Retell call_id: ${retellCallId}`);
 return NextResponse.json({ ok: true });
 }

 const updateData: Record<string, unknown> = {};

 // ── Status & duration ───────────────────────────────────────────────────────
 if (payload.status && typeof payload.status === "string") {
 const mappedStatus = RETELL_STATUS_MAP[payload.status];
 if (mappedStatus) {
 updateData.status = mappedStatus;
 }
 }

 // Retell specific statuses
 if (eventType === "call_answered" || payload.status === "in-progress") {
 updateData.status = "in_progress";
 }

 if (eventType === "call_interrupted" || eventType === "call_hangup" || eventType === "call_expiring") {
 updateData.status = "completed";
 updateData.ended_at = new Date().toISOString();
 }

 if (typeof payload.duration === "number") {
 updateData.duration_seconds = payload.duration;
 }

 // ── Recording / transcript ───────────────────────────────────────────────
 if (payload.recording_url && typeof payload.recording_url === "string") {
 updateData.recording_url = payload.recording_url;
 }

 if (payload.transcript && typeof payload.transcript === "string") {
 updateData.transcription = payload.transcript;
 updateData.transcription_text = payload.transcript;
 }

 // ── AI summary & disposition ─────────────────────────────────────────────
 if (payload.summary && typeof payload.summary === "string") {
 updateData.ai_summary = payload.summary;
 }

 if (payload.disposition && typeof payload.disposition === "string") {
 updateData.ai_disposition = payload.disposition;
 }

 if (payload.end_reason && typeof payload.end_reason === "string") {
 // Store the raw end reason as ai_next_steps for debugging
 updateData.ai_next_steps = payload.end_reason;
 }

 // ── Persist updates ──────────────────────────────────────────────────────
 if (Object.keys(updateData).length > 0) {
 const { error: updateErr } = await supabase
 .from("calls")
 .update(updateData)
 .eq("id", callRecord.id);

 if (updateErr) {
 console.error(`[RetellWebhook] Failed to update call ${callRecord.id}:`, updateErr);
 }
 }

 return NextResponse.json({ ok: true });
}
