// app/api/twiml/outbound/route.ts
//
// TwiML endpoint the browser Twilio.Device hits when an agent places
// an outbound call. We resolve the call's workspace from the `callId`
// form param (which the browser sends along with `To`), then look up
// the workspace's subaccount and use the workspace's first phone
// number as the caller ID.
//
// app/api/twiml/outbound/route.ts
//
// TwiML endpoint the browser Twilio.Device hits when an agent places
// an outbound call. We resolve the call's workspace from the `callId`
// form param (which the browser sends along with `To`), then look up
// the workspace's subaccount and use the workspace's first phone
// number as the caller ID.
//
// IMPORTANT: this route is hit by Twilio itself (not the browser), so
// Twilio's signature must be validated and the workspace lookup must
// be deterministic. Twilio posts the callId we set in
// /api/calls/initiate and on the device.connect params.

import { NextRequest, NextResponse } from "next/server";
import { buildBridgeTwiml } from "@/lib/twilio/client";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
 const form = await req.formData().catch(() => null);
 const to = (form?.get("To") as string) || "";
 const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
 const statusCallback = `${baseUrl}/api/webhooks/twilio/calls`;
 const callId = (form?.get("callId") as string) || "";
 const callSid = (form?.get("CallSid") as string) || "";

  let callerId = process.env.TWILIO_PHONE_NUMBER || "";

  if (callId) {
    const supabase = createServiceSupabaseClient();
    if (supabase) {
      const { data: call } = await supabase
        .from("calls")
        .select("workspace_id")
        .eq("id", callId)
        .maybeSingle();

      if (call?.workspace_id) {
 // 1) store the live CallSid on the call row so the status webhook
 // can correlate status events back to this call.
 if (callSid) {
 await supabase
 .from("calls")
 .update({ twilio_call_sid: callSid })
 .eq("id", callId);
 }

 // 2) Resolve the workspace's outbound caller id from the first
 // active phone number on its subaccount.
 const { data: numRow } = await supabase
 .from("twilio_phone_numbers")
 .select("phone_number")
 .eq("workspace_id", call.workspace_id)
 .eq("is_active", true)
 .order("created_at", { ascending: true })
 .limit(1)
 .maybeSingle();

 if (numRow?.phone_number) {
 callerId = numRow.phone_number;
 }
 }
 }
 }

 if (!to) {
 const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
 <Say voice="Polly.Joanna">No destination number was provided.</Say>
</Response>`;
 return new NextResponse(twiml, {
 headers: { "Content-Type": "application/xml" },
 });
 }

  const twiml = buildBridgeTwiml({
    dialNumber: to,
    callerId,
    statusCallback,
  });

  return new NextResponse(twiml, {
    headers: { "Content-Type": "application/xml" },
  });
}
