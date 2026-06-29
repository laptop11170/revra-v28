import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// POST /api/conversations/[id]/read — mark conversation as read
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  // Verify conversation belongs to workspace
  const { data: conv } = await supabase
  .from("conversations")
  .select("id")
  .eq("id", id)
  .eq("workspace_id", user.workspace_id)
  .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase
  .from("conversations")
  .update({ unread_count: 0, read_at: new Date().toISOString() })
  .eq("id", id)
  .eq("workspace_id", user.workspace_id);

  return NextResponse.json({ ok: true });
}
