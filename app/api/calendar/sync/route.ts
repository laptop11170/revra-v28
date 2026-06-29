// app/api/calendar/sync/route.ts
// Pull events from Google Calendar and merge with local appointments

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
 getCalendarClient,
 getRefreshedCredentials,
 listEvents,
 FetchedEvent,
} from "@/lib/google/calendar";

export async function POST(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

 // Check workspace has Google Calendar creds
 const { data: ws } = await supabase
 .from("workspaces")
 .select("google_calendar_creds")
 .eq("id", user.workspace_id)
 .single();

 if (!ws?.google_calendar_creds) {
 return NextResponse.json(
 { error: "Google Calendar not connected", code: "NOT_CONNECTED" },
 { status: 400 }
 );
 }

 // Build calendar client
 let client;
 try {
 client = await getCalendarClient(ws.google_calendar_creds);
 } catch (err: unknown) {
 const e = err as { message?: string };
 console.error("[CalendarSync] Auth failed:", e.message);
 return NextResponse.json(
 { error: "Google Calendar auth failed", code: "AUTH_FAILED" },
 { status: 400 }
 );
 }

 // Fetch 30 days back, 90 days forward
 const now = new Date();
 const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
 const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

 let events: FetchedEvent[];
 try {
 events = await listEvents(client, { timeMin, timeMax });
 } catch (err: unknown) {
 const e = err as { message?: string };
 console.error("[CalendarSync] List failed:", e.message);
 return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
 }

 // Get existing local appointments to avoid duplicates
 const { data: existingApts } = await supabase
 .from("appointments")
 .select("id, google_event_id")
 .eq("workspace_id", user.workspace_id);

 const existingByGoogleId = new Map<string, string>();
 for (const a of existingApts || []) {
 if (a.google_event_id) existingByGoogleId.set(a.google_event_id, a.id);
 }

 let created = 0;
 let updated = 0;

 for (const ev of events) {
 const startDate = new Date(ev.start);
 const endDate = new Date(ev.end);
 const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
 const dateStr = startDate.toISOString().split("T")[0];
 const timeStr = startDate.toTimeString().slice(0, 5);

 const data = {
 workspace_id: user.workspace_id,
 agent_id: user.id,
 title: ev.summary || "Untitled",
 date: dateStr,
 time: timeStr,
 duration: Math.max(durationMin, 15),
 type: "Phone" as string,
 status: ev.status === "cancelled" ? "cancelled" : "confirmed",
 meeting_link: ev.htmlLink || null,
 google_event_id: ev.id,
 sync_status: "synced",
 last_synced_at: new Date().toISOString(),
 };

 const existingId = existingByGoogleId.get(ev.id);
 if (existingId) {
 const { error: updateError } = await supabase.from("appointments").update(data).eq("id", existingId);
 if (updateError) {
 console.error("[CalendarSync] Update failed:", updateError.message, "id:", existingId);
 } else {
 updated++;
 }
 } else {
 const { error: insertError } = await supabase.from("appointments").insert(data);
 if (insertError) {
 console.error("[CalendarSync] Insert failed:", insertError.message, "title:", ev.summary);
 } else {
 created++;
 }
 }
 }

 // Persist refreshed credentials if any
 const refreshed = getRefreshedCredentials(client);
 if (refreshed) {
 await supabase
 .from("workspaces")
 .update({ google_calendar_creds: refreshed })
 .eq("id", user.workspace_id);
 }

 return NextResponse.json({
 success: true,
 pulled: events.length,
 created,
 updated,
 });
}