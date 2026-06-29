import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getCalendarClient, listEvents } from "@/lib/google/calendar";

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

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // 1. Fetch active pipeline stages dynamically (custom or default)
  let { data: stages } = await supabase
    .from("pipeline_stages")
    .select("name, slug, position, color")
    .eq("workspace_id", user.workspace_id)
    .order("position", { ascending: true });

  if (!stages || stages.length === 0) {
    const { data: defaultStages } = await supabase
      .from("default_pipeline_stages")
      .select("name, slug, position, color")
      .order("position", { ascending: true });
    stages = defaultStages || [];
  }

  // 2. Today's metrics
  const { count: todayMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id)
    .gte("created_at", todayStart);

  const { count: todayLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart)
    .eq("workspace_id", user.workspace_id);

  const { count: hotLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("score", 80)
    .eq("workspace_id", user.workspace_id);

  // Check workspace for Google Calendar credentials
  const { data: ws } = await supabase
    .from("workspaces")
    .select("google_calendar_creds")
    .eq("id", user.workspace_id)
    .single();

  let upcomingAppointments: any[] = [];
  let todayAppointments = 0;

  const todayStr = todayStart.split("T")[0];
  const futureEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  if (ws?.google_calendar_creds) {
    try {
      const client = await getCalendarClient(ws.google_calendar_creds);
      const timeMin = todayStart;
      const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const events = await listEvents(client, { timeMin, timeMax });
      
      upcomingAppointments = events.map(ev => {
        const startDate = new Date(ev.start);
        const endDate = new Date(ev.end || ev.start);
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
          lead: null,
        };
      }).filter(a => a.status !== "cancelled");
    } catch (gErr) {
      console.error("[Briefing] Google Calendar fetch failed:", (gErr as Error).message);
    }
  } else {
    const { data: localAppts } = await supabase
      .from("appointments")
      .select("id, title, date, time, duration, type, status, lead_id, meeting_link, lead:leads(id, first_name, last_name)")
      .eq("workspace_id", user.workspace_id)
      .gte("date", todayStr)
      .lte("date", futureEndDate)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(6);
    
    upcomingAppointments = (localAppts || []).map(apt => {
      const leadObj = apt.lead as any;
      return {
        id: apt.id,
        kind: "appointment",
        title: apt.title,
        date: apt.date,
        time: apt.time,
        duration: apt.duration,
        type: apt.type,
        status: apt.status,
        lead_id: apt.lead_id,
        lead_name: leadObj ? `${leadObj.first_name || ""} ${leadObj.last_name || ""}`.trim() : null,
        meeting_link: apt.meeting_link,
        google_event_id: null,
      };
    });
  }

  // Fetch pending tasks to merge
  const { data: localTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority, status, lead_id, lead:leads(id, first_name, last_name)")
    .eq("workspace_id", user.workspace_id)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .limit(10);

  const mappedTasks = (localTasks || []).map(t => {
    const due = t.due_date ? new Date(t.due_date) : new Date();
    const leadObj = t.lead as any;
    return {
      id: t.id,
      kind: "task",
      title: t.title,
      date: due.toISOString().split("T")[0],
      time: due.toTimeString().slice(0, 5),
      duration: null,
      type: "Task",
      status: t.status,
      lead_id: t.lead_id,
      lead_name: leadObj ? `${leadObj.first_name || ""} ${leadObj.last_name || ""}`.trim() : null,
      meeting_link: null,
      google_event_id: null,
      priority: t.priority,
    };
  });

  const mergedAppointmentsAndTasks = [...upcomingAppointments, ...mappedTasks]
    .sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time}`;
      const dateTimeB = `${b.date}T${b.time}`;
      return dateTimeA.localeCompare(dateTimeB);
    })
    .slice(0, 10);

  // Calculate today's appointments count
  todayAppointments = mergedAppointmentsAndTasks.filter(
    a => a.date === todayStr && a.status !== "cancelled"
  ).length;

  // 3. Stage counts for funnel (only count active stages)
  const { data: stageData } = await supabase
    .from("leads")
    .select("pipeline_stage")
    .eq("workspace_id", user.workspace_id);

  const stageCounts: Record<string, number> = {};
  // Initialize all active stages with 0
  for (const s of (stages || [])) {
    stageCounts[s.slug] = 0;
  }
  
  for (const lead of (stageData ?? [])) {
    const stage = lead.pipeline_stage ?? "new_lead";
    if (stageCounts[stage] !== undefined) {
      stageCounts[stage]++;
    } else {
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
    }
  }

  // Recent leads
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, first_name, last_name, score, pipeline_stage, created_at, last_message_at")
    .eq("workspace_id", user.workspace_id)
    .order("score", { ascending: false })
    .limit(10);

  // Recent activity
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, body, direction, created_at, lead_id")
    .eq("workspace_id", user.workspace_id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Week sparkline (7 days)
  const sparkData: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", user.workspace_id)
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", dayEnd.toISOString());
    sparkData.push({ date: dayStart.toISOString().slice(0, 10), count: count ?? 0 });
  }

  // 4. Fetch recommended lead (highest score lead)
  const { data: recommendedLeadData } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, score, pipeline_stage, last_message_at")
    .eq("workspace_id", user.workspace_id)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 5. Fetch last call
  const { data: lastCallData } = await supabase
    .from("calls")
    .select(`
      id,
      status,
      duration_seconds,
      started_at,
      direction,
      lead:leads!calls_lead_id_fkey(id, first_name, last_name, phone)
    `)
    .eq("workspace_id", user.workspace_id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastCall = null;
  if (lastCallData) {
    const leadObj = lastCallData.lead as any;
    lastCall = {
      id: lastCallData.id,
      status: lastCallData.status,
      duration_seconds: lastCallData.duration_seconds,
      started_at: lastCallData.started_at,
      direction: lastCallData.direction,
      phone: leadObj?.phone || null,
      lead_name: leadObj ? `${leadObj.first_name || ""} ${leadObj.last_name || ""}`.trim() : null,
    };
  }

  // 6. Fetch last SMS
  const { data: lastSmsData } = await supabase
    .from("messages")
    .select(`
      id,
      body,
      direction,
      created_at,
      lead:leads!messages_lead_id_fkey(id, first_name, last_name, phone)
    `)
    .eq("workspace_id", user.workspace_id)
    .eq("channel", "sms")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastSms = null;
  if (lastSmsData) {
    const leadObj = lastSmsData.lead as any;
    lastSms = {
      id: lastSmsData.id,
      body: lastSmsData.body,
      direction: lastSmsData.direction,
      created_at: lastSmsData.created_at,
      phone: leadObj?.phone || null,
      lead_name: leadObj ? `${leadObj.first_name || ""} ${leadObj.last_name || ""}`.trim() : null,
    };
  }

  // 7. Fetch last recording
  const { data: lastRecordingData } = await supabase
    .from("calls")
    .select(`
      id,
      status,
      duration_seconds,
      started_at,
      twilio_recording_sid,
      recording_url,
      transcription,
      ai_summary,
      ai_disposition,
      lead:leads!calls_lead_id_fkey(id, first_name, last_name)
    `)
    .eq("workspace_id", user.workspace_id)
    .not("recording_url", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastRecording = null;
  if (lastRecordingData) {
    const leadObj = lastRecordingData.lead as any;
    lastRecording = {
      id: lastRecordingData.id,
      status: lastRecordingData.status,
      duration_seconds: lastRecordingData.duration_seconds,
      started_at: lastRecordingData.started_at,
      recording_sid: lastRecordingData.twilio_recording_sid,
      recording_url: lastRecordingData.recording_url,
      transcription: lastRecordingData.transcription,
      ai_summary: lastRecordingData.ai_summary,
      ai_disposition: lastRecordingData.ai_disposition,
      lead_name: leadObj ? `${leadObj.first_name || ""} ${leadObj.last_name || ""}`.trim() : null,
    };
  }

  return NextResponse.json({
    stages,
    todayMessages: todayMessages ?? 0,
    todayLeads: todayLeads ?? 0,
    hotLeads: hotLeads ?? 0,
    todayAppointments: todayAppointments ?? 0,
    upcomingAppointments: mergedAppointmentsAndTasks,
    stageCounts,
    totalStageLeads: stageData?.length ?? 0,
    recentLeads: recentLeads ?? [],
    recentMessages: recentMessages ?? [],
    sparkData,
    recommendedLead: recommendedLeadData ?? null,
    lastCall,
    lastSms,
    lastRecording,
  });
}