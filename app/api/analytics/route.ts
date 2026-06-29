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

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Counts - all valid leads (not deleted)
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id)
    .neq("pipeline_stage", "archived");

  const { count: totalMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id);

  const { count: bookedCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id)
    .eq("pipeline_stage", "booked");

  const { count: hotCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id)
    .gte("score", 80);

  const { count: emailCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id)
    .eq("source", "email");

  const { count: webCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id)
    .eq("source", "website");

  const { count: referralCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id)
    .eq("source", "referral");

  // Avg score
  const { data: avgScoreData } = await supabase
    .from("leads")
    .select("score")
    .eq("workspace_id", user.workspace_id)
    .not("score", "is", null);

  const avgScore = avgScoreData && avgScoreData.length > 0
    ? Math.round(avgScoreData.reduce((s, l) => s + (l.score ?? 0), 0) / avgScoreData.length)
    : 0;

  // Messages by channel (last 30 days)
  const { data: channelMsgs } = await supabase
    .from("messages")
    .select("channel")
    .eq("workspace_id", user.workspace_id)
    .gte("created_at", thirtyDaysAgo);

  const channelCounts: Record<string, number> = {};
  for (const msg of (channelMsgs ?? [])) {
    channelCounts[msg.channel ?? "unknown"] = (channelCounts[msg.channel ?? "unknown"] ?? 0) + 1;
  }
  const totalChannelMsgs = Object.values(channelCounts).reduce((s, v) => s + v, 0);

  // Pipeline stage distribution
  const { data: stageData } = await supabase
    .from("leads")
    .select("pipeline_stage")
    .eq("workspace_id", user.workspace_id);

  const stageCounts: Record<string, number> = {};
  for (const lead of (stageData ?? [])) {
    const stage = lead.pipeline_stage ?? "unknown";
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
  }
  const totalStageLeads = Object.values(stageCounts).reduce((s, v) => s + v, 1);

  // Lead source distribution
  const { data: sourceData } = await supabase
    .from("leads")
    .select("source")
    .eq("workspace_id", user.workspace_id);

  const sourceCounts: Record<string, number> = {};
  for (const lead of (sourceData ?? [])) {
    const source = lead.source ?? "unknown";
    sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
  }
  const totalSourceLeads = Object.values(sourceCounts).reduce((s, v) => s + v, 0);

  // Recent messages for sparkline (daily, last 12 days)
  const sparkData: { date: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", user.workspace_id)
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", dayEnd.toISOString());
    sparkData.push({
      date: dayStart.toISOString().slice(0, 10),
      count: count ?? 0,
    });
  }

  return NextResponse.json({
    totalLeads: totalLeads ?? 0,
    totalMessages: totalMessages ?? 0,
    bookedCount: bookedCount ?? 0,
    hotCount: hotCount ?? 0,
    avgScore,
    sourceCounts,
    emailCount: emailCount ?? 0,
    webCount: webCount ?? 0,
    referralCount: referralCount ?? 0,
    channelCounts,
    totalChannelMsgs,
    stageCounts,
    totalStageLeads,
    totalSourceLeads,
    sparkData,
  });
}