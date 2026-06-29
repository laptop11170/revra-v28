import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // Verify superadmin role
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (currentUser?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Top performing agents (aggregate calls/messages/leads per agent across all workspaces)
  const { data: agentCalls } = await supabase
    .from("calls")
    .select("agent_id, status")
    .order("created_at", { ascending: false });

  const { data: agentMessages } = await supabase
    .from("messages")
    .select("agent_id")
    .order("created_at", { ascending: false });

  const { data: agentLeads } = await supabase
    .from("leads")
    .select("assigned_agent_id")
    .order("created_at", { ascending: false });

  // Aggregate agent stats
  const agentStats: Record<string, { calls: number; messages: number; leads: number; completedCalls: number }> = {};

  agentCalls?.forEach((c) => {
    if (c.agent_id) {
      if (!agentStats[c.agent_id]) {
        agentStats[c.agent_id] = { calls: 0, messages: 0, leads: 0, completedCalls: 0 };
      }
      agentStats[c.agent_id].calls++;
      if (c.status === "completed") {
        agentStats[c.agent_id].completedCalls++;
      }
    }
  });

  agentMessages?.forEach((m) => {
    if (m.agent_id) {
      if (!agentStats[m.agent_id]) {
        agentStats[m.agent_id] = { calls: 0, messages: 0, leads: 0, completedCalls: 0 };
      }
      agentStats[m.agent_id].messages++;
    }
  });

  agentLeads?.forEach((l) => {
    if (l.assigned_agent_id) {
      if (!agentStats[l.assigned_agent_id]) {
        agentStats[l.assigned_agent_id] = { calls: 0, messages: 0, leads: 0, completedCalls: 0 };
      }
      agentStats[l.assigned_agent_id].leads++;
    }
  });

  // Get agent user info
  const agentIds = Object.keys(agentStats);
  const { data: agentUsers } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", agentIds.length > 0 ? agentIds : ["00000000-0000-0000-0000-000000000000"]);

  const agentUserMap: Record<string, { name: string | null; email: string }> = {};
  agentUsers?.forEach((u) => {
    agentUserMap[u.id] = { name: u.full_name, email: u.email };
  });

  const topAgents = Object.entries(agentStats)
    .map(([agentId, stats]) => ({
      id: agentId,
      name: agentUserMap[agentId]?.name ?? "Unknown",
      email: agentUserMap[agentId]?.email ?? "unknown@email.com",
      calls: stats.calls,
      completedCalls: stats.completedCalls,
      messages: stats.messages,
      leads: stats.leads,
      score: Math.round((stats.completedCalls * 10) + (stats.messages * 0.5) + (stats.leads * 5)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Monthly trends (messages per day for last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: messagesTrend } = await supabase
    .from("messages")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Group by day
  const dailyMessages: Record<string, number> = {};
  messagesTrend?.forEach((m) => {
    const day = m.created_at?.split("T")[0] ?? "unknown";
    dailyMessages[day] = (dailyMessages[day] || 0) + 1;
  });

  const monthlyData = Object.entries(dailyMessages).map(([date, count]) => ({
    date,
    messages: count,
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Stage conversion rates (leads moving through stages)
  const { data: pipelineMoves } = await supabase
    .from("pipeline_moves")
    .select("from_stage, to_stage")
    .order("moved_at", { ascending: false });

  const stageTransitions: Record<string, Record<string, number>> = {};
  const stageCounts: Record<string, number> = {};

  pipelineMoves?.forEach((move) => {
    if (move.from_stage) {
      stageCounts[move.from_stage] = (stageCounts[move.from_stage] || 0) + 1;
    }
    stageCounts[move.to_stage] = (stageCounts[move.to_stage] || 0) + 1;

    if (move.from_stage && move.to_stage) {
      if (!stageTransitions[move.from_stage]) {
        stageTransitions[move.from_stage] = {};
      }
      stageTransitions[move.from_stage][move.to_stage] = (stageTransitions[move.from_stage][move.to_stage] || 0) + 1;
    }
  });

  // Calculate conversion rates
  const stageFunnel = {
    new_lead: { count: stageCounts["new_lead"] || 0, conversionRate: 100 },
    contacted: { count: stageCounts["contacted"] || 0, conversionRate: 0 },
    qualified: { count: stageCounts["qualified"] || 0, conversionRate: 0 },
    quote_sent: { count: stageCounts["quote_sent"] || 0, conversionRate: 0 },
    won: { count: stageCounts["won"] || 0, conversionRate: 0 },
    lost: { count: stageCounts["lost"] || 0, conversionRate: 0 },
  };

  // Calculate conversion rates based on transitions
  const stageOrder = ["new_lead", "contacted", "qualified", "quote_sent", "won", "lost"];
  stageOrder.forEach((stage, index) => {
    if (index > 0 && stageCounts[stageOrder[index - 1]]) {
      stageFunnel[stage as keyof typeof stageFunnel].conversionRate = Math.round(
        (stageCounts[stage] || 0) / stageCounts[stageOrder[index - 1]] * 100
      );
    }
  });

  // Get current leads count by stage
  const { data: leadsByStage } = await supabase
    .from("leads")
    .select("pipeline_stage");

  const currentStageCounts: Record<string, number> = {};
  leadsByStage?.forEach((l) => {
    currentStageCounts[l.pipeline_stage] = (currentStageCounts[l.pipeline_stage] || 0) + 1;
  });

  // Update funnel with current counts
  Object.keys(stageFunnel).forEach((stage) => {
    stageFunnel[stage as keyof typeof stageFunnel].count = currentStageCounts[stage] || stageFunnel[stage as keyof typeof stageFunnel].count;
  });

  return NextResponse.json({
    topAgents,
    monthlyData,
    stageFunnel,
  });
}