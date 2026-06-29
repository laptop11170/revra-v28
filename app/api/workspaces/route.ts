import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const body = await req.json();
  const { name, plan = "Starter" } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  // Check if user already has a workspace
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (existingUser?.workspace_id) {
    return NextResponse.json({ error: "You already have a workspace" }, { status: 400 });
  }

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: name.trim(), plan })
    .select()
    .single();

  if (wsError) {
    return NextResponse.json({ error: wsError.message }, { status: 500 });
  }

  // Create user in users table with workspace_id and admin role
  const { error: userError } = await supabase
    .from("users")
    .update({ workspace_id: workspace.id, role: "admin" })
    .eq("clerk_user_id", userId);

  if (userError) {
    // Rollback workspace creation
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
      role: "admin",
    },
  }, { status: 201 });
}