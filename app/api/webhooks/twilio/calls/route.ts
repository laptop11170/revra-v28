// app/api/webhooks/twilio/calls/route.ts
// Handles Twilio call status callbacks, recording callbacks, and
// transcription callbacks (when transcribe=true is set on <Record> or
// <Dial record="record-from-answer">).

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const STATUS_MAP: Record<string, string> = {
  queued: "initiated",
  ringing: "ringing",
  "in-progress": "in_progress",
  completed: "completed",
  busy: "busy",
  "no-answer": "no_answer",
  canceled: "failed",
  failed: "failed",
};

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ ok: true });

  // Twilio sends a bunch of params in different combinations depending
  // on the event type (status callback, recording callback, or the
  // separate transcription callback). Pull everything we care about.
  const callSid = (formData.get("CallSid") as string) || "";
  const callStatus = (formData.get("CallStatus") as string) || "";
  const callDuration = (formData.get("CallDuration") as string) || "0";
  const recordingUrl = (formData.get("RecordingUrl") as string) || null;
  const recordingSid = (formData.get("RecordingSid") as string) || null;
  const recordingDuration = (formData.get("RecordingDuration") as string) || null;

  // Transcription-specific params (sent when transcribe=true is set)
  const transcriptionSid = (formData.get("TranscriptionSid") as string) || null;
  const transcriptionText = (formData.get("TranscriptionText") as string) || null;
  const transcriptionStatus = (formData.get("TranscriptionStatus") as string) || null;
  const transcriptionUrl = (formData.get("TranscriptionUrl") as string) || null;

  // Recording URLs from Twilio come WITHOUT an extension. Browsers need
  // the .mp3 (or .wav) for the <audio> element, so we generate both
  // candidates — the client tries the .mp3 first, then .wav.
  const recordingUrlMp3 = recordingUrl ? `${recordingUrl}.mp3` : null;

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ ok: true });

  // Find call by Twilio SID
  const { data: call } = await supabase
    .from("calls")
    .select("id")
    .eq("twilio_call_sid", callSid)
    .maybeSingle();

  if (!call) {
    console.warn(`[TwilioWebhook] Call not found for SID: ${callSid}`);
    return NextResponse.json({ ok: true });
  }

  const updateData: Record<string, unknown> = {};

  if (STATUS_MAP[callStatus]) {
    updateData.status = STATUS_MAP[callStatus];
  }

  if (
    callStatus === "completed" ||
    callStatus === "busy" ||
    callStatus === "no-answer" ||
    callStatus === "failed"
  ) {
    updateData.ended_at = new Date().toISOString();
  }

  if (callDuration) {
    updateData.duration_seconds = parseInt(callDuration) || 0;
  }

  if (recordingUrl) {
    // Store the .mp3 URL — the format browsers can play.
    updateData.recording_url = recordingUrlMp3;
  }

  if (recordingSid) {
    updateData.twilio_recording_sid = recordingSid;
  }

  if (recordingDuration) {
    updateData.recording_duration = parseInt(recordingDuration) || 0;
  }

  // ── Transcription fields ─────────────────────────────────────────────
  if (transcriptionSid) {
    updateData.twilio_transcription_sid = transcriptionSid;
  }

  if (transcriptionText) {
    // Persist into BOTH the legacy `transcription` column and the new
    // `transcription_text` column so existing readers keep working.
    updateData.transcription = transcriptionText;
    updateData.transcription_text = transcriptionText;
    updateData.transcribed_at = new Date().toISOString();
  }

  if (transcriptionStatus) {
    updateData.transcription_status = transcriptionStatus;
  }

  if (transcriptionUrl) {
    updateData.transcription_url = transcriptionUrl;
  }

  if (Object.keys(updateData).length > 0) {
    await supabase.from("calls").update(updateData).eq("id", call.id);
  }

  return NextResponse.json({ ok: true });
}
