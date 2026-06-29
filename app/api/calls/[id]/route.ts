// app/api/calls/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { hangupCall } from "@/lib/twilio/client";
import { endRetellCall, getRetellCallStatus } from "@/lib/retell/client";

const RETELL_STATUS_MAP: Record<string, string> = {
  "queued": "initiated",
  "ringing": "ringing",
  "in-progress": "in_progress",
  "completed": "completed",
  "ended": "completed",
  "busy": "busy",
  "no-answer": "no_answer",
  "failed": "failed",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { data: call, error } = await supabase
    .from("calls")
    .select(`
      *,
      lead:leads!calls_lead_id_fkey(id, first_name, last_name, phone, email)
    `)
    .eq("id", id)
    .eq("workspace_id", user.workspace_id)
    .single();

  if (error || !call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  // If call is a Retell call and is not in a final state (or lacks recording_url), poll Retell directly for fresh info
  if (call.retell_call_id && (
    (call.status !== "completed" && call.status !== "failed" && call.status !== "busy" && call.status !== "no_answer") ||
    !call.recording_url
  )) {
    try {
      const liveStatus = await getRetellCallStatus(call.retell_call_id);
      if (liveStatus) {
        const mappedStatus = RETELL_STATUS_MAP[liveStatus.status] || call.status;
        const updateObj: Record<string, any> = {
          status: mappedStatus,
        };
        if (liveStatus.transcript) {
          updateObj.transcription = liveStatus.transcript;
          updateObj.transcription_text = liveStatus.transcript;
        }
        if (liveStatus.summary) {
          updateObj.ai_summary = liveStatus.summary;
        }
        if (liveStatus.duration !== undefined && liveStatus.duration !== null) {
          updateObj.duration_seconds = liveStatus.duration;
        }
        if (liveStatus.recordingUrl) {
          updateObj.recording_url = liveStatus.recordingUrl;
        }
        if (mappedStatus === "completed" || mappedStatus === "failed" || mappedStatus === "busy" || mappedStatus === "no_answer") {
          updateObj.ended_at = new Date().toISOString();
        }

        // Update in Supabase
        const { data: updatedCall } = await supabase
          .from("calls")
          .update(updateObj)
          .eq("id", id)
          .select()
          .single();

        if (updatedCall) {
          Object.assign(call, updatedCall);
        }
      }
    } catch (err) {
      console.error("[GET Call] Failed to fetch live Retell status:", err);
    }
  }

  return NextResponse.json({
    call: {
      ...call,
      lead_name: call.lead
        ? `${call.lead.first_name || ""} ${call.lead.last_name || ""}`.trim()
        : null,
    },
  });
}

// PATCH: update call outcome / notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Allowed fields from the real calls schema (incl. transcription)
  const allowedFields = [
    "ai_summary",
    "ai_disposition",
    "ai_next_steps",
    "status",
    "duration_seconds",
    "transcription",
    "transcription_text",
    "transcription_url",
    "transcription_status",
  ];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field];
  }

  // Map raw UI outcome strings to strict Postgres enum values: 'interested', 'not_interested', 'callback', 'not_reachable'
  if ("ai_disposition" in updateData && updateData.ai_disposition) {
    const rawDisp = updateData.ai_disposition as string;
    const DISPOSITION_MAP: Record<string, string> = {
      // Calls page modal outcomes
      "Contacted": "interested",
      "Voicemail": "not_reachable",
      "No Answer": "not_reachable",
      "Callback Requested": "callback",
      "Not Interested": "not_interested",
      "Wrong Number": "not_reachable",
      "Dead Line": "not_reachable",

      // Active call page post-call outcomes
      "Appointment Scheduled": "interested",
      "Interested — Follow Up": "interested",
      "No Answer / Voicemail": "not_reachable",
      "DNC / Do Not Call": "not_interested",
    };
    
    let mapped = DISPOSITION_MAP[rawDisp] || rawDisp.toLowerCase().replace(/[^a-z_]/g, "_");
    const validEnums = ["interested", "not_interested", "callback", "not_reachable"];
    if (!validEnums.includes(mapped)) {
      mapped = "interested";
    }
    updateData.ai_disposition = mapped;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("calls")
    .update(updateData)
    .eq("id", id)
    .eq("workspace_id", user.workspace_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Try to insert a record into the call_logs and call_outcome_logs tables
  try {
    const { data: callDetails } = await supabase
      .from("calls")
      .select(`
        *,
        lead:leads!calls_lead_id_fkey(id, first_name, last_name, phone)
      `)
      .eq("id", id)
      .single();

    if (callDetails) {
      // 1. Log to call_logs
      await supabase
        .from("call_logs")
        .insert({
          call_id: id,
          lead_id: callDetails.lead_id || null,
          caller_id: callDetails.client_identity || null,
          recipient_phone: callDetails.lead?.phone || null,
          duration_seconds: updateData.duration_seconds || callDetails.duration_seconds || 0,
          call_outcome: updateData.ai_disposition || "completed",
          next_pipeline_stage: body.next_stage || null,
          call_notes: updateData.ai_summary || callDetails.ai_summary || null,
        });

      // 2. Log to call_outcome_logs
      const leadName = callDetails.lead
        ? `${callDetails.lead.first_name || ""} ${callDetails.lead.last_name || ""}`.trim()
        : null;

      await supabase
        .from("call_outcome_logs")
        .insert({
          call_id: id,
          lead_name: leadName || null,
          lead_phone: callDetails.lead?.phone || null,
          call_outcome: updateData.ai_disposition || "completed",
          summary_notes: updateData.ai_summary || callDetails.ai_summary || null,
          call_transcription: updateData.transcription || callDetails.transcription || callDetails.transcription_text || null,
        });
    }
  } catch (logErr) {
    console.warn("[PATCH Call] Could not insert into call logs/outcomes tables:", logErr);
  }

  return NextResponse.json({ call: data });
}

// DELETE: end an active call via Twilio
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { data: call } = await supabase
    .from("calls")
    .select("twilio_call_sid, retell_call_id, status")
    .eq("id", id)
    .eq("workspace_id", user.workspace_id)
    .single();

  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  // End via Retell if there's a retell_call_id and call is active
 if (call.retell_call_id && (call.status === "ringing" || call.status === "in_progress")) {
 try {
 await endRetellCall(call.retell_call_id);
 } catch (err: unknown) {
 const e = err as { message?: string };
 console.error("[Retell] End call failed:", e.message);
 }
 }

 // Hang up via Twilio if there's a SID and call is active
  if (call.twilio_call_sid && (call.status === "initiated" || call.status === "ringing" || call.status === "in_progress")) {
    try {
      await hangupCall(call.twilio_call_sid);
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error("[Twilio] Hangup failed:", e.message);
    }
  }

  // Update status locally
  await supabase
    .from("calls")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
