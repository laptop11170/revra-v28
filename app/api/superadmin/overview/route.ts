import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // Verify superadmin role
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Workspace stats
  const { count: totalWorkspaces } = await supabase
    .from("workspaces")
    .select("*", { count: "exact", head: true });

  const { data: workspacesByPlan } = await supabase
    .from("workspaces")
    .select("plan")
    .order("plan");

  const planCounts = { starter: 0, professional: 0, enterprise: 0 };
  workspacesByPlan?.forEach((w) => {
    if (w.plan in planCounts) planCounts[w.plan as keyof typeof planCounts]++;
  });

  // Active workspaces (those with recent activity)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: activeWorkspaces } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);

  // Trial workspaces (starter plan with recent creation)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { count: trialWorkspaces } = await supabase
    .from("workspaces")
    .select("*", { count: "exact", head: true })
    .eq("plan", "starter")
    .gte("created_at", sixtyDaysAgo);

  // MRR calculation (mock based on plan)
  const mrrByPlan = { starter: 99, professional: 299, enterprise: 999 };
  const mrr = (planCounts.starter * mrrByPlan.starter) +
              (planCounts.professional * mrrByPlan.professional) +
              (planCounts.enterprise * mrrByPlan.enterprise);

  // User counts
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // Seat count (total users across all workspaces)
  const { count: totalSeats } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // Lead stats
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  const { count: leadsToday } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart);

  const { count: hotLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("score", 80);

  // Message stats
  const { count: messagesToday } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart);

  // Recent activity (latest 10 workspace/lead/message events)
  const { data: recentWorkspaces } = await supabase
    .from("workspaces")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, first_name, last_name, workspace_id, created_at")
    .order("created_at", { ascending: false })
    .limit(4);

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, workspace_id, direction, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  const recentActivity = [
    ...(recentWorkspaces?.map((w) => ({
      type: "workspace_created",
      id: w.id,
      message: `Workspace "${w.name}" created`,
      timestamp: w.created_at,
    })) ?? []),
    ...(recentLeads?.map((l) => ({
      type: "lead_added",
      id: l.id,
      message: `New lead: ${l.first_name} ${l.last_name}`,
      timestamp: l.created_at,
    })) ?? []),
    ...(recentMessages?.map((m) => ({
      type: "message_sent",
      id: m.id,
      message: `${m.direction === "inbound" ? "Inbound" : "Outbound"} message`,
      timestamp: m.created_at,
    })) ?? []),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  // Top workspaces by MRR
  const { data: workspacesMRR } = await supabase
    .from("workspaces")
    .select("id, name, plan, mrr")
    .order("mrr", { ascending: false })
    .limit(5);

  const topWorkspaces = (workspacesMRR ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    plan: w.plan,
    mrr: w.mrr ?? mrrByPlan[w.plan as keyof typeof mrrByPlan] ?? 99,
  }));

  return NextResponse.json({
    stats: {
      totalWorkspaces: totalWorkspaces ?? 0,
      activeWorkspaces: activeWorkspaces ?? 0,
      trialWorkspaces: trialWorkspaces ?? 0,
      totalUsers: totalUsers ?? 0,
      totalLeads: totalLeads ?? 0,
      leadsToday: leadsToday ?? 0,
      hotLeads: hotLeads ?? 0,
      mrr: mrr,
      seats: totalSeats ?? totalUsers ?? 0,
    },
    planCounts,
    recentActivity,
    topWorkspaces,
  });
}