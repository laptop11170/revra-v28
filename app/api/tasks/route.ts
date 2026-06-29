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

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("lead_id") || undefined;
  const status = searchParams.get("status") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("tasks")
    .select(`
      *,
      lead:leads!tasks_lead_id_fkey(id, first_name, last_name, phone)
    `, { count: "exact" })
    .eq("workspace_id", user.workspace_id)
    .order("due_date", { ascending: true })
    .range(offset, offset + limit - 1);

  if (leadId) query = query.eq("lead_id", leadId);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute counts
  const allTasks = data || [];
  const allCount = count ?? allTasks.length;
  const openCount = allTasks.filter(t => t.status === "open").length;
  const completedCount = allTasks.filter(t => t.status === "completed").length;
  const overdueCount = allTasks.filter(t => t.status === "overdue").length;

  // Add lead_name to each task
  const tasksWithLeadName = allTasks.map(task => ({
    ...task,
    lead_name: task.lead ? `${task.lead.first_name || ""} ${task.lead.last_name || ""}`.trim() : null,
  }));

  return NextResponse.json({
    tasks: tasksWithLeadName,
    total: allCount,
    counts: {
      all: allCount,
      open: openCount,
      completed: completedCount,
      overdue: overdueCount,
    },
  });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { lead_id, type, priority, due_date, status, source, note } = body;

  if (!lead_id || !type) {
    return NextResponse.json({ error: "lead_id and type are required" }, { status: 400 });
  }

  const validTypes = ["Follow-up", "Callback", "Send Info", "Reactivation", "Custom"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const validPriorities = ["low", "medium", "high", "urgent"];
  if (priority && !validPriorities.includes(priority)) {
    return NextResponse.json({ error: `priority must be one of: ${validPriorities.join(", ")}` }, { status: 400 });
  }

  const validStatuses = ["open", "completed", "overdue"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const validSources = ["call", "email", "manual"];
  if (source && !validSources.includes(source)) {
    return NextResponse.json({ error: `source must be one of: ${validSources.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: user.workspace_id,
      lead_id,
      type,
      priority: priority || "medium",
      due_date: due_date || null,
      status: status || "open",
      source: source || "manual",
      note: note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ task: data }, { status: 201 });
}
