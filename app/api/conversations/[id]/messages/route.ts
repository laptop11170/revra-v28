import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(
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

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // First verify the conversation belongs to this workspace
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, lead_id")
    .eq("id", id)
    .eq("workspace_id", user.workspace_id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data, count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", id)
    .eq("workspace_id", user.workspace_id)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    messages: data || [],
    total: count ?? 0,
  });
}

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

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Verify the conversation belongs to this workspace
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, lead_id")
    .eq("id", id)
    .eq("workspace_id", user.workspace_id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = await req.json();
  const { body: messageBody, direction } = body;

  if (!messageBody || !direction) {
    return NextResponse.json({ error: "body and direction are required" }, { status: 400 });
  }

  const validDirections = ["inbound", "outbound"];
  if (!validDirections.includes(direction)) {
    return NextResponse.json({ error: "direction must be inbound or outbound" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      workspace_id: user.workspace_id,
      lead_id: conversation.lead_id,
      conversation_id: id,
      direction,
      body: messageBody,
      status: "sent",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation's last_message and last_message_at
  await supabase
    .from("conversations")
    .update({
      last_message: messageBody,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", user.workspace_id);

  return NextResponse.json({ message: data }, { status: 201 });
}
