import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // Get user from DB
  const { data: user } = await supabase
    .from("users")
    .select("id, workspace_id, role")
    .eq("clerk_user_id", userId)
    .single();

  // Get workspace(s) user belongs to
  let workspaces: any[] = [];

  if (user?.workspace_id) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name, plan, created_at")
      .eq("id", user.workspace_id)
      .single();

    if (ws) {
      workspaces = [{
        id: ws.id,
        name: ws.name,
        plan: ws.plan || "Starter",
        role: user.role || "user",
      }];
    }
  }

  return NextResponse.json({ workspaces });
}