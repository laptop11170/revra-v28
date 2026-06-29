import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
 getCalendarClient,
 getRefreshedCredentials,
 createEvent,
 listEvents,
 FetchedEvent,
} from "@/lib/google/calendar";

export async function GET(_req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("workspace_id")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 const { data: ws } = await supabase
 .from("workspaces")
 .select("google_calendar_creds")
 .eq("id", user.workspace_id)
 .single();

 let appointmentsWithLeads: any[] = [];
 let upcomingCount = 0;

 if (ws?.google_calendar_creds) {
 // Fetch fresh from Google Calendar if connected
 const now = new Date();
 const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
 const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
 const client = await getCalendarClient(ws.google_calendar_creds);
 const events: FetchedEvent[] = await listEvents(client, { timeMin, timeMax });

 // Convert Google events to appointment format
 appointmentsWithLeads = events.map(ev => {
 const startDate = new Date(ev.start);
 const endDate = new Date(ev.end);
 return {
 id: `google-${ev.id}`,
 lead_id: null,
 title: ev.summary || "Untitled",
 date: startDate.toISOString().split("T")[0],
 time: startDate.toTimeString().slice(0, 5),
 duration: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
 type: "Phone",
 status: ev.status === "cancelled" ? "cancelled" : "confirmed",
 meeting_link: ev.htmlLink || null,
 google_event_id: ev.id,
 sync_status: "synced",
 last_synced_at: new Date().toISOString(),
 lead: null,
 };
 });

 // Filter for upcoming count
 const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];
 upcomingCount = appointmentsWithLeads.filter((a: any) => a.date >= todayStart && a.status !== "cancelled").length;
 } else {
 // If not connected to Google, only show local appointments from DB
 // by checking if google_event_id is null via SQL
 const { data, error } = await supabase
 .from("appointments")
 .select("*, lead:leads(id, first_name, last_name, phone, email)")
 .eq("workspace_id", user.workspace_id)
 .is("google_event_id", null)
 .order("date", { ascending: false });

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 appointmentsWithLeads = data ?? [];

 const now = new Date();
 const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];
 upcomingCount = appointmentsWithLeads.filter((a: any) => a.date >= todayStart && a.status !== "cancelled").length;
 }

 return NextResponse.json(
 { appointments: appointmentsWithLeads, upcoming_count: upcomingCount },
 { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
 );
}

export async function POST(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("workspace_id, id")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 const body = await req.json();
 const { lead_id, title, date, time, duration, type, meeting_link, lead_email } = body;

 if (!title || !date || !time) {
 return NextResponse.json({ error: "title, date, and time are required" }, { status: 400 });
 }

 // Create local appointment
 const { data: apt, error } = await supabase
 .from("appointments")
 .insert({
 workspace_id: user.workspace_id,
 lead_id: lead_id ?? null,
 title,
 date,
 time,
 duration: duration ?? 30,
 type: type ?? "Phone",
 status: "pending",
 agent_id: user.id,
 meeting_link: meeting_link ?? null,
 })
 .select()
 .single();

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 // Push to Google Calendar if connected
 const { data: ws } = await supabase
 .from("workspaces")
 .select("google_calendar_creds")
 .eq("id", user.workspace_id)
 .single();

 let googleEventId: string | null = null;
 if (ws?.google_calendar_creds) {
 try {
 const client = await getCalendarClient(ws.google_calendar_creds);

 // Build ISO start/end from date + time + duration
 const startDateTime = new Date(`${date}T${time}`);
 const endDateTime = new Date(startDateTime.getTime() + (duration || 30) * 60000);

 const attendees: { email: string }[] = [];
 if (lead_email) attendees.push({ email: lead_email });

 googleEventId = await createEvent(client, {
 summary: title,
 description: `RevRa appointment (${type || "Phone"})`,
 start: { dateTime: startDateTime.toISOString() },
 end: { dateTime: endDateTime.toISOString() },
 location: type === "Video" ? (meeting_link || undefined) : undefined,
 attendees,
 });

 // Persist refreshed credentials
 const refreshed = getRefreshedCredentials(client);
 if (refreshed) {
 await supabase
 .from("workspaces")
 .update({ google_calendar_creds: refreshed })
 .eq("id", user.workspace_id);
 }

 // Update local record
 await supabase
 .from("appointments")
 .update({
 google_event_id: googleEventId,
 sync_status: "synced",
 last_synced_at: new Date().toISOString(),
 })
 .eq("id", apt.id);

 apt.google_event_id = googleEventId;
 apt.sync_status = "synced";
 } catch (gErr: unknown) {
 const ge = gErr as { message?: string };
 console.error("[Appointments] Google Calendar push failed:", ge.message);
 // Don't fail the appointment creation — mark as pending sync
 await supabase
 .from("appointments")
 .update({ sync_status: "pending", sync_error: ge.message || "Push failed" })
 .eq("id", apt.id);
 apt.sync_status = "pending";
 }
 }

 return NextResponse.json({ appointment: apt }, { status: 201 });
}