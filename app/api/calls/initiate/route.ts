// app/api/calls/initiate/route.ts
// Creates a calls row in "initiated" status and returns the call_id
// + lead info. The actual PSTN dial is performed by the browser
// (Twilio.Device.connect) — the agent's device hits our TwiML
// endpoint at /api/twiml/outbound which bridges WebRTC ↔ phone.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { buildAgentIdentity, getTwilioPhoneNumber } from "@/lib/twilio/client";
import { createRetellCall } from "@/lib/retell/client";

export async function POST(req: NextRequest) {
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

 const body = await req.json().catch(() => null);
 if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

 const { lead_id, phone_number } = body;
 const normalizedPhone = typeof phone_number === "string" ? normalizePhone(phone_number) : "";
 if (!lead_id && !normalizedPhone) {
 return NextResponse.json({ error: "lead_id or phone_number is required" }, { status: 400 });
 }

 // Get lead info
 let lead: { id: string; phone: string | null; first_name: string | null; last_name: string | null } | null = null;

 if (lead_id) {
 const { data } = await supabase
 .from("leads")
 .select("id, phone, first_name, last_name")
 .eq("id", lead_id)
 .eq("workspace_id", user.workspace_id)
 .maybeSingle();

 lead = data;
 }

 if (!lead && normalizedPhone) {
 const cleanPhone = normalizedPhone.replace(/\D/g, "");
 const { data: existingLead } = await supabase
 .from("leads")
 .select("id, phone, first_name, last_name")
 .eq("workspace_id", user.workspace_id)
 .ilike("phone", `%${cleanPhone}`)
 .maybeSingle();

 lead = existingLead;
 }

 if (!lead && normalizedPhone) {
 const { data: newLead, error: createErr } = await supabase
 .from("leads")
 .insert({
 workspace_id: user.workspace_id,
 assigned_agent_id: user.id,
 first_name: "Dialed",
 last_name: "Contact",
 phone: normalizedPhone,
 source: "manual_dialer",
 pipeline_stage: "new_lead",
 score: 0,
 tags: ["manual-dial"],
 previous_stages: [],
 })
 .select("id, phone, first_name, last_name")
 .single();

 if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
 lead = newLead;
 }

 if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
 if (!lead.phone) return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 });

 // Verify Twilio is configured (caller-id check), but DO NOT dial here.
 // The browser's Twilio.Device will place the call via /api/twiml/outbound.
 try {
 getTwilioPhoneNumber();
 } catch (err: unknown) {
 const e = err as { message?: string };
 return NextResponse.json({ error: e.message || "Twilio not configured" }, { status: 500 });
 }

 const identity = buildAgentIdentity(user.workspace_id, userId);

 // Create call record first (status will move via the Retell webhook).
 const { data: callRecord, error: insertErr } = await supabase
 .from("calls")
 .insert({
 workspace_id: user.workspace_id,
 lead_id: lead.id,
 agent_id: user.id,
 direction: "outbound",
 status: "initiated",
 client_identity: identity,
 started_at: new Date().toISOString(),
 })
 .select("id")
 .single();

 if (insertErr || !callRecord) {
 return NextResponse.json(
 { error: insertErr?.message || "Failed to create call record" },
 { status: 500 }
 );
 }

 let retellCallId: string | null = null;
 let retellStatus = "queued";

 // ── Initiate via Retell AI (if configured) ──────────────────────────────────
 const retellConfigured = !!(process.env.RETELL_API_KEY && process.env.RETELL_AUTH_TOKEN);
  if (retellConfigured && lead.phone) {
    try {
      const retellResult = await createRetellCall(
        {
          phoneNumber: lead.phone,
          userId: user.id,
          callContext: {
            leadName: `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Unknown Lead",
            workspaceId: user.workspace_id,
          },
        },
        {
          call_id: callRecord.id,
          workspace_id: user.workspace_id,
          lead_id: lead.id,
        }
      );

      retellCallId = retellResult.retellCallId;
      retellStatus = retellResult.status;

      // Store the Retell call ID on the call record so the webhook can correlate
      await supabase
        .from("calls")
        .update({ retell_call_id: retellCallId, retell_status: retellStatus })
        .eq("id", callRecord.id);

      // Update status to ringing (Retell is dialing the lead)
      await supabase
        .from("calls")
        .update({ status: "ringing" })
        .eq("id", callRecord.id);
    } catch (retellErr) {
      console.error("[Initiate] Retell call creation failed:", retellErr);
      // Fall through — still return the call record so the UI can show the error
    }
  }

 return NextResponse.json({
 call_id: callRecord.id,
 lead_id: lead.id,
 lead_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Manual Dial",
 lead_phone: lead.phone,
 status: retellConfigured && retellCallId ? "ai_initiated" : "ready",
 retell_call_id: retellCallId,
 retell_status: retellStatus,
 retell_configured: retellConfigured,
 });
}

function normalizePhone(phone: string) {
 const trimmed = phone.trim();
 if (!trimmed) return "";
 const digits = trimmed.replace(/\D/g, "");
 if (trimmed.startsWith("+")) return `+${digits}`;
 if (digits.length === 10) return `+1${digits}`;
 if (digits.length > 10) return `+${digits}`;
 return digits;
}
