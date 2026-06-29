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

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const plan = searchParams.get("plan") || undefined;
  const status = searchParams.get("status") || undefined;

  let query = supabase
    .from("workspaces")
    .select(`
      id,
      name,
      slug,
      plan,
      status,
      created_at,
      updated_at
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (plan) {
    query = query.eq("plan", plan);
  }

  const { data: workspacesData, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user counts per workspace (seat count)
  const workspaceIds = (workspacesData ?? []).map((w) => w.id);
  const { data: userCounts } = await supabase
    .from("users")
    .select("workspace_id")
    .in("workspace_id", workspaceIds.length > 0 ? workspaceIds : ["00000000-0000-0000-0000-000000000000"]);

  const seatCounts: Record<string, number> = {};
  userCounts?.forEach((u) => {
    if (u.workspace_id) {
      seatCounts[u.workspace_id] = (seatCounts[u.workspace_id] || 0) + 1;
    }
  });

  // Get workspace owners
  const { data: adminUsers } = await supabase
    .from("users")
    .select("id, workspace_id, full_name, email")
    .in("workspace_id", workspaceIds.length > 0 ? workspaceIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("role", "admin");

  const ownerMap: Record<string, { name: string | null; email: string }> = {};
  adminUsers?.forEach((u) => {
    if (u.workspace_id && !ownerMap[u.workspace_id]) {
      ownerMap[u.workspace_id] = { name: u.full_name, email: u.email };
    }
  });

  // MRR by plan
  const mrrByPlan: Record<string, number> = { starter: 99, professional: 299, enterprise: 999 };
  const renewalDays = [15, 30, 45]; // Mock renewal day offsets

  const subscriptions = (workspacesData ?? []).map((w, index) => {
    const mrr = mrrByPlan[w.plan] ?? 99;
    const renewalOffset = renewalDays[index % renewalDays.length];
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + renewalOffset);

    return {
      workspace_id: w.id,
      workspace_name: w.name,
      owner_name: ownerMap[w.id]?.name ?? null,
      owner_email: ownerMap[w.id]?.email ?? null,
      plan: w.plan,
      mrr,
      seat_count: seatCounts[w.id] || 0,
      status: w.status ?? "active",
      renewal_date: renewalDate.toISOString().split("T")[0],
    };
  });

  // Revenue by plan stats
  const revenueByPlan = {
    starter: subscriptions.filter((s) => s.plan === "starter").reduce((sum, s) => sum + s.mrr, 0),
    professional: subscriptions.filter((s) => s.plan === "professional").reduce((sum, s) => sum + s.mrr, 0),
    enterprise: subscriptions.filter((s) => s.plan === "enterprise").reduce((sum, s) => sum + s.mrr, 0),
  };

  // Trial conversion rate (starter workspaces created in last 60 days that are now professional/enterprise)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: recentWorkspaces } = await supabase
    .from("workspaces")
    .select("plan, created_at")
    .gte("created_at", sixtyDaysAgo.toISOString());

  const trialConverted = recentWorkspaces?.filter((w) =>
    w.plan !== "starter" && new Date(w.created_at).getTime() > sixtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000
  ).length ?? 0;

  const trialTotal = recentWorkspaces?.filter((w) => w.plan === "starter").length ?? 0;
  const trialConversionRate = trialTotal > 0 ? Math.round((trialConverted / trialTotal) * 100) : 0;

  return NextResponse.json({
    subscriptions,
    stats: {
      revenueByPlan,
      totalMRR: Object.values(revenueByPlan).reduce((sum, val) => sum + val, 0),
      totalSubscriptions: count ?? 0,
      trialConversionRate,
    },
  });
}