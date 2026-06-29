// app/api/calendar/disconnect/route.ts
// Disconnect Google Calendar by removing stored credentials

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Get user's workspace
  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Remove Google Calendar credentials
  const { error: updateError } = await supabase
    .from("workspaces")
    .update({ google_calendar_creds: null })
    .eq("id", user.workspace_id);

  if (updateError) {
    console.error("[CalendarDisconnect] Failed to disconnect:", updateError.message);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  // Remove all appointments that were synced from Google Calendar
  const { error: deleteError } = await supabase
    .from("appointments")
    .delete()
    .eq("workspace_id", user.workspace_id)
    .not("google_event_id", "is", null);

  if (deleteError) {
    console.error("[CalendarDisconnect] Failed to remove synced appointments:", deleteError.message);
  } else {
    console.log("[CalendarDisconnect] Removed synced appointments for workspace:", user.workspace_id);
  }

  console.log("[CalendarDisconnect] Disconnected for workspace:", user.workspace_id);
  return NextResponse.json({ success: true, message: "Google Calendar disconnected" });
}
