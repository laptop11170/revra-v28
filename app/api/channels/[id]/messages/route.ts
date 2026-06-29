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
    .select("id, workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const channelId = req.nextUrl.pathname.split("/")[3];
  if (!channelId) {
    return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("channel_messages")
    .select(`
      *,
      users:user_id (full_name)
    `)
    .eq("channel_id", channelId)
    .eq("workspace_id", user.workspace_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages = data?.map((msg) => ({
    ...msg,
    author_name: msg.users?.full_name ?? "Unknown",
  }));

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
    .from("users")
    .select("id, workspace_id, full_name")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const channelId = req.nextUrl.pathname.split("/")[3];
  if (!channelId) {
    return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
  }

  const body = await req.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("channel_messages")
    .insert({
      channel_id: channelId,
      workspace_id: user.workspace_id,
      user_id: user.id,
      author_name: user.full_name,
      content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update channel last_message
  await supabase
    .from("channels")
    .update({
      last_message: content,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", channelId)
    .eq("workspace_id", user.workspace_id);

  return NextResponse.json({ message: data }, { status: 201 });
}