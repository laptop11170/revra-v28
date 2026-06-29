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

  // Get workspace stats (user count, lead count)
  const workspaceIds = (workspacesData ?? []).map((w) => w.id);

  const { data: userCounts } = await supabase
    .from("users")
    .select("workspace_id")
    .in("workspace_id", workspaceIds.length > 0 ? workspaceIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: leadCounts } = await supabase
    .from("leads")
    .select("workspace_id")
    .in("workspace_id", workspaceIds.length > 0 ? workspaceIds : ["00000000-0000-0000-0000-000000000000"]);

  // Get workspace owners (users with admin role in each workspace)
  const { data: adminUsers } = await supabase
    .from("users")
    .select("id, workspace_id, full_name, email")
    .in("workspace_id", workspaceIds.length > 0 ? workspaceIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("role", "admin");

  const userCountMap: Record<string, number> = {};
  const leadCountMap: Record<string, number> = {};
  const ownerMap: Record<string, { name: string | null; email: string }> = {};

  userCounts?.forEach((u) => {
    if (u.workspace_id) {
      userCountMap[u.workspace_id] = (userCountMap[u.workspace_id] || 0) + 1;
    }
  });

  leadCounts?.forEach((l) => {
    if (l.workspace_id) {
      leadCountMap[l.workspace_id] = (leadCountMap[l.workspace_id] || 0) + 1;
    }
  });

  adminUsers?.forEach((u) => {
    if (u.workspace_id && !ownerMap[u.workspace_id]) {
      ownerMap[u.workspace_id] = { name: u.full_name, email: u.email };
    }
  });

  const mrrByPlan: Record<string, number> = { starter: 99, professional: 299, enterprise: 999 };

  const workspaces = (workspacesData ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    plan: w.plan,
    status: w.status ?? "active",
    owner_name: ownerMap[w.id]?.name ?? null,
    owner_email: ownerMap[w.id]?.email ?? null,
    users_count: userCountMap[w.id] || 0,
    leads_count: leadCountMap[w.id] || 0,
    mrr: mrrByPlan[w.plan] ?? 99,
    created_at: w.created_at,
  }));

  return NextResponse.json({ workspaces, total: count });
}

export async function PATCH(req: NextRequest) {
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

  const body = await req.json();
  const { id, plan, status } = body;

  if (!id) {
    return NextResponse.json({ error: "Workspace id is required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (plan !== undefined) updateData.plan = plan;
  if (status !== undefined) updateData.status = status;

  const { data, error } = await supabase
    .from("workspaces")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ workspace: data });
}