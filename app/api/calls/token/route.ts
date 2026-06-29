// app/api/calls/token/route.ts
//
// GET /api/calls/token
// Mints a short-lived Twilio AccessToken (with VoiceGrant) for the
// browser Twilio.Device. The token is signed with the platform's
// API key (SK...) and iss= is the main TWILIO_ACCOUNT_SID since all
// users share the platform's main Twilio account.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { buildAgentIdentity, mintVoiceToken } from "@/lib/twilio/client";

export const dynamic = "force-dynamic";

export async function GET() {
 const { userId } = await auth();
 if (!userId) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 // We only need the workspace_id to build a stable client identity;
 // the token itself is signed against the platform's main account.
 let workspaceId = "shared-demo";
 const supabase = createServiceSupabaseClient();
 if (supabase) {
 const { data } = await supabase
 .from("users")
 .select("workspace_id")
 .eq("clerk_user_id", userId)
 .maybeSingle();
 if (data?.workspace_id) workspaceId = data.workspace_id;
 }

 const identity = buildAgentIdentity(workspaceId, userId);

 try {
 const token = mintVoiceToken(identity, 60 * 60);
 return NextResponse.json(
 { token, identity },
 { headers: { "Cache-Control": "no-store" } }
 );
 } catch (err: unknown) {
 const e = err as { message?: string };
 return NextResponse.json(
 { error: e.message || "Failed to mint voice token" },
 { status: 500 }
 );
 }
}
