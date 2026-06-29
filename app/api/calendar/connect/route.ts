// app/api/calendar/connect/route.ts
// Initiates Google Calendar OAuth flow

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google/calendar";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Look up workspace for this user
  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const redirect = req.nextUrl.searchParams.get("redirect") || "/user/calendar";

  // Build state with "ws:" prefix — must match callback parser
  const state = `ws:${user.workspace_id}:${redirect}`;

  try {
    const url = getAuthUrl(state);
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("[CalendarConnect] Failed to generate auth URL:", e.message);
    return NextResponse.json(
      { error: "Google Calendar is not configured. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 500 }
    );
  }
}
