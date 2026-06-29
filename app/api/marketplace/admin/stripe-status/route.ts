import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user || !["admin", "superadmin"].includes(user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: workspace } = await supabase
  .from("workspaces")
  .select("stripe_account_id")
  .eq("id", user.workspace_id)
  .single();

  return NextResponse.json({
  connected: !!workspace?.stripe_account_id,
  stripe_account_id: workspace?.stripe_account_id || null,
  });
}
