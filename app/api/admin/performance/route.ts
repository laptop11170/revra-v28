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

  // Get all workspace members (agents and admins)
  const { data: members } = await supabase
    .from("users")
    .select("id, full_name, role, created_at")
    .eq("workspace_id", user.workspace_id)
    .in("role", ["agent", "admin", "owner"]);

  // Get all leads with scores per agent
  const { data: allLeads } = await supabase
    .from("leads")
    .select("assigned_agent_id, score, pipeline_stage")
    .eq("workspace_id", user.workspace_id);

  // Get all calls per agent
  const { data: allCalls } = await supabase
    .from("calls")
    .select("user_id")
    .eq("workspace_id", user.workspace_id);

  // Get all messages per agent
  const { data: allMessages } = await supabase
    .from("messages")
    .select("user_id")
    .eq("workspace_id", user.workspace_id);

  const agentStatsMap: Record<string, {
    leadsCount: number;
    qualifiedCount: number;
    totalScore: number;
    scoreCount: number;
    callsMade: number;
    messagesSent: number;
  }> = {};

  for (const member of members || []) {
    agentStatsMap[member.id] = {
      leadsCount: 0,
      qualifiedCount: 0,
      totalScore: 0,
      scoreCount: 0,
      callsMade: 0,
      messagesSent: 0,
    };
  }

  for (const lead of allLeads || []) {
    if (lead.assigned_agent_id && agentStatsMap[lead.assigned_agent_id]) {
      agentStatsMap[lead.assigned_agent_id].leadsCount++;
      if (lead.pipeline_stage === "qualified") {
        agentStatsMap[lead.assigned_agent_id].qualifiedCount++;
      }
      if (lead.score != null) {
        agentStatsMap[lead.assigned_agent_id].totalScore += lead.score;
        agentStatsMap[lead.assigned_agent_id].scoreCount++;
      }
    }
  }

  for (const call of allCalls || []) {
    if (call.user_id && agentStatsMap[call.user_id]) {
      agentStatsMap[call.user_id].callsMade++;
    }
  }

  for (const message of allMessages || []) {
    if (message.user_id && agentStatsMap[message.user_id]) {
      agentStatsMap[message.user_id].messagesSent++;
    }
  }

  const agents = (members || []).map(member => {
    const stats = agentStatsMap[member.id] || {
      leadsCount: 0,
      qualifiedCount: 0,
      totalScore: 0,
      scoreCount: 0,
      callsMade: 0,
      messagesSent: 0,
    };
    return {
      id: member.id,
      name: member.full_name,
      role: member.role,
      leadsCount: stats.leadsCount,
      qualifiedCount: stats.qualifiedCount,
      callsMade: stats.callsMade,
      messagesSent: stats.messagesSent,
      avgScore: stats.scoreCount > 0 ? Math.round(stats.totalScore / stats.scoreCount) : 0,
    };
  });

  return NextResponse.json({ agents });
}