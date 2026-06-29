import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: workspaceId } = await params;

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // Check if user already has a workspace
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (existingUser?.workspace_id && existingUser.workspace_id !== workspaceId) {
    return NextResponse.json({ error: "You already belong to a workspace. Leave it first to join another." }, { status: 400 });
  }

  // Verify workspace exists
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, plan")
    .eq("id", workspaceId)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // If user has no record yet, create one with the workspace
  if (!existingUser) {
    const { error } = await supabase.from("users").insert({
      clerk_user_id: userId,
      workspace_id: workspaceId,
      role: "user",
      status: "active",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
      role: "user",
    },
  });
}