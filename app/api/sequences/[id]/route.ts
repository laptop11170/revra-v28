// app/api/sequences/[id]/route.ts
// Get, update, delete a sequence; activate/pause

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

async function getSequence(
  supabase: NonNullable<ReturnType<typeof createServiceSupabaseClient>>,
  id: string,
  workspaceId: string
) {
  return supabase
  .from("sequences")
  .select("*, steps:sequence_steps(*)")
  .eq("id", id)
  .eq("workspace_id", workspaceId)
  .single();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase.from("users").select("workspace_id").eq("clerk_user_id", userId).single();
  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const { data, error } = await getSequence(supabase, id, user.workspace_id);
  if (error || !data) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

  return NextResponse.json({ sequence: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase.from("users").select("workspace_id").eq("clerk_user_id", userId).single();
  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const { data: existing } = await getSequence(supabase, id, user.workspace_id);
  if (!existing) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed = ["name", "description", "status", "trigger_type", "trigger_config", "sender_phone_id"];
  const updateData: Record<string, unknown> = {};
  for (const f of allowed) {
  if (f in body) updateData[f] = body[f];
  }

  const { data, error } = await supabase.from("sequences").update(updateData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sequence: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase.from("users").select("workspace_id, role").eq("clerk_user_id", userId).single();
  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });
  if (user.role === "agent") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabase.from("sequences").delete().eq("id", id).eq("workspace_id", user.workspace_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
