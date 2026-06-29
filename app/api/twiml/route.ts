// app/api/twiml/route.ts
// Returns TwiML instructions when Twilio connects a call
// Also handles inbound calls

import { NextRequest, NextResponse } from "next/server";
import { buildTwimlResponse } from "@/lib/twilio/client";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
  return new NextResponse(buildTwimlResponse("Hello, please wait while we connect your call."), {
  headers: { "Content-Type": "application/xml" },
  });
  }

  const from = (formData.get("From") as string) || "";
  const to = (formData.get("To") as string) || "";
  const callSid = (formData.get("CallSid") as string) || "";
  const callStatus = (formData.get("CallStatus") as string) || "";

  // Determine direction
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER || "";
  const isInbound = to === twilioNumber;

  // Find lead by phone for inbound calls
  let leadName = "there";
  let leadId: string | null = null;
  let workspaceId: string | null = null;

  if (isInbound && from) {
  const supabase = createServiceSupabaseClient();
  if (supabase) {
  const cleanPhone = from.replace(/\D/g, "");
  const { data: lead } = await supabase
  .from("leads")
  .select("id, first_name, workspace_id")
  .ilike("phone", `%${cleanPhone}`)
  .maybeSingle();

  if (lead) {
  leadName = lead.first_name || "there";
  leadId = lead.id;
  workspaceId = lead.workspace_id;
  }

  // Upsert call record for inbound
  if (leadId && workspaceId) {
  await supabase.from("calls").insert({
  workspace_id: workspaceId,
  lead_id: leadId,
  agent_id: null,
  twilio_call_sid: callSid,
  direction: "inbound",
  status: "ringing",
  started_at: new Date().toISOString(),
  });
  }
  }
  }

  const message = `Hello ${leadName}, this is RevRa. Connecting your call now.`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const statusCallback = `${baseUrl}/api/webhooks/twilio/calls`;
  const twiml = buildTwimlResponse(message, statusCallback);

  return new NextResponse(twiml, {
  headers: { "Content-Type": "application/xml" },
  });
}
