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
  const workspaceId = searchParams.get("workspace_id") || undefined;
  const role = searchParams.get("role") || undefined;
  const search = searchParams.get("search") || undefined;

  let query = supabase
    .from("users")
    .select(`
      id,
      email,
      full_name,
      role,
      workspace_id,
      status,
      last_active_at,
      created_at,
      workspaces:workspace_id (id, name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  if (role) {
    query = query.eq("role", role);
  }

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    workspace_id: u.workspace_id,
    workspace_name: (u.workspaces as unknown as { name: string } | null)?.name ?? null,
    status: u.last_active_at
      ? (new Date(u.last_active_at).getTime() > Date.now() - 5 * 60 * 1000 ? "online" : "offline")
      : "offline",
    last_active_at: u.last_active_at,
    created_at: u.created_at,
  }));

  return NextResponse.json({ users, total: count });
}