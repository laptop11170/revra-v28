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
    .select("workspace_id, id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const workspaceId = user.workspace_id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];

  // Total leads
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  // Hot leads (score >= 80)
  const { count: hotLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("score", 80)
    .eq("workspace_id", workspaceId);

  // New leads today
  const { count: newToday } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", todayStart);

  // Messages today
  const { count: messagesToday } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", todayStart + "T00:00:00");

  // Active agents
  const { count: activeAgents } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role", "agent");

  // Appointments today
  const { count: appointmentsToday } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("date", todayStart);

  // Calls today
  const { count: callsToday } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", todayStart + "T00:00:00");

  // Average score
  const { avg: avgScore } = await supabase
    .from("leads")
    .select("score")
    .eq("workspace_id", workspaceId)
    .not("score", "is", null)
    .then(async ({ data }) => {
      if (!data || data.length === 0) return { avg: 0 };
      const sum = data.reduce((acc, lead) => acc + (lead.score || 0), 0);
      return { avg: Math.round(sum / data.length) };
    });

  // Leads by pipeline stage
  const { data: stageCountsRaw } = await supabase
    .from("leads")
    .select("pipeline_stage")
    .eq("workspace_id", workspaceId);

  const stageCounts: Record<string, number> = {};
  for (const lead of stageCountsRaw || []) {
    const stage = lead.pipeline_stage || "unknown";
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  }

  // Recent leads (top 10 ordered by created_at)
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, first_name, last_name, score, pipeline_stage, lead_source, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    stats: {
      totalLeads: totalLeads ?? 0,
      hotLeads: hotLeads ?? 0,
      newToday: newToday ?? 0,
      messagesToday: messagesToday ?? 0,
      activeAgents: activeAgents ?? 0,
      appointmentsToday: appointmentsToday ?? 0,
      callsToday: callsToday ?? 0,
      avgScore: avgScore ?? 0,
    },
    stageCounts,
    recentLeads: recentLeads || [],
  });
}