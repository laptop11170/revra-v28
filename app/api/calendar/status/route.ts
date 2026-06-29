// app/api/calendar/status/route.ts
// Check whether Google Calendar is connected for the current workspace

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { data: ws } = await supabase
  .from("workspaces")
  .select("google_calendar_creds")
  .eq("id", user.workspace_id)
  .single();

  const connected = !!(
  ws?.google_calendar_creds &&
  typeof ws.google_calendar_creds === "object" &&
  (ws.google_calendar_creds as any).access_token
  );

  return NextResponse.json({ connected });
}
